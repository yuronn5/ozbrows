"use client";

import { MouseEvent, useEffect, useRef, useState } from "react";
import { Calendar } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import "./booking.css";
import "../globals.css";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

const API_BASE = "/api";

type Booking = {
  time: string;
  name: string;
  phone?: string;
  durationMin?: number; // приходить з /availability (для клієнтського блокування)
};
type DayData = { blocked: string[]; bookings: Booking[] };

const WORK_START = 8,
  WORK_END = 20;
const SLOT_MINUTES = 15,
  SERVICE_DURATION = 45; // дефолт, якщо послугу ще не обрали

/** HttpError з кодом статусу — щоб не використовувати any */
class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

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
  const latestStart = WORK_END * 60 - durationMin; // останній старт під тривалість
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
  durationMin?: number; // ← важливо: реальна тривалість
};
type ApiOk = { ok: true };
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

  // вибрана послуга (може прийти з localStorage або з CustomEvent від модалки)
  const [selectedService, setSelectedService] = useState<null | {
    title?: string;
    price?: string;
    durationMin: number;
  }>(null);

  // 1) Ініціалізація з localStorage (щоб 45m не миготіло)
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

  // 2) Живе оновлення з модалки (дублює localStorage, але корисне для UX)
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

  /* відкриття “модалки” для дати */
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
          // існуючі бронювання — з їхньою фактичною тривалістю
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
      // eslint-disable-next-line no-alert
      alert("Не вдалося завантажити зайнятість дня");
    }
  };

  /* ініціалізація календаря */
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
      validRange: { start: new Date().toISOString().slice(0, 10) }, // без минулих дат
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
  const overflows = (t: string) =>
    parseTime(t) + durationNow > WORK_END * 60;

  async function handleConfirm() {
    if (!dateStr || !selected) {
      alert("Оберіть час");
      return;
    }
    if (!name.trim() || !phone.trim()) {
      alert("Вкажіть ім’я та телефон");
      return;
    }

    try {
      setBusy(true);
      await apiBook({
        date: dateStr,
        time: selected,
        name,
        phone,
        durationMin: durationNow,
      });
      const day = await loadDay(dateStr);
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
      setDateStr(null);
      alert(`Запис підтверджено: ${dateStr} о ${selected}`);
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        alert("Обраний проміжок вже зайнятий. Оновлюю...");
        if (dateStr) openForDate(dateStr);
      } else {
        alert("Помилка бронювання. Спробуйте ще раз.");
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
    new Date(`${dateStr}T12:00:00`).toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <main className="container" style={{ padding: "28px 0 40px" }}>
      <div className="booking__header">
        <Link href="/" className="back-home-btn">
          <span className="icon">
            <ChevronLeft size={20} />
          </span>
          <span className="text">Back to Home</span>
        </Link>
        <h1 className="display" style={{ marginBottom: 6 }}>
          Online Booking
        </h1>
        <p className="hero-lead booking__intro">
          Click a date to choose a time and book your appointment.
        </p>
      </div>

      <div className="booking__wrap">
        <div className="booking__card" aria-label="Calendar for choosing a date">
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
                  <span className="dot">•</span> Working hours: <b>08:00–20:00</b>
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
                    Ім’я
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ім’я"
                      inputMode="text"
                    />
                  </label>
                </div>
                <div>
                  <label>
                    Телефон
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+380..."
                      inputMode="tel"
                    />
                  </label>
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
              <button
                className="btn btn--ghost"
                onClick={() => setDateStr(null)}
              >
                Close
              </button>
              <button
                className="btn primary"
                onClick={handleConfirm}
                disabled={busy || !selected || !name || !phone}
              >
                {busy ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
