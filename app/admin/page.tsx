'use client';

import { useEffect, useMemo, useState } from 'react';
import './admin.css';

type Row = {
  date: string;
  time: string;
  name: string;
  phone?: string;
  paid?: boolean;
  paymentId?: string | null;
};

const API_BASE = '/api';

function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function escapeHtml(str: string) {
  return (str || '').replace(/[&<>"']/g, (s) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]!
  ));
}

export default function AdminPage() {
  const [from, setFrom] = useState(() => toISO(new Date()));
  const [to, setTo] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 30); return toISO(d); });
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminKey, setAdminKey] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : sessionStorage.getItem('ADMIN_KEY')
  );

  useEffect(() => { if (adminKey) sessionStorage.setItem('ADMIN_KEY', adminKey); }, [adminKey]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(r =>
      (r.name || '').toLowerCase().includes(term) ||
      (r.phone || '').toLowerCase().includes(term) ||
      r.date.toLowerCase().includes(term) ||
      r.time.toLowerCase().includes(term)
    );
  }, [rows, q]);

  async function api<T>(path: string, params?: Record<string,string>, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
    if (!adminKey) throw new Error('No admin PIN');
    const headers: Record<string,string> = { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey };
    let url = `${API_BASE}${path}`;
    if (method === 'GET' && params && Object.keys(params).length) {
      const u = new URL(url, location.origin);
      Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
      u.searchParams.set('_', String(Date.now())); // cache-bust
      url = u.toString();
    }
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null, cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as { error?: string })?.error || 'API error');
    return json as T;
  }

  async function load() {
    try {
      if (!adminKey) {
        const pin = prompt('Enter admin PIN') || '';
        if (!pin) return;
        setAdminKey(pin);
      }
      setLoading(true);
      const data = await api<{ rows: Row[] }>('/admin-list', { start: from, end: to }, 'GET');
      setRows((data.rows || []).slice().sort((a,b)=> a.date.localeCompare(b.date) || a.time.localeCompare(b.time)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to load');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function cancel(date: string, time: string) {
    if (!confirm(`Cancel booking on ${date} at ${time}? This will free the time slot.`)) return;
    try {
      await api<{ ok: true }>('/admin-cancel', {}, 'POST', { date, time });
      setRows(prev => prev.filter(r => !(r.date === date && r.time === time)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Cancel failed');
      console.error(e);
    }
  }

  function downloadCsv() {
    const header = ['date','time','name','phone','status','paymentId'];
    const lines = [header.join(',')];
    filtered.forEach(r=>{
      const status = r.paid ? 'paid' : 'booked';
      const vals = [r.date, r.time, r.name || '', r.phone || '', status, r.paymentId || '']
        .map(v => `"${(v || '').toString().replace(/"/g,'""')}"`);
      lines.push(vals.join(','));
    });
    const csv = lines.join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `bookings_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function logout() {
    sessionStorage.removeItem('ADMIN_KEY');
    setAdminKey(null);
    alert('PIN cleared. Reload page and enter again.');
  }

  return (
    <div className="wrap">
      <div className="card">
        <h1>Admin — Bookings</h1>

        <div className="toolbar">
          <label>From <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} /></label>
          <label>To <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} /></label>
          <button className="primary" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Load'}</button>

          <div className="right">
            <input className="search" placeholder="Search name/phone/date/time" value={q} onChange={(e)=>setQ(e.target.value)} />
            <button onClick={downloadCsv}>Export CSV</button>
            <button onClick={logout}>Change PIN</button>
          </div>
        </div>

        <div className="hint">
          This page requires your admin PIN (same <code>ADMIN_KEY</code> used in the widget). Data is fetched from server routes.
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th className="hide-sm">Client</th>
              <th>Phone</th>
              <th>Status</th>
              <th className="hide-sm">Payment</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="empty">No data yet. Choose dates and click <b>Load</b>.</td></tr>
            ) : (
              filtered.map(r => (
                <tr key={`${r.date}-${r.time}-${r.name}`}>
                  <td>{r.date}</td>
                  <td>{r.time}</td>
                  <td className="hide-sm" dangerouslySetInnerHTML={{ __html: escapeHtml(r.name || '') }} />
                  <td dangerouslySetInnerHTML={{ __html: escapeHtml(r.phone || '') }} />
                  <td><span className={`pill ${r.paid ? 'paid' : ''}`}>{r.paid ? 'paid' : 'booked'}</span></td>
                  <td className="hide-sm" dangerouslySetInnerHTML={{ __html: r.paymentId ? escapeHtml(r.paymentId) : '<span class="muted">—</span>' }} />
                  <td style={{ textAlign: 'right' }}>
                    <button className="danger" onClick={() => cancel(r.date, r.time)}>Cancel</button>
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
