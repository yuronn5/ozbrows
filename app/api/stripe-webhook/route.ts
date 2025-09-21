// app/api/stripe-webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStore } from "@netlify/blobs";
import { notifyTelegram } from "../../../lib/notify";

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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const noCache: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function isDayData(val: unknown): val is DayData {
  if (typeof val !== "object" || val === null) return false;
  const v = val as { blocked?: unknown; bookings?: unknown };
  return Array.isArray(v.blocked) && Array.isArray(v.bookings);
}

function coerceToDayData(val: unknown): DayData {
  if (!isDayData(val)) return { blocked: [], bookings: [] };

  const blocked = (val.blocked as unknown[]).filter(
    (t): t is string => typeof t === "string"
  );

  const bookings = (val.bookings as unknown[])
    .filter((b): b is Record<string, unknown> => typeof b === "object" && b !== null)
    .map((b) => {
      const br = b as Record<string, unknown>;
      const paymentIntent =
        typeof br.paymentId === "string" ? (br.paymentId as string) : null;

      return {
        id: typeof br.id === "string" ? (br.id as string) : "",
        createdAt:
          typeof br.createdAt === "number" ? (br.createdAt as number) : 0,
        time: typeof br.time === "string" ? (br.time as string) : "",
        name: typeof br.name === "string" ? (br.name as string) : "",
        phone: typeof br.phone === "string" ? (br.phone as string) : undefined,
        paid: typeof br.paid === "boolean" ? (br.paid as boolean) : false,
        paymentId: paymentIntent,
        durationMin:
          typeof br.durationMin === "number" ? (br.durationMin as number) : undefined,
        serviceTitle:
          typeof br.serviceTitle === "string" ? (br.serviceTitle as string) : undefined,
        price: typeof br.price === "string" ? (br.price as string) : undefined,
      } satisfies Booking;
    });

  return { blocked, bookings };
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig)
    return NextResponse.json(
      { error: "no signature" },
      { status: 400, headers: noCache }
    );

  const raw = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      raw,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return NextResponse.json(
      { error: "invalid signature" },
      { status: 400, headers: noCache }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const paymentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      const bookingId = session.metadata?.bookingId ?? "";
      const date = session.metadata?.date ?? "";
      const time = session.metadata?.time ?? "";
      const name = session.metadata?.name ?? "";
      const phone = session.metadata?.phone ?? "";

      if (bookingId && date) {
        const store = getStore({ name: "bookings" });
        const rawDay = await store.get(date, { type: "json" as const });
        const day: DayData = coerceToDayData(rawDay);

        const idx = day.bookings.findIndex((b) => b.id === bookingId);
        if (idx >= 0) {
          day.bookings[idx].paid = true;
          day.bookings[idx].paymentId = paymentId;
          await store.set(date, JSON.stringify(day));
          await notifyTelegram(
            `💳 DEPOSIT PAID\nDate: ${date}\nTime: ${time}\nName: ${name}\nPhone: ${phone}\nPayment: ${paymentId}`
          );
        } else {
          console.warn("booking not found for webhook", { bookingId, date });
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: noCache });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "server error" },
      { status: 500, headers: noCache }
    );
  }
}
