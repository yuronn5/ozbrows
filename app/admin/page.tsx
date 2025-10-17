// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import "./admin.css";

/* ---------- types ---------- */
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
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as const)[
        s as "&" | "<" | ">" | '"' | "'"
      ]
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

/* ---------- thin fetch helper (без any) ---------- */
function isErrorResponse(x: unknown): x is { error: string } {
  if (typeof x !== "object" || x === null) return false;
  const e = (x as { error?: unknown }).error;
  return typeof e === "string" && e.trim().length > 0;
}
async function api<T>(
  path: string,
  options?: RequestInit & { query?: Record<string, string> }
): Promise<T> {
  let url = `${API_BASE}${path}`;
  if (options?.query) {
    const u = new URL(url, location.origin);
    for (const [k, v] of Object.entries(options.query)) u.searchParams.set(k, v);
    // bust cache
    u.searchParams.set("_", String(Date.now()));
    url = u.toString();
  }

  const res = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = isErrorResponse(json) ? json.error : "API error";
    throw new Error(msg);
  }
  return json as T;
}

/* =========================================
   PAGE
========================================= */
export default function AdminPage() {
  /* range loader */
  const [from, setFrom] = useState(() => toISO(new Date()));
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toISO(d);
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  /* Admin blocks: Date + Start + End */
  const [blockDate, setBlockDate] = useState<string>(() => toISO(new Date()));
  const [blockStart, setBlockStart] = useState<string>("08:00");
  const [blockEnd, setBlockEnd] = useState<string>("08:45");

  // якщо End <= Start — автододаємо +45 хв
  useEffect(() => {
    if (!validTimeStr(blockStart) || !validTimeStr(blockEnd)) return;
    const s = parseTimeToMin(blockStart);
    const e = parseTimeToMin(blockEnd);
    if (e <= s) setBlockEnd(addMinutes(blockStart, 45));
  }, [blockStart]);

  /* ---------- actions ---------- */
  async function load() {
    try {
      setLoading(true);
      const data = await api<{ rows: Row[] }>("/admin-list", {
        method: "GET",
        query: { start: from, end: to },
      });
      setRows(
        (data.rows || []).sort(
          (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to load");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function cancel(date: string, time: string) {
    if (!confirm(`Cancel booking on ${date} at ${time}?`)) return;
    try {
      await api<{ ok: true }>("/admin-cancel", {
        method: "POST",
        body: JSON.stringify({ date, time }),
      });
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
      await api<{ ok: true }>("/book", {
        method: "POST",
        body: JSON.stringify({
          action: "admin-unblock",
          date,
          time,
          durationMin,
        }),
      });
      setRows((prev) =>
        prev.filter((r) => !(r.isBlock && r.date === date && r.time === time))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Unblock failed");
      console.error(e);
    }
  }

  // Edit (move) admin block: change date + start + end
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
      await api<{ ok: true }>("/book", {
        method: "POST",
        body: JSON.stringify({
          action: "admin-move-block",
          date,
          time,
          durationMin: defDur, // допоможе акуратно зняти старий інтервал
          newDate: nd,
          newTime: ns,
          newDurationMin: ndur,
        }),
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

  // Block new interval by Start+End
  async function blockInterval() {
    if (!blockDate || !validTimeStr(blockStart) || !validTimeStr(blockEnd)) {
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
      await api<{ ok: true }>("/book", {
        method: "POST",
        body: JSON.stringify({
          action: "admin-block",
          date: blockDate,
          time: blockStart,
          durationMin,
        }),
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
      await api<{ ok: true }>("/book", {
        method: "POST",
        body: JSON.stringify({ action: "block-day", date: blockDate }),
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
      await api<{ ok: true }>("/book", {
        method: "POST",
        body: JSON.stringify({ action: "unblock-day", date: blockDate }),
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

        {/* Range loader */}
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

        {/* Admin blocks: Start + End */}
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

        {/* Table */}
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
                    key={`${r.date}-${r.time}-${r.name}-${r.phone}-${r.isBlock ? "blk" : "bk"}`}
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
                              moveBlock(r.date, r.time, r.durationMin || undefined)
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
