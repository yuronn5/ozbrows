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

/* ---------------- helpers ---------------- */

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
        id: typeof br.id === "string" ? br.id : "",
        createdAt: typeof br.createdAt === "number" ? br.createdAt : 0,
        time: typeof br.time === "string" ? br.time : "",
        name: typeof br.name === "string" ? br.name : "",
        phone: typeof br.phone === "string" ? br.phone : undefined,
        paid: typeof br.paid === "boolean" ? br.paid : false,
        paymentId: typeof br.paymentId === "string" ? br.paymentId : null,
        durationMin: typeof br.durationMin === "number" ? br.durationMin : undefined,
        serviceTitle: typeof br.serviceTitle === "string" ? br.serviceTitle : undefined,
        price: typeof br.price === "string" ? br.price : undefined,
      } satisfies Booking;
    });
  return { blocked, bookings };
}

type Meta = {
  bookingId?: string;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
};

function pickMeta(m: Stripe.Metadata | null | undefined): Meta {
  const get = (k: keyof Meta): string | undefined => {
    const v = m?.[String(k)];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };
  return {
    bookingId: get("bookingId"),
    date: get("date"),
    time: get("time"),
    name: get("name"),
    phone: get("phone"),
  };
}

async function markPaid(
  date: string,
  opts: { bookingId?: string; paymentId?: string | null; time?: string; name?: string; phone?: string }
): Promise<boolean> {
  if (!date) return false;

  const store = getStore({ name: "bookings" });
  const rawDay = await store.get(date, { type: "json" as const });
  const day: DayData = coerceToDayData(rawDay);

  let idx = -1;

  if (opts.bookingId) {
    idx = day.bookings.findIndex((b) => b.id === opts.bookingId);
  }
  if (idx === -1 && opts.paymentId) {
    idx = day.bookings.findIndex((b) => b.paymentId === opts.paymentId);
  }
  if (idx === -1 && opts.time) {
    const norm = (s?: string) => (s || "").replace(/\s+/g, "").toLowerCase();
    const nPhone = norm(opts.phone);
    const nName = norm(opts.name);
    idx = day.bookings.findIndex(
      (b) => b.time === opts.time && ((nPhone && norm(b.phone) === nPhone) || (nName && norm(b.name) === nName))
    );
  }

  if (idx === -1) return false;
  if (day.bookings[idx].paid && (!opts.paymentId || day.bookings[idx].paymentId === opts.paymentId)) {
    return true; // вже відмічено — idempotent
  }

  day.bookings[idx].paid = true;
  if (opts.paymentId) day.bookings[idx].paymentId = opts.paymentId;

  await store.set(date, JSON.stringify(day));
  return true;
}

async function extractSessionMeta(session: Stripe.Checkout.Session) {
  // 1) метадані на самій сесії
  let metaObj: Stripe.Metadata | null | undefined = session.metadata;

  // 2) якщо нема bookingId — пробуємо витягнути з PaymentIntent
  if (!pickMeta(metaObj).bookingId && session.payment_intent) {
    const pi =
      typeof session.payment_intent === "string"
        ? await stripe.paymentIntents.retrieve(session.payment_intent)
        : (session.payment_intent as Stripe.PaymentIntent);
    metaObj = pi.metadata ?? metaObj;
  }

  const meta = pickMeta(metaObj);

  const paymentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  return {
    ...meta,
    paymentId,
  } as Meta & { paymentId: string | null };
}

/* ---------------- GET (reconcile from thank-you) ---------------- */

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("cs") || searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "session_id required" }, { status: 400, headers: noCache });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    if (session.payment_status !== "paid") {
      return NextResponse.json({ ok: false, paid: false }, { status: 200, headers: noCache });
    }

    const { bookingId, date, time, name, phone, paymentId } = await extractSessionMeta(session);
    if (!date) {
      return NextResponse.json({ ok: false, reason: "no_date_in_metadata" }, { status: 200, headers: noCache });
    }

    const handled = await markPaid(date, { bookingId, paymentId, time, name, phone });
    if (handled) {
      await notifyTelegram(
        `💳 PAYMENT RECORDED (GET)\nDate: ${date}\nTime: ${time ?? "—"}\nName: ${name ?? "—"}\nPhone: ${
          phone ?? "—"
        }\nPayment: ${paymentId ?? "—"}`
      );
    }

    return NextResponse.json({ ok: handled, paid: true }, { status: 200, headers: noCache });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server error" }, { status: 500, headers: noCache });
  }
}

/* ---------------- POST (Stripe webhooks) ---------------- */

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

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
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
      const meta = pickMeta(pi.metadata);

      const bookingId = meta.bookingId;
      const date = meta.date;
      const time = meta.time;
      const name = meta.name;
      const phone = meta.phone;

      if (date) {
        handled = await markPaid(date, { bookingId, paymentId: pi.id, time, name, phone });
        if (handled) {
          await notifyTelegram(
            `💳 PAYMENT RECORDED (PI)\nDate: ${date}\nTime: ${time ?? "—"}\nName: ${name ?? "—"}\nPhone: ${
              phone ?? "—"
            }\nPayment: ${pi.id}`
          );
        }
      }
    }

    if (
      event.type === "checkout.session.async_payment_failed" ||
      event.type === "payment_intent.payment_failed"
    ) {
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
