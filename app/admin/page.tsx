// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import "./admin.css";

type Row = {
  date: string;
  time: string;
  name: string;
  phone?: string;
  paid?: boolean;
  paymentId?: string | null;
  serviceTitle?: string;
  price?: string;
  durationMin?: number;
  isBlock?: boolean;
};

const API_BASE = "/api";

/* ---------- utils ---------- */
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function escapeHtml(str: string) {
  return (str || "").replace(
    /[&<>"']/g,
    (s) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        s
      ]!)
  );
}
function fmtDuration(min?: number) {
  const m = Number(min ?? 0);
  if (!Number.isFinite(m) || m <= 0) return "—";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? `${h}h${mm ? ` ${mm}m` : ""}` : `${mm}m`;
}
function validTimeStr(s: string) {
  return /^\d{2}:\d{2}$/.test(s);
}
function parseTimeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minToTime(m: number) {
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function addMinutes(t: string, delta: number) {
  return minToTime(parseTimeToMin(t) + delta);
}

export default function AdminPage() {
  const [from, setFrom] = useState(() => toISO(new Date()));
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toISO(d);
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  // Admin blocks panel: Date + Start + End
  const [blockDate, setBlockDate] = useState<string>(() => toISO(new Date()));
  const [blockStart, setBlockStart] = useState<string>("08:00");
  const [blockEnd, setBlockEnd] = useState<string>("08:45");

  // коли міняємо Start — якщо End <= Start, автоматом підставимо +45 хв
  useEffect(() => {
    if (!validTimeStr(blockStart) || !validTimeStr(blockEnd)) return;
    const s = parseTimeToMin(blockStart);
    const e = parseTimeToMin(blockEnd);
    if (e <= s) setBlockEnd(addMinutes(blockStart, 45));
  }, [blockStart]);

  /* ---------- admin key + api ---------- */
  async function ensureAdminKey(): Promise<string> {
    let key =
      typeof window !== "undefined"
        ? sessionStorage.getItem("ADMIN_KEY") || ""
        : "";
    if (!key) {
      const pin =
        typeof window !== "undefined" ? prompt("Enter admin PIN") || "" : "";
      if (!pin) throw new Error("Canceled");
      key = pin;
      sessionStorage.setItem("ADMIN_KEY", key);
    }
    return key;
  }

  async function api<T>(
    path: string,
    params?: Record<string, string>,
    method: "GET" | "POST" = "GET",
    body?: unknown
  ): Promise<T> {
    let key = await ensureAdminKey();

    const doFetch = async (k: string): Promise<Response> => {
      let url = `${API_BASE}${path}`;
      if (method === "GET" && params && Object.keys(params).length) {
        const u = new URL(url, location.origin);
        Object.entries(params).forEach(([kk, v]) => u.searchParams.set(kk, v));
        u.searchParams.set("_", String(Date.now()));
        url = u.toString();
      }
      return fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "X-Admin-Key": k },
        body: body ? JSON.stringify(body) : null,
        cache: "no-store",
      });
    };

    let res = await doFetch(key);
    if (res.status === 401) {
      sessionStorage.removeItem("ADMIN_KEY");
      key = await ensureAdminKey();
      res = await doFetch(key);
    }

    const json: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      let msg = "API error";
      if (typeof json === "object" && json !== null && "error" in json) {
        const val = (json as Record<string, unknown>).error;
        if (typeof val === "string" && val.trim()) msg = val;
      }
      throw new Error(msg);
    }
    return json as T;
  }

  /* ---------- actions ---------- */
  async function load() {
    try {
      setLoading(true);
      const data = await api<{ rows: Row[] }>(
        "/admin-list",
        { start: from, end: to },
        "GET"
      );
      setRows(
        (data.rows || []).sort(
          (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        )
      );
    } catch (e) {
      if ((e as Error).message !== "Canceled") {
        alert((e as Error).message || "Failed to load");
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  }

  async function cancel(date: string, time: string) {
    if (!confirm(`Cancel booking on ${date} at ${time}?`)) return;
    try {
      await api<{ ok: true }>("/admin-cancel", {}, "POST", { date, time });
      setRows((prev) =>
        prev.filter((r) => !(r.date === date && r.time === time && !r.isBlock))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Cancel failed");
      console.error(e);
    }
  }

  async function unblock(date: string, time: string, durationMin?: number) {
    if (!confirm(`Unblock ${date} from ${time} (${fmtDuration(durationMin)})?`))
      return;
    try {
      await api<{ ok: true }>("/book", {}, "POST", {
        action: "admin-unblock",
        date,
        time,
        durationMin,
      });
      setRows((prev) =>
        prev.filter((r) => !(r.isBlock && r.date === date && r.time === time))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Unblock failed");
      console.error(e);
    }
  }

  // EDIT: move admin block → new date + new start + new end
  async function moveBlock(date: string, time: string, defDur?: number) {
    const nd = prompt("New date (YYYY-MM-DD):", date)?.trim();
    if (!nd) return;
    const ns = prompt("New start time (HH:MM):", time)?.trim();
    if (!ns || !validTimeStr(ns)) return;

    const defaultEnd =
      defDur && defDur > 0 ? addMinutes(ns, defDur) : addMinutes(ns, 45);
    const ne = prompt("New end time (HH:MM):", defaultEnd)?.trim();
    if (!ne || !validTimeStr(ne)) return;

    const s = parseTimeToMin(ns);
    const e = parseTimeToMin(ne);
    if (e <= s) {
      alert("End must be later than Start.");
      return;
    }
    const ndur = e - s;

    try {
      await api<{ ok: true }>("/book", {}, "POST", {
        action: "admin-move-block",
        date,
        time,
        durationMin: defDur, // допомагає точно зняти старий інтервал
        newDate: nd,
        newTime: ns,
        newDurationMin: ndur,
      });

      // optimistic update
      setRows((prev) => {
        const inRange = (d: string) => d >= from && d <= to;
        const base = prev.filter(
          (r) => !(r.isBlock && r.date === date && r.time === time)
        );
        if (inRange(nd)) {
          base.push({
            date: nd,
            time: ns,
            name: "",
            phone: "",
            paid: false,
            paymentId: "",
            serviceTitle: "",
            price: "",
            durationMin: ndur,
            isBlock: true,
          });
        }
        return base.sort(
          (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        );
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Move failed");
      console.error(e);
    }
  }

  // блокування інтервалу за Start+End
  async function blockInterval() {
    if (
      !blockDate ||
      !validTimeStr(blockStart) ||
      !validTimeStr(blockEnd)
    ) {
      alert("Set date, Start and End in HH:MM.");
      return;
    }
    const s = parseTimeToMin(blockStart);
    const e = parseTimeToMin(blockEnd);
    if (e <= s) {
      alert("End must be later than Start.");
      return;
    }
    const durationMin = e - s;

    try {
      await api<{ ok: true }>("/book", {}, "POST", {
        action: "admin-block",
        date: blockDate,
        time: blockStart,
        durationMin,
      });
      alert(`Blocked ${blockStart}–${blockEnd} (${durationMin}m) on ${blockDate}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to block interval");
      console.error(e);
    }
  }

  async function blockWholeDay() {
    if (!blockDate) return;
    if (!confirm(`Block the whole day ${blockDate}?`)) return;
    try {
      await api<{ ok: true }>("/book", {}, "POST", {
        action: "block-day",
        date: blockDate,
      });
      alert(`Day ${blockDate} blocked`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to block day");
      console.error(e);
    }
  }
  async function unblockWholeDay() {
    if (!blockDate) return;
    if (!confirm(`Unblock the whole day ${blockDate}?`)) return;
    try {
      await api<{ ok: true }>("/book", {}, "POST", {
        action: "unblock-day",
        date: blockDate,
      });
      alert(`Day ${blockDate} unblocked`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to unblock day");
      console.error(e);
    }
  }

  /* ---------- UI ---------- */
  return (
    <div className="wrap">
      <div className="card">
        <h1>Admin — Bookings</h1>

        <div className="toolbar">
          <label>
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>

        <button className="btn primary" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Load"}
          </button>
        </div>

        {/* Admin blocks panel (Start + End) */}
        <div className="toolbar blocks">
          <strong>Admin blocks</strong>
          <label>
            Date
            <input
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
            />
          </label>
          <label>
            Start
            <input
              type="time"
              value={blockStart}
              onChange={(e) => setBlockStart(e.target.value)}
              step={900}
            />
          </label>
          <label>
            End
            <input
              type="time"
              value={blockEnd}
              onChange={(e) => setBlockEnd(e.target.value)}
              step={900}
            />
          </label>

          <div className="btns">
            <button className="btn primary" onClick={blockInterval}>
              Block interval
            </button>
            <button className="btn soft" onClick={blockWholeDay}>
              Block day
            </button>
            <button className="btn ghost" onClick={unblockWholeDay}>
              Unblock day
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="col-date">Date</th>
                <th className="col-time">Time</th>
                <th className="col-service">Service</th>
                <th className="col-dur">Dur</th>
                <th className="col-client hide-sm">Name</th>
                <th className="col-phone">Phone</th>
                <th className="col-status">Status</th>
                <th className="col-pay hide-sm">Pay</th>
                <th className="col-act">Act</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty">
                    No data yet. Choose dates and click <b>Load</b>.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={`${r.date}-${r.time}-${r.name}-${r.phone}-${
                      r.isBlock ? "blk" : "bk"
                    }`}
                  >
                    <td>{r.date}</td>
                    <td>{r.time}</td>
                    <td>
                      {r.serviceTitle ? (
                        <>
                          {r.serviceTitle}{" "}
                          {r.price ? (
                            <span className="muted">• {r.price}</span>
                          ) : null}
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{fmtDuration(r.durationMin)}</td>
                    <td
                      className="hide-sm"
                      dangerouslySetInnerHTML={{
                        __html: escapeHtml(r.name || ""),
                      }}
                    />
                    <td
                      dangerouslySetInnerHTML={{
                        __html: escapeHtml(r.phone || ""),
                      }}
                    />
                    <td>
                      <span
                        className={`pill ${
                          r.isBlock ? "blocked" : r.paid ? "paid" : ""
                        }`}
                      >
                        {r.isBlock ? "blocked" : r.paid ? "paid" : "booked"}
                      </span>
                    </td>
                    <td
                      className="hide-sm"
                      dangerouslySetInnerHTML={{
                        __html: r.paymentId
                          ? escapeHtml(r.paymentId)
                          : '<span class="muted">—</span>',
                      }}
                    />
                    <td className="actions">
                      {r.isBlock ? (
                        <>
                          <button
                            className="btn soft"
                            onClick={() =>
                              moveBlock(
                                r.date,
                                r.time,
                                r.durationMin || undefined
                              )
                            }
                          >
                            Edit
                          </button>
                          <button
                            className="btn ghost"
                            onClick={() =>
                              unblock(r.date, r.time, r.durationMin || undefined)
                            }
                          >
                            Unblock
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn danger"
                          onClick={() => cancel(r.date, r.time)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
