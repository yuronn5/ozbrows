// app/api/availability/route.ts
import { NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";
import "../globals.css";

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

const noCache: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "x-admin-key",
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    if (!date) {
      return NextResponse.json(
        { error: "date required" },
        { status: 400, headers: noCache }
      );
    }

    const adminKey = (req.headers.get("x-admin-key") || "").trim();
    const isAdmin = !!adminKey && adminKey === process.env.ADMIN_KEY;

    const store = getStore({ name: "bookings" });
    const raw = await store.get(date, { type: "json" as const });
    const day: DayData = (raw as DayData | null) ?? {
      blocked: [],
      bookings: [],
    };

    // якщо не адмін — повертаємо тільки time + durationMin (для коректного блокування на клієнті)
    const safeBookings: Booking[] = isAdmin
      ? day.bookings ?? []
      : (day.bookings ?? []).map((b) => ({
          time: b.time,
          name: "Зайнято",
          durationMin: b.durationMin ?? 45,
        }));

    return new NextResponse(
      JSON.stringify({ blocked: day.blocked ?? [], bookings: safeBookings }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...noCache },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "server error" },
      { status: 500, headers: noCache }
    );
  }
}
