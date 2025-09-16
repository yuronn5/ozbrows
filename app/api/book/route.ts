// app/api/book/route.ts
import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import { notifyTelegram } from "../../../lib/notify";

type Booking = {
  time: string;
  name: string;
  phone?: string;
  paid?: boolean;
  paymentId?: string | null;
  /** додано: тривалість бронювання у хвилинах */
  durationMin?: number;
  /** опційно: назва послуги / ціна */
  serviceTitle?: string;
  price?: string;
};

type DayData = {
  blocked: string[];
  bookings: Booking[];
};

const WORK_START = 8,
  WORK_END = 20; // години (08:00–20:00)
const SLOT_MINUTES = 15,
  SERVICE_DURATION = 45;

const noCache: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "x-admin-key",
};

// ---- utils ----
function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function toTime(min: number): string {
  const h = Math.floor(min / 60),
    m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
/** Повертає усі 15-хв точки в діапазоні тривалості від старту */
function rangeTimes(
  startStr: string,
  dur = SERVICE_DURATION,
  step = SLOT_MINUTES
): string[] {
  const start = parseTime(startStr);
  const end = Math.min(start + dur, WORK_END * 60);
  const out: string[] = [];
  if (start >= WORK_START * 60 && start < WORK_END * 60) out.push(startStr);
  for (let t = Math.ceil(start / step) * step; t < end; t += step) {
    if (t >= WORK_START * 60 && t < WORK_END * 60) out.push(toTime(t));
  }
  return out;
}
/** Чи старт у робочих годинах з урахуванням тривалості */
function isStartWithinWorkingHours(
  startStr: string,
  durationMin = SERVICE_DURATION
): boolean {
  const start = parseTime(startStr);
  const dayStart = WORK_START * 60;
  const dayEnd = WORK_END * 60;
  // старт не раніше відкриття і не так пізно, щоб виходити за межу закриття
  return start >= dayStart && start + durationMin <= dayEnd;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      date?: string;
      time?: string;
      name?: string;
      phone?: string;
      action?: string;
      /** нові поля від клієнта */
      durationMin?: number;
      serviceTitle?: string;
      price?: string;
    } | null;

    const date = body?.date?.trim();
    if (!date) {
      return NextResponse.json(
        { error: "date required" },
        { status: 400, headers: noCache }
      );
    }

    const store = getStore({ name: "bookings" });
    const raw = await store.get(date, { type: "json" as const });
    const day: DayData = (raw as DayData | null) ?? {
      blocked: [],
      bookings: [],
    };
    const setDay = async (obj: DayData) => {
      await store.set(date, JSON.stringify(obj));
    };

    const adminKey = (req.headers.get("x-admin-key") || "").trim();
    const isAdmin = !!adminKey && adminKey === process.env.ADMIN_KEY;

    const action = body?.action;

    // ==== ADMIN: block/unblock whole day ====
    if (action === "block-day" && isAdmin) {
      const all: string[] = [];
      for (let h = WORK_START; h < WORK_END; h++) {
        for (let m = 0; m < 60; m += SLOT_MINUTES) {
          all.push(
            `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
          );
        }
      }
      day.blocked = Array.from(
        new Set([...(day.blocked ?? []), ...all])
      ).sort();
      await setDay(day);
      await notifyTelegram(`⛔️ Day blocked by admin\nDate: ${date}`);
      return NextResponse.json({ ok: true }, { status: 200, headers: noCache });
    }

    if (action === "unblock-day" && isAdmin) {
      day.blocked = [];
      day.bookings = [];
      await setDay(day);
      await notifyTelegram(`✅ Day unblocked by admin\nDate: ${date}`);
      return NextResponse.json({ ok: true }, { status: 200, headers: noCache });
    }

    const time = body?.time?.trim();
    if (!time) {
      return NextResponse.json(
        { error: "time required" },
        { status: 400, headers: noCache }
      );
    }

    // читаємо тривалість із тіла запиту (з дефолтом і межами)
    const durationMin = Math.max(
      5,
      Math.min(8 * 60, Number(body?.durationMin ?? SERVICE_DURATION))
    );

    // ❗ Перевірка робочих годин з урахуванням тривалості послуги
    if (!isStartWithinWorkingHours(time, durationMin)) {
      return NextResponse.json(
        { error: "outside working hours" },
        { status: 400, headers: noCache }
      );
    }

    // check conflicts (існуючі бронювання можуть мати власну тривалість)
    const span = rangeTimes(time, durationMin);
    const occupied = new Set<string>([
      ...(day.blocked ?? []),
      ...(day.bookings ?? []).flatMap((b) =>
        rangeTimes(b.time, b.durationMin ?? SERVICE_DURATION)
      ),
    ]);
    const conflict = span.some((t) => occupied.has(t));
    if (conflict) {
      return NextResponse.json(
        { error: "conflict" },
        { status: 409, headers: noCache }
      );
    }

    // ==== ADMIN: block range ====
    if (isAdmin && action === "admin-block") {
      day.blocked = Array.from(
        new Set([...(day.blocked ?? []), ...span])
      ).sort();
      await setDay(day);
      await notifyTelegram(
        `⛔️ Interval blocked by admin\nDate: ${date}\nStart: ${time} (${durationMin} minutes)`
      );
      return NextResponse.json({ ok: true }, { status: 200, headers: noCache });
    }

    // ==== CLIENT booking ====
    const name = body?.name?.trim();
    const phone = body?.phone?.trim();
    if (!name || !phone) {
      return NextResponse.json(
        { error: "name & phone required" },
        { status: 400, headers: noCache }
      );
    }

    day.bookings = [
      ...(day.bookings ?? []),
      {
        time,
        name,
        phone,
        paid: false,
        paymentId: null,
        durationMin,
        serviceTitle: body?.serviceTitle,
        price: body?.price,
      },
    ];
    day.blocked = Array.from(new Set([...(day.blocked ?? []), ...span])).sort();
    await setDay(day);

    await notifyTelegram(
      `🔔 NEW BOOKING\nDate: ${date}\nTime: ${time} (${durationMin}m)\nService: ${body?.serviceTitle ?? "—"}\nPrice: ${body?.price ?? "—"}\nName: ${name}\nPhone: ${phone}`
    );

    return NextResponse.json({ ok: true }, { status: 200, headers: noCache });
  } catch {
    return NextResponse.json(
      { error: "server error" },
      { status: 500, headers: noCache }
    );
  }
}
