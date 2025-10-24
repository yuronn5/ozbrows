// app/api/stripe-webhook/route.ts
import { getStore } from "@netlify/blobs";
import Stripe from "stripe";
import { notifyTelegram } from "../../../lib/notify";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface Booking {
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
}

interface DayData {
  blocked: string[];
  bookings: Booking[];
}

interface BookingMeta {
  bookingId?: string;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
  serviceTitle?: string;
  price?: string;
  durationMin?: number;
}

interface MarkPaidOptions extends BookingMeta {
  paymentId?: string | null;
}

/* ---------------- helpers ---------------- */

function pickMeta(m: Stripe.Metadata | null | undefined): BookingMeta {
  const get = (k: keyof BookingMeta): string | undefined => {
    const v = m?.[k as string];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };

  const durationRaw = m?.durationMin;
  const durationMin =
    typeof durationRaw === "string" && !isNaN(Number(durationRaw))
      ? Number(durationRaw)
      : 45;

  return {
    bookingId: get("bookingId"),
    date: get("date"),
    time: get("time"),
    name: get("name"),
    phone: get("phone"),
    serviceTitle: get("serviceTitle"),
    price: get("price"),
    durationMin,
  };
}

async function markPaid(date: string, opts: MarkPaidOptions): Promise<boolean> {
  if (!date) return false;

  const store = getStore({ name: "bookings" });
  const rawDay = await store.get(date, { type: "json" as const });
  const day: DayData = (rawDay as DayData | null) ?? { blocked: [], bookings: [] };

  let idx = day.bookings.findIndex((b) => b.id === opts.bookingId);
  if (idx === -1 && opts.paymentId) {
    idx = day.bookings.findIndex((b) => b.paymentId === opts.paymentId);
  }
  if (idx === -1 && opts.time) {
    idx = day.bookings.findIndex(
      (b) =>
        b.time === opts.time &&
        (b.phone === opts.phone || b.name === opts.name)
    );
  }

  // Якщо бронювання не знайдено — додаємо нове
  if (idx === -1) {
    const booking: Booking = {
      id: opts.bookingId || `paid-${opts.paymentId || crypto.randomUUID()}`,
      createdAt: Date.now(),
      time: opts.time ?? "",
      name: opts.name ?? "",
      phone: opts.phone,
      paid: true,
      paymentId: opts.paymentId ?? null,
      durationMin: opts.durationMin ?? 45,
      serviceTitle: opts.serviceTitle,
      price: opts.price,
    };
    day.bookings.push(booking);
    await store.set(date, JSON.stringify(day));
    return true;
  }

  // Якщо знайдено — позначаємо як оплачене
  const existing = day.bookings[idx];
  existing.paid = true;
  if (opts.paymentId) existing.paymentId = opts.paymentId;
  await store.set(date, JSON.stringify(day));
  return true;
}

/* ---------------- handler ---------------- */

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "no signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let handled = false;

  // --- checkout.session.completed ---
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = pickMeta(session.metadata);
    const paymentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    if (meta.date) {
      handled = await markPaid(meta.date, { ...meta, paymentId });
      if (handled) {
        await notifyTelegram(
          `💳 PAYMENT RECORDED\nDate: ${meta.date}\nTime: ${meta.time}\nName: ${meta.name}\nPhone: ${meta.phone}`
        );
      }
    }
  }

  // --- payment_intent.succeeded ---
  if (!handled && event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const meta = pickMeta(pi.metadata);
    if (meta.date) {
      handled = await markPaid(meta.date, { ...meta, paymentId: pi.id });
      if (handled) {
        await notifyTelegram(
          `💳 PAYMENT RECORDED (PI)\nDate: ${meta.date}\nTime: ${meta.time}\nName: ${meta.name}\nPhone: ${meta.phone}`
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
