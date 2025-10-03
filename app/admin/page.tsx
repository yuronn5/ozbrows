"use client";

import { useEffect, useRef, useState } from "react";
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
const STEP = 15; // хвилинна сітка (узгоджено з беком)

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
function parseTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function toTime(min: number) {
  const h = Math.floor(min / 60),
    m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function addMinutes(timeStr: string, minutes: number) {
  return toTime(parseTime(timeStr) + minutes);
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


  const [blockDate, setBlockDate] = useState<string>(() => toISO(new Date()));
  const [blockStart, setBlockStart] = useState<string>("08:00");
  const [blockEnd, setBlockEnd] = useState<string>(() => addMinutes("08:00", 45));


  const keyRef = useRef<string>("");
  const [adminReady, setAdminReady] = useState(false);


  async function ensureAdminKey(): Promise<string> {
    let key =
      typeof window !== "undefined"
        ? sessionStorage.getItem("ADMIN_KEY") || ""
        : "";
    if (!key) {
      const pin =
        typeof window !== "undefined" ? prompt("Enter admin PIN") || "" : "";
      if (!pin) throw new Error("Canceled");
      key = pin.trim();
      sessionStorage.setItem("ADMIN_KEY", key);
    }
    return key;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const k = await ensureAdminKey();
        if (!cancelled) keyRef.current = k;
      } finally {
        if (!cancelled) setAdminReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function api<T>(
    path: string,
    params?: Record<string, string>,
    method: "GET" | "POST" = "GET",
    body?: unknown
  ): Promise<T> {
    let key = keyRef.current || (await ensureAdminKey());
    keyRef.current = key;

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
      keyRef.current = key;
      res = await doFetch(key);
    }

    const json: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      let msg = "API error";
      if (typeof json === "object" && json && "error" in json) {
        const val = (json as Record<string, unknown>).error;
        if (typeof val === "string" && val.trim()) msg = val;
      }
      throw new Error(msg);
    }
    return json as T;
  }


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


  async function blockInterval() {
    if (!blockDate || !validTimeStr(blockStart) || !validTimeStr(blockEnd)) {
      alert("Set date and valid HH:MM times for Start and End.");
      return;
    }
    const startMin = parseTime(blockStart);
    const endMin = parseTime(blockEnd);
    if (endMin <= startMin) {
      alert("End time must be after Start time.");
      return;
    }

    let diff = endMin - startMin;
    diff = Math.max(5, Math.min(8 * 60, diff));
    diff = Math.ceil(diff / STEP) * STEP;

    try {
      await api<{ ok: true }>("/book", {}, "POST", {
        action: "admin-block",
        date: blockDate,
        time: blockStart,
        durationMin: diff,
      });
      alert(`Blocked ${blockStart} → ${blockEnd} (${fmtDuration(diff)}) on ${blockDate}`);
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
              disabled={!adminReady}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={!adminReady}
            />
          </label>

          <button
            className="btn primary"
            onClick={load}
            disabled={loading || !adminReady}
            title={!adminReady ? "Enter PIN to unlock" : ""}
          >
            {loading ? "Loading…" : adminReady ? "Load" : "Unlocking…"}
          </button>
        </div>

        <div className="toolbar blocks">
          <strong>Admin blocks</strong>
          <label>
            Date
            <input
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
              disabled={!adminReady}
            />
          </label>
          <label>
            Start
            <input
              type="time"
              value={blockStart}
              onChange={(e) => {
                setBlockStart(e.target.value);
                // за бажанням підтасовуємо End = Start + 45
                if (validTimeStr(e.target.value)) {
                  setBlockEnd(addMinutes(e.target.value, 45));
                }
              }}
              step={STEP * 60}
              disabled={!adminReady}
            />
          </label>
          <label>
            End
            <input
              type="time"
              value={blockEnd}
              onChange={(e) => setBlockEnd(e.target.value)}
              step={STEP * 60}
              disabled={!adminReady}
            />
          </label>

          <div className="btns">
            <button className="btn primary" onClick={blockInterval} disabled={!adminReady}>
              Block interval
            </button>
            <button className="btn soft" onClick={blockWholeDay} disabled={!adminReady}>
              Block day
            </button>
            <button className="btn ghost" onClick={unblockWholeDay} disabled={!adminReady}>
              Unblock day
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="col-date" title="Date">Date</th>
                <th className="col-time" title="Time">Time</th>
                <th className="col-service" title="Service">Service</th>
                <th className="col-dur" title="Duration">Dur</th>
                <th className="col-client hide-sm" title="Client name">Name</th>
                <th className="col-phone" title="Phone">Phone</th>
                <th className="col-status" title="Status">Status</th>
                <th className="col-pay hide-sm" title="Payment">Pay</th>
                <th className="col-act" title="Actions">Act</th>
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
                          {r.price ? <span className="muted">• {r.price}</span> : null}
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{fmtDuration(r.durationMin)}</td>
                    <td
                      className="hide-sm"
                      dangerouslySetInnerHTML={{ __html: escapeHtml(r.name || "") }}
                    />
                    <td dangerouslySetInnerHTML={{ __html: escapeHtml(r.phone || "") }} />
                    <td>
                      <span className={`pill ${r.isBlock ? "blocked" : r.paid ? "paid" : ""}`}>
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
                        <button
                          className="btn ghost"
                          onClick={() => unblock(r.date, r.time, r.durationMin || undefined)}
                        >
                          Unblock
                        </button>
                      ) : (
                        <button className="btn danger" onClick={() => cancel(r.date, r.time)}>
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
