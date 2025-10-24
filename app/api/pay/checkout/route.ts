// app/api/pay/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noCache: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ---- utils ----
function parseUsdToCents(s?: string): number | null {
  if (!s) return null;
  const m = String(s).match(/\d+(?:\.\d{1,2})?/);
  return m ? Math.round(parseFloat(m[0]) * 100) : null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      date?: string;
      time?: string;
      bookingId?: string;
      name?: string;
      phone?: string;
      serviceTitle?: string;
      price?: string;
    } | null;

    if (!body?.date || !body?.time || !body?.bookingId) {
      return NextResponse.json({ error: "missing fields" }, { status: 400, headers: noCache });
    }

    const depositDefault = Number(process.env.DEPOSIT_AMOUNT_CENTS ?? 2000) || 2000;
    const currency = (process.env.DEPOSIT_CURRENCY || "usd").toLowerCase();

    const fullPriceCents = parseUsdToCents(body.price);
    const isSmallFull = fullPriceCents === 2500 || fullPriceCents === 1500;

    const amount = isSmallFull ? (fullPriceCents as number) : depositDefault;

    const origin = new URL(req.url).origin;

    const meta: Record<string, string> = {
      bookingId: body.bookingId,
      date: body.date,
      time: body.time,
      name: body.name || "",
      phone: body.phone || "",
      serviceTitle: body.serviceTitle || "",
      price: body.price || "",
      amount_cents: String(amount),
      charge_type: isSmallFull ? "full_small_service" : "deposit",
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: body.bookingId,
      metadata: meta,
      payment_intent_data: { metadata: meta },
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: isSmallFull ? "Service payment" : "Non-refundable deposit",
              description: `${body.serviceTitle || "Service"} — ${body.date} ${body.time}`,
            },
          },
          quantity: 1,
        },
      ],
      // success -> thank-you з session id
      success_url: `${origin}/thank-you?cs={CHECKOUT_SESSION_ID}`,
      // cancel -> як було
      cancel_url: `${origin}/booking?cancelled=1`,
    });

    return NextResponse.json({ url: session.url }, { status: 200, headers: noCache });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server error" }, { status: 500, headers: noCache });
  }
}
