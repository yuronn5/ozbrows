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

    const amount = Number(process.env.DEPOSIT_AMOUNT_CENTS || 0);
    const currency = (process.env.DEPOSIT_CURRENCY || "usd").toLowerCase();
    if (!amount || !Number.isFinite(amount)) {
      return NextResponse.json({ error: "invalid deposit amount" }, { status: 500, headers: noCache });
    }

    const origin = new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: body.bookingId,
      metadata: {
        bookingId: body.bookingId,
        date: body.date,
        time: body.time,
        name: body.name || "",
        phone: body.phone || "",
        serviceTitle: body.serviceTitle || "",
        price: body.price || "",
      },
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: "Non-refundable deposit",
              description: `${body.serviceTitle || "Service"} — ${body.date} ${body.time}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/booking?paid=1`,
      cancel_url: `${origin}/booking?cancelled=1`,
    });

    return NextResponse.json({ url: session.url }, { status: 200, headers: noCache });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server error" }, { status: 500, headers: noCache });
  }
}
