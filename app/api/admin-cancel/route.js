import { NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';

const WORK_START = 8, WORK_END = 20;
const SLOT_MINUTES = 15, SERVICE_DURATION = 45;

const noCache = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  Vary: 'x-admin-key',
};

function parseTime(t){ const [h,m]=t.split(':').map(Number); return h*60+m; }
function toTime(min){ const h=Math.floor(min/60), m=min%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }
function rangeTimes(startStr, dur = SERVICE_DURATION, step = SLOT_MINUTES){
  const start = parseTime(startStr);
  const end = Math.min(start + dur, WORK_END*60);
  const out = [];
  if (start >= WORK_START*60 && start < WORK_END*60) out.push(startStr);
  for (let t = Math.ceil(start/step)*step; t < end; t += step) {
    if (t >= WORK_START*60 && t < WORK_END*60) out.push(toTime(t));
  }
  return out;
}

async function notifyTelegram(text){
  if (process.env.NODE_ENV !== 'production') return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat  = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ chat_id: chat, text }),
    });
  } catch {}
}

export async function POST(req) {
  try {
    const adminKey = (req.headers.get('x-admin-key') || '').trim();
    const isAdmin = !!adminKey && adminKey === process.env.ADMIN_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: noCache });
    }

    const body = await req.json().catch(() => ({}));
    const date = body?.date;
    const time = body?.time;
    if (!date || !time) {
      return NextResponse.json({ error: 'date & time required' }, { status: 400, headers: noCache });
    }

    const store = getStore({ name: 'bookings' });
    const day = (await store.get(date, { type: 'json' })) || { blocked: [], bookings: [] };

    const idx = (day.bookings || []).findIndex(b => b.time === time);
    if (idx === -1) {
      return NextResponse.json({ error: 'booking not found' }, { status: 404, headers: noCache });
    }
    const removed = day.bookings.splice(idx, 1)[0];

    const span = rangeTimes(time);
    day.blocked = (day.blocked || []).filter(t => !span.includes(t));

    await store.set(date, JSON.stringify(day));

    await notifyTelegram(`❌ BOOKING CANCELED by admin\nDate: ${date}\nTime: ${time}\nName: ${removed?.name||''}\nPhone: ${removed?.phone||''}`);

    return NextResponse.json({ ok: true }, { status: 200, headers: noCache });
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500, headers: noCache });
  }
}
