import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { notifyTelegram } from "../../../lib/notify";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Booking = {
  id: string;
  createdAt: number;
  time: string;
  name: string;
  phone?: string;
  paid?: boolean;
  paymentId?: string | null;
  durationMin?: number;
  serviceTitle?: string;
  price?: string;
};

type DayData = { blocked: string[]; bookings: Booking[] };

const WORK_START = 8, WORK_END = 20;
const SLOT_MINUTES = 15, SERVICE_DURATION = 45;
const HOLD_TTL_MIN = 20;

const noCache: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// ---- utils ----
function parseTime(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function toTime(min: number) { const h = Math.floor(min / 60), m = min % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }
function rangeTimes(startStr: string, dur = SERVICE_DURATION, step = SLOT_MINUTES) {
  const start = parseTime(startStr);
  const end = Math.min(start + dur, WORK_END * 60);
  const out: string[] = [];
  if (start >= WORK_START * 60 && start < WORK_END * 60) out.push(startStr);
  for (let t = Math.ceil(start / step) * step; t < end; t += step)
    if (t >= WORK_START * 60 && t < WORK_END * 60) out.push(toTime(t));
  return out;
}
function inferBlockedDuration(blocked: string[] = [], startStr: string, step = SLOT_MINUTES) {
  const set = new Set(blocked); let dur = 0; let t = parseTime(startStr);
  while (set.has(toTime(t))) { dur += step; t += step; }
  return dur;
}
function isStartWithinWorkingHours(startStr: string, durationMin = SERVICE_DURATION) {
  const start = parseTime(startStr); const dayStart = WORK_START * 60; const dayEnd = WORK_END * 60;
  return start >= dayStart && start + durationMin <= dayEnd;
}
function pruneUnpaid(day: DayData) {
  if (!HOLD_TTL_MIN) return 0;
  const cutoff = Date.now() - HOLD_TTL_MIN * 60 * 1000;
  const before = day.bookings?.length ?? 0;
  day.bookings = (day.bookings ?? []).filter((b) => b.paid || (b.createdAt ?? 0) > cutoff);
  return before - day.bookings.length;
}

// SECURITY: auth вимкнено на запит користувача (адмін дії без пароля)
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      date?: string; time?: string; name?: string; phone?: string;
      action?: "admin-block" | "block-day" | "unblock-day" | "admin-unblock";
      durationMin?: number; serviceTitle?: string; price?: string;
    } | null;

    const date = body?.date?.trim();
    if (!date) return NextResponse.json({ error: "date required" }, { status: 400, headers: noCache });

    const store = getStore({ name: "bookings" });
    const raw = await store.get(date, { type: "json" as const });
    const day: DayData = (raw as DayData | null) ?? { blocked: [], bookings: [] };
    const setDay = async (obj: DayData) => { await store.set(date, JSON.stringify(obj)); };

    pruneUnpaid(day);

    const action = body?.action;

    // ==== ADMIN: block/unblock whole day ====
    if (action === "block-day") {
      const all: string[] = [];
      for (let h = WORK_START; h < WORK_END; h++)
        for (let m = 0; m < 60; m += SLOT_MINUTES)
          all.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      day.blocked = Array.from(new Set([...(day.blocked ?? []), ...all])).sort();
      await setDay(day);
      await notifyTelegram(`⛔️ Day blocked by admin\nDate: ${date}`);
      return NextResponse.json({ ok: true }, { status: 200, headers: noCache });
    }

    if (action === "unblock-day") {
      day.blocked = [];
      day.bookings = [];
      await setDay(day);
      await notifyTelegram(`✅ Day unblocked by admin\nDate: ${date}`);
      return NextResponse.json({ ok: true }, { status: 200, headers: noCache });
    }

    const time = body?.time?.trim();
    if (!time) return NextResponse.json({ error: "time required" }, { status: 400, headers: noCache });

    const durationMin = Math.max(5, Math.min(8 * 60, Number(body?.durationMin ?? SERVICE_DURATION)));
    if (!isStartWithinWorkingHours(time, durationMin))
      return NextResponse.json({ error: "outside working hours" }, { status: 400, headers: noCache });

    const span = rangeTimes(time, durationMin);
    const occupied = new Set<string>([
      ...(day.blocked ?? []),
      ...(day.bookings ?? []).flatMap((b) => rangeTimes(b.time, b.durationMin ?? SERVICE_DURATION)),
    ]);
    const conflict = span.some((t) => occupied.has(t));

    // ==== ADMIN: block/unblock interval ====
    if (action === "admin-block") {
      if (conflict) return NextResponse.json({ error: "conflict" }, { status: 409, headers: noCache });
      day.blocked = Array.from(new Set([...(day.blocked ?? []), ...span])).sort();
      await setDay(day);
      await notifyTelegram(`⛔️ Interval blocked by admin\nDate: ${date}\nStart: ${time} (${durationMin} minutes)`);
      return NextResponse.json({ ok: true }, { status: 200, headers: noCache });
    }
    if (action === "admin-unblock") {
      const durFromBody = Number(body?.durationMin) || 0;
      const inferred = inferBlockedDuration(day.blocked ?? [], time);
      const effectiveDur = Math.max(SLOT_MINUTES, durFromBody || inferred || SLOT_MINUTES);
      const spanToRemove = rangeTimes(time, effectiveDur);
      day.blocked = (day.blocked ?? []).filter((t) => !spanToRemove.includes(t));
      await setDay(day);
      await notifyTelegram(`✅ Interval unblocked by admin\nDate: ${date}\nStart: ${time} (${effectiveDur} minutes)`);
      return NextResponse.json({ ok: true }, { status: 200, headers: noCache });
    }

    // ==== CLIENT booking hold ====
    if (conflict) return NextResponse.json({ error: "conflict" }, { status: 409, headers: noCache });

    const name = body?.name?.trim();
    const phone = body?.phone?.trim();
    if (!name || !phone) return NextResponse.json({ error: "name & phone required" }, { status: 400, headers: noCache });

    const booking: Booking = {
      id: randomUUID(),
      createdAt: Date.now(),
      time,
      name,
      phone,
      paid: false,
      paymentId: null,
      durationMin,
      serviceTitle: body?.serviceTitle,
      price: body?.price,
    };

    day.bookings = [...(day.bookings ?? []), booking];
    await setDay(day);

    await notifyTelegram(
      `🔔 NEW BOOKING (hold)\nDate: ${date}\nTime: ${time} (${durationMin}m)\nService: ${body?.serviceTitle ?? "—"}\nPrice: ${body?.price ?? "—"}\nName: ${name}\nPhone: ${phone}`
    );

    return NextResponse.json({ ok: true, bookingId: booking.id }, { status: 200, headers: noCache });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server error" }, { status: 500, headers: noCache });
  }
}
