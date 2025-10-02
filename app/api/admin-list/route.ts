// app/api/admin-list/route.ts
import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";

const noCache = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "x-admin-key",
};

const STEP = 15;
const HOLD_TTL_MIN = 20;

/* ========= Types ========= */
type Booking = {
  id?: string;
  createdAt?: number;
  time: string;
  name: string;
  phone: string;
  paid: boolean;
  paymentId: string;
  durationMin: number;
  serviceTitle: string;
  price: string;
};

type DayData = {
  blocked: string[];
  bookings: Booking[];
};

type Row = {
  date: string;
  time: string;
  name: string;
  phone: string;
  paid: boolean;
  paymentId: string;
  serviceTitle: string;
  price: string;
  durationMin: number;
  isBlock: boolean;
};

type ListPage = { blobs: Array<{ key: string }> };

/* ========= Type guards & coercers ========= */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isListPage(v: unknown): v is ListPage {
  return (
    isRecord(v) &&
    Array.isArray((v as Record<string, unknown>).blobs) &&
    ((v as Record<string, unknown>).blobs as unknown[]).every(
      (b) => isRecord(b) && typeof (b as Record<string, unknown>).key === "string"
    )
  );
}
function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function asBoolean(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function coerceBooking(raw: unknown): Booking | null {
  if (!isRecord(raw)) return null;
  const time = asString(raw.time);
  if (!/^\d{2}:\d{2}$/.test(time)) return null;

  return {
    id: asString(raw.id, ""),
    createdAt: asNumber(raw.createdAt, 0),
    time,
    name: asString(raw.name, ""),
    phone: asString(raw.phone, ""),
    paid: asBoolean(raw.paid, false),
    paymentId: asString(raw.paymentId, ""),
    durationMin: asNumber(raw.durationMin, 45) || 45,
    serviceTitle: asString(raw.serviceTitle, ""),
    price: asString(raw.price, ""),
  };
}

function coerceDayData(raw: unknown): DayData {
  if (!isRecord(raw)) return { blocked: [], bookings: [] };

  const blocked = Array.isArray(raw.blocked)
    ? raw.blocked.filter((t): t is string => typeof t === "string")
    : [];

  const bookings: Booking[] = Array.isArray(raw.bookings)
    ? raw.bookings
        .map(coerceBooking)
        .filter((b): b is Booking => b !== null)
    : [];

  return { blocked, bookings };
}

/* ========= Helpers ========= */
function isDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function spanTimes(startStr: string, durationMin: number, step = STEP): string[] {
  const start = parseTime(startStr);
  const end = start + Math.max(0, Number(durationMin) || 0);
  const out: string[] = [startStr];
  for (let t = Math.ceil(start / step) * step; t < end; t += step) {
    out.push(minutesToTime(t));
  }
  return out;
}
function consolidateBlocked(points: string[], step = STEP): Array<{ time: string; durationMin: number }> {
  const arr = Array.from(new Set(points)).sort((a, b) => parseTime(a) - parseTime(b));
  const blocks: Array<{ time: string; durationMin: number }> = [];
  let i = 0;
  while (i < arr.length) {
    const startStr = arr[i];
    let count = 1;
    let prev = parseTime(startStr);
    i++;
    while (i < arr.length && parseTime(arr[i]) - prev === step) {
      count++;
      prev = parseTime(arr[i]);
      i++;
    }
    blocks.push({ time: startStr, durationMin: count * step });
  }
  return blocks;
}

/* ========= Handler ========= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start") ?? "";
    const end = searchParams.get("end") ?? "";

    const adminKey = (req.headers.get("x-admin-key") || "").trim();
    const isAdmin = !!adminKey && adminKey === process.env.ADMIN_KEY;
    if (!isAdmin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noCache });
    }

    if (!start || !end || !isDateStr(start) || !isDateStr(end)) {
      return NextResponse.json(
        { error: "start & end (YYYY-MM-DD) required" },
        { status: 400, headers: noCache }
      );
    }

    const store = getStore({ name: "bookings" });
    const rows: Row[] = [];

    // ✅ Правильна пагінація без cursor
    for await (const page of store.list({ paginate: true })) {
      if (!isListPage(page)) continue;

      for (const item of page.blobs) {
        const key = item.key;
        if (!isDateStr(key)) continue;
        if (key < start || key > end) continue;

        const rawDay = await store.get(key, { type: "json" as const });
        const day = coerceDayData(rawDay);

        // TTL cleanup for holds (збережемо зміни, якщо були)
        let changed = false;
        if (HOLD_TTL_MIN > 0) {
          const cutoff = Date.now() - HOLD_TTL_MIN * 60 * 1000;
          const before = day.bookings.length;
          day.bookings = day.bookings.filter((b) => b.paid || (b.createdAt ?? 0) > cutoff);
          if (day.bookings.length !== before) changed = true;
        }
        if (changed) {
          await store.set(key, JSON.stringify(day));
        }

        // додати бронювання
        for (const b of day.bookings) {
          rows.push({
            date: key,
            time: b.time,
            name: b.name,
            phone: b.phone,
            paid: b.paid,
            paymentId: b.paymentId,
            serviceTitle: b.serviceTitle,
            price: b.price,
            durationMin: b.durationMin,
            isBlock: false,
          });
        }

        // додати блоки (без слотів, що перекривають чинні броні)
        const blockedSet = new Set(day.blocked);
        for (const b of day.bookings) {
          const pts = spanTimes(b.time, b.durationMin);
          pts.forEach((t) => blockedSet.delete(t));
        }
        const blocks = consolidateBlocked(Array.from(blockedSet));
        for (const blk of blocks) {
          rows.push({
            date: key,
            time: blk.time,
            name: "",
            phone: "",
            paid: false,
            paymentId: "",
            serviceTitle: "",
            price: "",
            durationMin: blk.durationMin,
            isBlock: true,
          });
        }
      }
    }

    rows.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    return new NextResponse(JSON.stringify({ rows }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...noCache },
    });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500, headers: noCache });
  }
}
