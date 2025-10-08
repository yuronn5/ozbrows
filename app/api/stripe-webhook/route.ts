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
  const blocked = (val.blocked as unknown[]).filter((t): t is string => typeof t === "string");
  const bookings = (val.bookings as unknown[])
    .filter((b): b is Record<string, unknown> => typeof b === "object" && b !== null)
    .map((b) => {
      const br = b as Record<string, unknown>;
      return {
        id: typeof br.id === "string" ? (br.id as string) : "",
        createdAt: typeof br.createdAt === "number" ? (br.createdAt as number) : 0,
        time: typeof br.time === "string" ? (br.time as string) : "",
        name: typeof br.name === "string" ? (br.name as string) : "",
        phone: typeof br.phone === "string" ? (br.phone as string) : undefined,
        paid: typeof br.paid === "boolean" ? (br.paid as boolean) : false,
        paymentId: typeof br.paymentId === "string" ? (br.paymentId as string) : null,
        durationMin: typeof br.durationMin === "number" ? (br.durationMin as number) : undefined,
        serviceTitle: typeof br.serviceTitle === "string" ? (br.serviceTitle as string) : undefined,
        price: typeof br.price === "string" ? (br.price as string) : undefined,
      } satisfies Booking;
    });
  return { blocked, bookings };
}

async function markPaid(
  date: string,
  {
    bookingId,
    paymentId,
    time,
    name,
    phone,
  }: { bookingId?: string; paymentId?: string | null; time?: string; name?: string; phone?: string }
) {
  if (!date) return false;

  const store = getStore({ name: "bookings" });
  const rawDay = await store.get(date, { type: "json" as const });
  const day: DayData = coerceToDayData(rawDay);

  let idx = -1;

  if (bookingId) {
    idx = day.bookings.findIndex((b) => b.id === bookingId);
  }

  if (idx === -1 && paymentId) {
    idx = day.bookings.findIndex((b) => b.paymentId === paymentId);
  }

  if (idx === -1 && time) {
    const norm = (s?: string) => (s || "").replace(/\s+/g, "").toLowerCase();
    const nPhone = norm(phone);
    const nName = norm(name);
    idx = day.bookings.findIndex(
      (b) =>
        b.time === time &&
        (nPhone ? norm(b.phone) === nPhone : false || (nName ? norm(b.name) === nName : false))
    );
  }

  if (idx === -1) return false;

  if (day.bookings[idx].paid && (!paymentId || day.bookings[idx].paymentId === paymentId)) {
    return true;
  }

  day.bookings[idx].paid = true;
  if (paymentId) day.bookings[idx].paymentId = paymentId;

  await store.set(date, JSON.stringify(day));
  return true;
}

async function extractSessionMeta(session: Stripe.Checkout.Session) {
  let meta = session.metadata ?? {};
  if ((!meta || !meta.bookingId) && session.payment_intent) {
    const pi =
      typeof session.payment_intent === "string"
        ? await stripe.paymentIntents.retrieve(session.payment_intent)
        : (session.payment_intent as Stripe.PaymentIntent);
    meta = pi.metadata ?? meta;
  }
  const paymentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  return {
    bookingId: meta?.bookingId,
    date: meta?.date,
    time: meta?.time,
    name: meta?.name,
    phone: meta?.phone,
    paymentId,
  } as {
    bookingId?: string;
    date?: string;
    time?: string;
    name?: string;
    phone?: string;
    paymentId: string | null;
  };
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "no signature" }, { status: 400, headers: noCache });
  }

  const raw = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400, headers: noCache });
  }

  try {
    let handled = false;

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { bookingId, date, time, name, phone, paymentId } = await extractSessionMeta(session);

      if (date) {
        handled = await markPaid(date, { bookingId, paymentId, time, name, phone });
        if (handled) {
          await notifyTelegram(
            `💳 PAYMENT RECORDED\nDate: ${date}\nTime: ${time ?? "—"}\nName: ${name ?? "—"}\nPhone: ${
              phone ?? "—"
            }\nPayment: ${paymentId ?? "—"}`
          );
        }
      }
    }

    if (!handled && event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const meta = pi.metadata ?? {};
      const bookingId = meta.bookingId as string | undefined;
      const date = meta.date as string | undefined;
      const time = meta.time as string | undefined;
      const name = meta.name as string | undefined;
      const phone = meta.phone as string | undefined;
      const paymentId = pi.id;

      if (date) {
        handled = await markPaid(date, { bookingId, paymentId, time, name, phone });
        if (handled) {
          await notifyTelegram(
            `💳 PAYMENT RECORDED (PI)\nDate: ${date}\nTime: ${time ?? "—"}\nName: ${name ?? "—"}\nPhone: ${
              phone ?? "—"
            }\nPayment: ${paymentId}`
          );
        }
      }
    }

    // (не обов’язково) лог фейлів
    if (event.type === "checkout.session.async_payment_failed" || event.type === "payment_intent.payment_failed") {
      const desc =
        event.type === "payment_intent.payment_failed"
          ? (event.data.object as Stripe.PaymentIntent).last_payment_error?.message ?? "—"
          : "async payment failed";
      console.warn("Payment failed:", desc);
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: noCache });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server error" }, { status: 500, headers: noCache });
  }
}
