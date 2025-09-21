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
  isBlock?: boolean; // для рядків-блоків
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

export default function AdminPage() {
  const [from, setFrom] = useState(() => toISO(new Date()));
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toISO(d);
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  // Admin blocks quick panel
  const [blockDate, setBlockDate] = useState<string>(() => toISO(new Date()));
  const [blockTime, setBlockTime] = useState<string>("08:00");
  const [blockDur, setBlockDur] = useState<number>(45);

  useEffect(() => {
    // no-op
  }, []);

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

  // admin blocks quick panel
  function validTimeStr(s: string) {
    return /^\d{2}:\d{2}$/.test(s);
  }
  async function blockInterval() {
    if (!blockDate || !validTimeStr(blockTime) || !Number.isFinite(blockDur)) {
      alert("Set date, HH:MM time and duration (minutes).");
      return;
    }
    try {
      await api<{ ok: true }>("/book", {}, "POST", {
        action: "admin-block",
        date: blockDate,
        time: blockTime,
        durationMin: Math.max(5, Math.min(8 * 60, Number(blockDur))),
      });
      alert(`Blocked ${blockTime} for ${blockDur}m on ${blockDate}`);
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

        {/* Admin blocks panel */}
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
              value={blockTime}
              onChange={(e) => setBlockTime(e.target.value)}
              step={900}
            />
          </label>
          <label>
            Duration
            <input
              type="number"
              min={5}
              max={480}
              step={5}
              value={blockDur}
              onChange={(e) => setBlockDur(Number(e.target.value) || 0)}
            />
            <span className="unit">min</span>
          </label>

          <div className="btns">
            <button className="btn primary" onClick={blockInterval}>
              Block interval
            </button>
            <button className="btn soft" onClick={blockWholeDay}>
              Block whole day
            </button>
            <button className="btn ghost" onClick={unblockWholeDay}>
              Unblock whole day
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Service</th>
                <th>Duration</th>
                <th className="hide-sm">Client</th>
                <th>Phone</th>
                <th>Status</th>
                <th className="hide-sm">Payment</th>
                <th></th>
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
                      <span
                        className={`pill ${r.isBlock ? "blocked" : r.paid ? "paid" : ""}`}
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
                        <button
                          className="btn ghost"
                          onClick={() => unblock(r.date, r.time, r.durationMin || undefined)}
                        >
                          Unblock
                        </button>
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
