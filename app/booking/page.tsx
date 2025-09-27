"use client";

import { MouseEvent, useEffect, useRef, useState } from "react";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import "./booking.css";

import { ChevronLeft } from "lucide-react";

const API_BASE = "/api";

type Booking = {
  time: string;
  name: string;
  phone?: string;
  durationMin?: number;
};
type DayData = { blocked: string[]; bookings: Booking[] };

const WORK_START = 8,
  WORK_END = 20;
const SLOT_MINUTES = 15,
  SERVICE_DURATION = 45;

class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
const SMALL_SERVICES_BY_ID: Record<string, { title: string; price: string; durationMin: number }> = {
  "wax-brows": { title: "Wax brows", price: "$25", durationMin: 15 },
  "lip-wax":   { title: "Lip wax",   price: "$15", durationMin: 15 }, // якщо у тебе $10 — просто поміняй на "$10"
};

/* ---------- time utils ---------- */
function toTime(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function parseTime(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}
function minutesToTime(min: number) {
  return toTime(Math.floor(min / 60), min % 60);
}
function clampEnd(min: number) {
  return Math.min(min, WORK_END * 60);
}
function genSlots(step = SLOT_MINUTES, durationMin = SERVICE_DURATION) {
  const out: string[] = [];
  const latestStart = WORK_END * 60 - durationMin;
  for (let h = WORK_START; h < WORK_END; h++) {
    for (let m = 0; m < 60; m += step) {
      const min = h * 60 + m;
      if (min <= latestStart) out.push(toTime(h, m));
    }
  }
  return out;
}
function rangeTimes(
  startTimeStr: string,
  dur = SERVICE_DURATION,
  step = SLOT_MINUTES
) {
  const startMin = parseTime(startTimeStr);
  const hardEnd = clampEnd(startMin + dur);
  let t = Math.ceil(startMin / step) * step;
  const out: string[] = [];
  if (startMin >= WORK_START * 60 && startMin < WORK_END * 60)
    out.push(minutesToTime(startMin));
  for (; t < hardEnd; t += step)
    if (t >= WORK_START * 60 && t < WORK_END * 60) out.push(minutesToTime(t));
  return out;
}
const UA_LETTERS = /[A-Za-zА-Яа-яЁёІіЇїЄєҐґ]/;
function sanitizeNameInput(s: string) {
  return s
    .normalize("NFC")
    .replace(/[0-9]/g, "")
    .replace(/\s{2,}/g, " ")
    .trimStart()
    .slice(0, 60);
}
function nameIsValid(name: string) {
  const t = name.trim();
  return t.length >= 2 && UA_LETTERS.test(t);
}
function sanitizePhoneInput(s: string) {
  let out = s.replace(/[A-Za-zА-Яа-яЁёІіЇїЄєҐґ]/g, "");
  out = out.replace(/[^0-9+()\-\s]/g, "");
  out = out.replace(/(?!^)\+/g, "");
  return out.slice(0, 25);
}
function phoneIsValid(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function parseUsdToCentsLocal(s?: string): number | null {
  if (!s) return null;
  const m = String(s).match(/\d+(?:\.\d{1,2})?/);
  return m ? Math.round(parseFloat(m[0]) * 100) : null;
}
function getChargeCentsLocal(fullPriceCents?: number | null) {

  if (fullPriceCents === 2500 || fullPriceCents === 1500) return fullPriceCents;
  return null; 
}
function fmtUSD(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

/* ---------- data helpers ---------- */
async function loadDay(dateStr: string): Promise<DayData> {
  const url = new URL(`${API_BASE}/availability`, location.origin);
  url.searchParams.set("date", dateStr);
  url.searchParams.set("_", String(Date.now()));
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new HttpError("availability error", res.status);
  return (await res.json()) as DayData;
}

type BookPayload = {
  date: string;
  time: string;
  name: string;
  phone: string;
  durationMin?: number;
  serviceTitle?: string;
  price?: string;
};
type ApiOk = { ok: true; bookingId: string };
type ApiErr = { error: string };

async function apiBook(payload: BookPayload): Promise<ApiOk> {
  const res = await fetch(`${API_BASE}/book?_=${Date.now()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const json = (await res.json()) as ApiOk | ApiErr;
  if (!res.ok)
    throw new HttpError("error" in json ? json.error : "API error", res.status);
  return json as ApiOk;
}

/* ===================================================== */

export default function BookingPage() {
  const calRef = useRef<HTMLDivElement>(null);
  const calendarInst = useRef<Calendar | null>(null);

  const [dateStr, setDateStr] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const [selectedService, setSelectedService] = useState<null | {
    title?: string;
    price?: string;
    durationMin: number;
  }>(null);

  const canPay =
    !!selected && nameIsValid(name) && phoneIsValid(phone) && !busy;

  const [flash, setFlash] = useState<null | {
    kind: "success" | "info" | "error";
    title: string;
    text?: string;
  }>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("selectedService");
      if (raw) {
        const svc = JSON.parse(raw) as {
          title?: string;
          price?: string;
          durationMin: number;
        };
        if (svc?.durationMin && Number.isFinite(svc.durationMin)) {
          setSelectedService(svc);
          setSlots(genSlots(SLOT_MINUTES, svc.durationMin));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
  const sp = new URLSearchParams(window.location.search);
  const sid = sp.get("service");
  if (!sid) return;

  const patch = SMALL_SERVICES_BY_ID[sid];
  if (!patch) return;

  setSelectedService((prev) => {
    const next = {
      title: prev?.title ?? patch.title,
      price: patch.price,
      durationMin: patch.durationMin,
    };
    try { localStorage.setItem("selectedService", JSON.stringify(next)); } catch {}
    return next;
  });
  setSlots(genSlots(SLOT_MINUTES, patch.durationMin));
}, []);

  useEffect(() => {
    const onPick = (e: Event) => {
      const det = (e as CustomEvent).detail as
        | { title?: string; price?: string; durationMin: number }
        | undefined;
      if (!det) return;
      setSelectedService({ ...det });
      setSlots(genSlots(SLOT_MINUTES, det.durationMin));
      try {
        localStorage.setItem("selectedService", JSON.stringify(det));
      } catch {}
    };
    window.addEventListener("service:select", onPick as EventListener);
    return () =>
      window.removeEventListener("service:select", onPick as EventListener);
  }, []);

  const durationNow = selectedService?.durationMin ?? SERVICE_DURATION;

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const paid = sp.get("paid");
    const cancelled = sp.get("cancelled");

    if (paid === "1") {
      try {
        localStorage.removeItem("lastBooking");
      } catch {}
      setFlash({
        kind: "success",
        title: "Payment successful",
        text: "Deposit received. Booking confirmed. ✅",
      });
    } else if (cancelled === "1") {
      setFlash({
        kind: "info",
        title: "Payment canceled",
        text: "You can try again. The slot may still be available.",
      });
    }
    if (paid || cancelled) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(t);
  }, [flash]);

  const openForDate = async (d: string) => {
    setSelected(null);
    setName("");
    setPhone("");
    setDateStr(d);
    try {
      const day = await loadDay(d);
      const autoBlocked = Array.from(
        new Set([
          ...(day.blocked ?? []),
          ...(day.bookings ?? []).flatMap((b) =>
            rangeTimes(b.time, b.durationMin ?? SERVICE_DURATION)
          ),
        ])
      ).sort((a, b) => parseTime(a) - parseTime(b));
      setBlocked(autoBlocked);
      setBookings(day.bookings ?? []);
      setSlots(genSlots(SLOT_MINUTES, durationNow));
    } catch {
      setBlocked([]);
      setBookings([]);
      setSlots(genSlots(SLOT_MINUTES, durationNow));
      alert("Failed to load daily schedule");
    }
  };

  useEffect(() => {
    if (!calRef.current) return;

    const isMobile = () => window.innerWidth < 640;

    const cal = new Calendar(calRef.current, {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: "dayGridMonth",
      firstDay: 1,
      height: "auto",
      expandRows: true,
      fixedWeekCount: false,
      showNonCurrentDates: false,
      handleWindowResize: true,
      longPressDelay: 0,
      selectLongPressDelay: 0,
      dayMaxEventRows: true,
      validRange: { start: new Date().toISOString().slice(0, 10) },
      headerToolbar: isMobile()
        ? { left: "prev,next today", center: "title", right: "" }
        : { left: "prev,next today", center: "title", right: "" },
      buttonText: { today: "today", month: "month", prev: "‹", next: "›" },

      dateClick: (info: DateClickArg) => openForDate(info.dateStr),
      dayCellDidMount(arg) {
        const cell = arg.el as HTMLElement;
        cell.style.cursor = "pointer";
        if (!cell.getAttribute("title"))
          cell.setAttribute("title", "Click to choose a time");
      },
    });

    const onResize = () => {
      cal.setOption(
        "headerToolbar",
        isMobile()
          ? { left: "prev,next today", center: "title", right: "" }
          : { left: "prev,next today", center: "title", right: "" }
      );
    };

    cal.render();
    window.addEventListener("resize", onResize);
    calendarInst.current = cal;

    return () => {
      window.removeEventListener("resize", onResize);
      cal.destroy();
      calendarInst.current = null;
    };
  }, []);

  const isBlocked = (t: string) => blocked.includes(t);
  const fitsFrom = (t: string) =>
    !rangeTimes(t, durationNow).some((s) => blocked.includes(s));
  const overflows = (t: string) => parseTime(t) + durationNow > WORK_END * 60;

  async function resumePayFromStorage() {
    try {
      const raw = localStorage.getItem("lastBooking");
      if (!raw) return alert("No pending payment");
      const payload = JSON.parse(raw) as {
        bookingId: string;
        date: string;
        time: string;
        name: string;
        phone: string;
        serviceTitle?: string;
        price?: string;
      };

      const r = await fetch(`/api/pay/checkout?_=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url)
        throw new HttpError(j.error || "Checkout error", r.status);
      window.location.href = j.url;
    } catch (e) {
      alert("Failed to proceed with the payment");
      console.error(e);
    }
  }

  async function handleConfirm() {
    if (!dateStr || !selected) {
      alert("Please select a time");
      return;
    }
    if (!nameIsValid(name)) {
      alert("Please enter a valid name (letters only, at least 2).");
      return;
    }
    if (!phoneIsValid(phone)) {
      alert("Please enter a valid phone (7–15 digits).");
      return;
    }

    try {
      setBusy(true);
      const { bookingId } = await apiBook({
        date: dateStr,
        time: selected,
        name,
        phone,
        durationMin: durationNow,
        serviceTitle: selectedService?.title,
        price: selectedService?.price,
      });

      try {
        localStorage.setItem(
          "lastBooking",
          JSON.stringify({
            bookingId,
            date: dateStr,
            time: selected,
            name,
            phone,
            serviceTitle: selectedService?.title,
            price: selectedService?.price,
          })
        );
      } catch {}

      const payRes = await fetch(`/api/pay/checkout?_=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          time: selected,
          bookingId,
          name,
          phone,
          serviceTitle: selectedService?.title,
          price: selectedService?.price,
        }),
        cache: "no-store",
      });
      const payJson = (await payRes.json()) as { url?: string; error?: string };
      if (!payRes.ok || !payJson.url)
        throw new HttpError(payJson.error || "Checkout error", payRes.status);

      window.location.href = payJson.url;
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        alert("The selected time slot is already taken. Refreshing...");
        if (dateStr) openForDate(dateStr);
      } else {
        alert("Error. Please try again.");
        console.error(err);
      }
    } finally {
      setBusy(false);
    }
  }

  function onModalBgClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setDateStr(null);
  }

  /* Esc to close modal */
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setDateStr(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const prettyDate =
    dateStr &&
    new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const fullPriceCentsLocal = parseUsdToCentsLocal(selectedService?.price);
  const uiChargeCents = getChargeCentsLocal(fullPriceCentsLocal);
  const buttonLabel =
    busy ? "Processing…" : uiChargeCents ? `Pay ${fmtUSD(uiChargeCents)}` : "Pay deposit";

  return (
    <>
      {/* Toast (mobile-first) */}
      {flash && (
        <div
          className={`toast toast--${flash.kind}`}
          role="alert"
          aria-live="polite"
        >
          <div className="toast__icon" aria-hidden>
            {flash.kind === "success"
              ? "✅"
              : flash.kind === "error"
              ? "⛔️"
              : "ℹ️"}
          </div>
          <div className="toast__body">
            <div className="toast__title">{flash.title}</div>
            {flash.text && <div className="toast__text">{flash.text}</div>}
          </div>

          {flash.kind === "info" ? (
            <button className="toast__action" onClick={resumePayFromStorage}>
              Pay now
            </button>
          ) : (
            <button
              className="toast__close"
              aria-label="Close"
              onClick={() => setFlash(null)}
            >
              ✕
            </button>
          )}
        </div>
      )}

      <main className="container" style={{ padding: "28px 0 40px" }}>
        <div className="booking__header">
          <button
            type="button"
            className="back-home-btn"
            onClick={() => { window.location.href = "https://ozhbrows.netlify.app/"; }}
          >
            <span className="icon">
              <ChevronLeft size={20} />
            </span>
            <span className="text">Back to Home</span>
          </button>
          <h1 className="display" style={{ marginBottom: 6 }}>
            Online Booking
          </h1>
          <p className="hero-lead booking__intro">
            Click a date to choose a time and book your appointment.
          </p>
        </div>

        <div className="booking__wrap">
          <div
            className="booking__card"
            aria-label="Calendar for choosing a date"
          >
            <div ref={calRef} />
          </div>
        </div>

        {/* Modal */}
        {dateStr && (
          <div
            className="modal open"
            onClick={onModalBgClick}
            aria-modal="true"
            role="dialog"
          >
            <div className="sheet" role="document">
              {/* HEADER */}
              <div className="sheet__header">
                <div className="sheet__badge" aria-hidden>
                  📅
                </div>
                <div className="sheet__titles">
                  <h3 className="sheet__title">Choose a time</h3>
                  <div className="sheet__sub">
                    {prettyDate}
                    <span className="dot">•</span> Working hours:{" "}
                    <b>08:00–20:00</b>
                    <span className="dot">•</span> <b>{durationNow}m</b>
                  </div>
                </div>
              </div>

              {/* SCROLLABLE BODY */}
              <div className="sheet__body">
                <div
                  className="slots"
                  role="listbox"
                  aria-label="Available times"
                >
                  {slots.map((t) => {
                    const disabled =
                      isBlocked(t) || !fitsFrom(t) || overflows(t);
                    const selectedNow = selected === t;
                    return (
                      <button
                        key={t}
                        role="option"
                        aria-selected={selectedNow}
                        className={`slot${selectedNow ? " selected" : ""}${
                          disabled ? " disabled" : ""
                        }`}
                        onClick={() => !disabled && setSelected(t)}
                        disabled={disabled}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>

                {/* FORM */}
                <div className="form">
                  <div>
                    <label>
                      Name
                      <input
                        value={name}
                        onChange={(e) =>
                          setName(sanitizeNameInput(e.target.value))
                        }
                        onBlur={() => setNameTouched(true)}
                        placeholder="Name"
                        inputMode="text"
                        aria-invalid={nameTouched && !nameIsValid(name)}
                      />
                    </label>
                    {nameTouched && !nameIsValid(name) && (
                      <small style={{ color: "#b42318" }}>
                        Only letters, at least 2 characters.
                      </small>
                    )}
                  </div>
                  <div>
                    <label>
                      Phone
                      <input
                        value={phone}
                        onChange={(e) =>
                          setPhone(sanitizePhoneInput(e.target.value))
                        }
                        onBlur={() => setPhoneTouched(true)}
                        inputMode="tel"
                        placeholder="+1 (555) 123-4567"
                        aria-invalid={phoneTouched && !phoneIsValid(phone)}
                      />
                    </label>
                    {phoneTouched && !phoneIsValid(phone) && (
                      <small style={{ color: "#b42318" }}>
                        7–15 digits. Letters are not allowed.
                      </small>
                    )}
                  </div>
                </div>

                {bookings?.length > 0 && (
                  <div className="admin-list">
                    <h4>Bookings for this day</h4>
                    <div>
                      {bookings
                        .slice()
                        .sort((a, b) => parseTime(a.time) - parseTime(b.time))
                        .map((b) => (
                          <div className="row" key={`${b.time}-${b.name}`}>
                            <span>
                              {b.time}
                              {b.durationMin ? ` (${b.durationMin}m)` : ""}
                            </span>
                            <span>{b.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* STICKY FOOTER */}
              <div className="sheet__footer">
                <button className="btn" onClick={() => setDateStr(null)}>
                  Close
                </button>
                <button
                  className="btn primary"
                  onClick={handleConfirm}
                  disabled={!canPay}
                >
                  {buttonLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
