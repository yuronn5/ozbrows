"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  // Admin blocks quick panel
  const [blockDate, setBlockDate] = useState<string>(() => toISO(new Date()));
  const [blockTime, setBlockTime] = useState<string>("08:00");
  const [blockDur, setBlockDur] = useState<number>(45);

  useEffect(() => {
    // no-op: сторінка клієнтська — усе ок
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const inName = (r.name || "").toLowerCase().includes(term);
      const inPhone = (r.phone || "").toLowerCase().includes(term);
      const inDate = r.date.toLowerCase().includes(term);
      const inTime = r.time.toLowerCase().includes(term);
      const inService = (r.serviceTitle || "").toLowerCase().includes(term);
      const inDuration =
        String(r.durationMin ?? "").toLowerCase().includes(term) ||
        fmtDuration(r.durationMin).toLowerCase().includes(term);
      return inName || inPhone || inDate || inTime || inService || inDuration;
    });
  }, [rows, q]);

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
        durationMin, // бек уміє і сам визначити, але краще передати
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
      await api<{ ok: true }>(
        "/book",
        {},
        "POST",
        {
          action: "admin-block",
          date: blockDate,
          time: blockTime,
          durationMin: Math.max(5, Math.min(8 * 60, Number(blockDur))),
        }
      );
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

  function downloadCsv() {
    const header = [
      "date",
      "time",
      "serviceTitle",
      "durationMin",
      "price",
      "name",
      "phone",
      "status",
      "paymentId",
    ];
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      const status = r.isBlock ? "blocked" : r.paid ? "paid" : "booked";
      const vals = [
        r.date,
        r.time,
        r.serviceTitle || "",
        String(r.durationMin ?? ""),
        r.price || "",
        r.name || "",
        r.phone || "",
        status,
        r.paymentId || "",
      ].map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`);
      lines.push(vals.join(","));
    });
    const csv = lines.join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );
    a.download = `bookings_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function logout() {
    sessionStorage.removeItem("ADMIN_KEY");
    alert("PIN cleared. Reload page and enter again.");
  }

  /* ---------- UI ---------- */
  return (
    <div className="wrap">
      <div className="card">
        <h1>Admin — Bookings</h1>

        <div className="toolbar">
          <label>
            From{" "}
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To{" "}
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button className="primary" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Load"}
          </button>

          <div className="right">
            <input
              className="search"
              placeholder="Search name/phone/date/time/service"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button onClick={downloadCsv}>Export CSV</button>
            <button onClick={logout}>Change PIN</button>
          </div>
        </div>

        {/* Admin blocks panel */}
        <div
          className="toolbar"
          style={{ marginTop: 12, gap: 12, alignItems: "center" }}
        >
          <strong>Admin blocks</strong>
          <label>
            Date{" "}
            <input
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
            />
          </label>
          <label>
            Start{" "}
            <input
              type="time"
              value={blockTime}
              onChange={(e) => setBlockTime(e.target.value)}
              step={900}
            />
          </label>
          <label>
            Duration{" "}
            <input
              type="number"
              min={5}
              max={480}
              step={5}
              value={blockDur}
              onChange={(e) => setBlockDur(Number(e.target.value) || 0)}
              style={{ width: 90 }}
            />{" "}
            min
          </label>

          <button onClick={blockInterval}>Block interval</button>
          <span style={{ width: 12 }} />
          <button onClick={blockWholeDay}>Block whole day</button>
          <button onClick={unblockWholeDay}>Unblock whole day</button>
        </div>

        <table className="table" style={{ marginTop: 12 }}>
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty">
                  No data yet. Choose dates and click <b>Load</b>.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
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
                  <td style={{ textAlign: "right" }}>
                    {r.isBlock ? (
                      <button
                        onClick={() =>
                          unblock(r.date, r.time, r.durationMin || undefined)
                        }
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        className="danger"
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
  );
}
