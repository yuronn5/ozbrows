'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const API_BASE = '/api'; // Next.js Route Handlers

// ---- time utils (узгоджено з беком) ----
const WORK_START = 8, WORK_END = 20;
const SLOT_MINUTES = 15, SERVICE_DURATION = 45;

function toTime(h: number, m: number) {
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function parseTime(t: string) {
  const [hh,mm] = t.split(':').map(Number);
  return hh*60+mm;
}
function minutesToTime(min: number) {
  return toTime(Math.floor(min/60), min%60);
}
function clampEnd(min: number) {
  return Math.min(min, WORK_END*60);
}
function genSlots(step = SLOT_MINUTES) {
  const out: string[] = [];
  for (let h=WORK_START; h<WORK_END; h++) {
    for (let m=0; m<60; m+=step) out.push(toTime(h,m));
  }
  return out;
}
function rangeTimes(startTimeStr: string, dur = SERVICE_DURATION, step = SLOT_MINUTES) {
  const startMin = parseTime(startTimeStr);
  const hardEnd = clampEnd(startMin + dur);
  let t = Math.ceil(startMin/step)*step;
  const out: string[] = [];
  if (startMin >= WORK_START*60 && startMin < WORK_END*60) out.push(minutesToTime(startMin));
  for (; t < hardEnd; t += step) if (t >= WORK_START*60 && t < WORK_END*60) out.push(minutesToTime(t));
  return out;
}

// ---- small helpers ----
async function loadDay(dateStr: string, asAdmin = false, adminKey?: string) {
  const headers: Record<string,string> = {};
  if (asAdmin && adminKey) headers['x-admin-key'] = adminKey;
  const url = new URL(`${API_BASE}/availability`, location.origin);
  url.searchParams.set('date', dateStr);
  url.searchParams.set('_', String(Date.now())); // no-store
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) throw new Error('availability error');
  return res.json() as Promise<{ blocked: string[]; bookings: { time:string; name:string; phone?:string }[] }>;
}

async function apiBook(payload: any, adminKey?: string) {
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (adminKey) headers['x-admin-key'] = adminKey;
  const res = await fetch(`${API_BASE}/book?_=${Date.now()}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(json?.error || 'API error');
    err.status = res.status;
    err.json = json;
    throw err;
  }
  return json;
}

export default function BookingPage() {
  const calRef = useRef<HTMLDivElement>(null);
  const calendarInst = useRef<Calendar | null>(null);

  // UI state
  const [dateStr, setDateStr] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [bookings, setBookings] = useState<{ time:string; name:string; phone?:string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  // open modal
  const openForDate = async (d: string) => {
    setSelected(null);
    setName('');
    setPhone('');
    setDateStr(d);

    try {
      const day = await loadDay(d, false);
      // заблокуємо також проміжки під існуючі бронювання
      const autoBlocked = Array.from(new Set([
        ...(day.blocked || []),
        ...((day.bookings || []).flatMap(b => rangeTimes(b.time))),
      ])).sort((a,b)=>parseTime(a)-parseTime(b));

      setBlocked(autoBlocked);
      setBookings(day.bookings || []);
      setSlots(genSlots());
    } catch {
      setBlocked([]);
      setBookings([]);
      setSlots(genSlots());
      alert('Не вдалося завантажити зайнятість дня');
    }
  };

  // init FullCalendar once
  useEffect(() => {
    if (!calRef.current) return;
    const cal = new Calendar(calRef.current, {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      height: 'auto',
      selectable: true,
      dateClick: (info) => openForDate(info.dateStr),
    });
    cal.render();
    calendarInst.current = cal;
    return () => { cal.destroy(); calendarInst.current = null; };
  }, []);

  // derived helpers
  const isBlocked = (t: string) => blocked.includes(t);
  const fitsFrom = (t: string) => !rangeTimes(t).some(s => blocked.includes(s));

  async function handleConfirm() {
    if (!dateStr || !selected) { alert('Оберіть час'); return; }
    if (!name.trim() || !phone.trim()) { alert('Вкажіть ім’я та телефон'); return; }

    try {
      setBusy(true);
      await apiBook({ date: dateStr, time: selected, name, phone });
      // оновлюємо локальний список
      const day = await loadDay(dateStr, false);
      const autoBlocked = Array.from(new Set([
        ...(day.blocked || []),
        ...((day.bookings || []).flatMap(b => rangeTimes(b.time))),
      ])).sort((a,b)=>parseTime(a)-parseTime(b));
      setBlocked(autoBlocked);
      setBookings(day.bookings || []);
      // закриваємо модалку
      setDateStr(null);
      alert(`Запис підтверджено: ${dateStr} о ${selected}`);
    } catch (e: any) {
      if (e?.status === 409) {
        alert('Обраний проміжок вже зайнятий. Оновлюю...');
        if (dateStr) openForDate(dateStr);
      } else {
        alert('Помилка бронювання. Спробуйте ще раз.');
        console.error(e);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container" style={{ padding: '40px 0' }}>
      <h1 className="display">Online Booking</h1>
      <p className="hero-lead">Click a date to choose a time and book your appointment.</p>

      {/* Calendar */}
      <div
        ref={calRef}
        style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '10px',
          boxShadow: '0 8px 30px rgba(0,0,0,.08)',
        }}
      />

      {/* Modal */}
      {dateStr && (
        <div className="modal open" onClick={(e) => { if (e.target === e.currentTarget) setDateStr(null); }}>
          <div className="sheet">
            <h3 style={{ margin: 0 }}>Вибір часу</h3>
            <div className="sub">
              {new Date(`${dateStr}T12:00:00`).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' })}
              {' • '}Робочі години: <b>08:00–20:00</b> • Тривалість: <b>45 хв</b>
            </div>

            {/* Slots */}
            <div className="slots">
              {slots.map((t) => {
                const blocked = isBlocked(t);
                const fits = fitsFrom(t);
                const disabled = blocked || !fits;
                return (
                  <button
                    key={t}
                    className={`slot${blocked ? ' blocked' : ''}${!fits ? ' notfit' : ''}${selected === t ? ' selected' : ''}`}
                    onClick={() => !disabled && setSelected(t)}
                    disabled={disabled}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            {/* Client form */}
            <div className="form" style={{ marginTop: 10 }}>
              <div>
                <label>Ім’я
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ім’я" />
                </label>
              </div>
              <div>
                <label>Телефон
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+380..." />
                </label>
              </div>
            </div>

            {/* Admin list (read-only для клієнта) */}
            {bookings?.length > 0 && (
              <div className="admin-list">
                <h4>Бронювання на день</h4>
                <div>
                  {bookings
                    .slice()
                    .sort((a,b)=>parseTime(a.time)-parseTime(b.time))
                    .map((b) => (
                      <div className="row" key={b.time + b.name}>
                        <span>{b.time}</span>
                        <span>{b.name}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="bar">
              <div className="left" />
              <div className="right">
                <button className="btn" onClick={() => setDateStr(null)}>Закрити</button>
                <button className="btn primary" onClick={handleConfirm} disabled={busy || !selected || !name || !phone}>
                  {busy ? 'Зберігаю…' : 'Підтвердити'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
