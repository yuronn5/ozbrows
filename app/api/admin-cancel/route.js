import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";

const WORK_START = 8,
  WORK_END = 20;
const SLOT_MINUTES = 15,
  SERVICE_DURATION = 45;

const noCache = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "x-admin-key",
};

function parseTime(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function toTime(min) {
  const h = Math.floor(min / 60),
    m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
/** усі 15-хв точки у проміжку від старту з урахуванням тривалості */
function rangeTimes(startStr, dur = SERVICE_DURATION, step = SLOT_MINUTES) {
  const start = parseTime(startStr);
  const end = Math.min(start + dur, WORK_END * 60);
  const out = [];
  if (start >= WORK_START * 60 && start < WORK_END * 60) out.push(startStr);
  for (let t = Math.ceil(start / step) * step; t < end; t += step) {
    if (t >= WORK_START * 60 && t < WORK_END * 60) out.push(toTime(t));
  }
  return out;
}

function fmtDuration(min) {
  const m = Math.max(0, Number(min) || 0);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? `${h}h${mm ? ` ${mm}m` : ""}` : `${mm}m`;
}

async function notifyTelegram(text) {
  if (process.env.NODE_ENV !== "production") return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text }),
    });
  } catch {}
}

export async function POST(req) {
  try {
    const adminKey = (req.headers.get("x-admin-key") || "").trim();
    const isAdmin = !!adminKey && adminKey === process.env.ADMIN_KEY;
    if (!isAdmin) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401, headers: noCache }
      );
    }

    const body = await req.json().catch(() => ({}));
    const date = body?.date;
    const time = body?.time;
    if (!date || !time) {
      return NextResponse.json(
        { error: "date & time required" },
        { status: 400, headers: noCache }
      );
    }

    const store = getStore({ name: "bookings" });
    const day = (await store.get(date, { type: "json" })) || {
      blocked: [],
      bookings: [],
    };

    // шукаємо бронювання на цей час
    const idx = (day.bookings || []).findIndex((b) => b.time === time);
    if (idx === -1) {
      return NextResponse.json(
        { error: "booking not found" },
        { status: 404, headers: noCache }
      );
    }

    // видаляємо бронювання
    const removed = day.bookings.splice(idx, 1)[0];

    // РОЗБЛОКУВАННЯ: використовуємо фактичну тривалість бронювання
    const span = rangeTimes(time, removed?.durationMin ?? SERVICE_DURATION);
    day.blocked = (day.blocked || []).filter((t) => !span.includes(t));

    await store.set(date, JSON.stringify(day));

    // сповіщення з деталями послуги і тривалістю
    await notifyTelegram(
      `❌ BOOKING CANCELED by admin` +
        `\nDate: ${date}` +
        `\nTime: ${time} (${fmtDuration(removed?.durationMin ?? SERVICE_DURATION)})` +
        (removed?.serviceTitle ? `\nService: ${removed.serviceTitle}` : "") +
        (removed?.price ? `\nPrice: ${removed.price}` : "") +
        `\nName: ${removed?.name || ""}` +
        `\nPhone: ${removed?.phone || ""}`
    );

    return NextResponse.json({ ok: true }, { status: 200, headers: noCache });
  } catch {
    return NextResponse.json(
      { error: "server error" },
      { status: 500, headers: noCache }
    );
  }
}
