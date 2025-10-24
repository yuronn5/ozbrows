// app/thank-you/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LastBooking = {
  bookingId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  serviceTitle?: string;
  price?: string;
};

export default function ThankYouPage() {
  const [info, setInfo] = useState<LastBooking | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lastBooking");
      if (raw) {
        const data = JSON.parse(raw) as LastBooking;
        setInfo(data);
      }
      // чистимо, щоб не пропонувати повторну оплату
      localStorage.removeItem("lastBooking");
    } catch {}
  }, []);

  return (
    <main className="container" style={{ padding: "36px 0 60px" }}>
      <div
        className="card"
        style={{
          maxWidth: 780,
          margin: "0 auto",
          padding: 22,
          borderRadius: 16,
          background: "rgba(255,255,255,0.66)",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 10px 30px rgba(70,50,30,0.1)",
        }}
      >
        <h1 className="display" style={{ marginTop: 0 }}>
          Thank you! 🎉
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Your payment was successful and your booking is confirmed.
        </p>

        {info ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 10,
              padding: 16,
              borderRadius: 14,
              background: "rgba(255,255,255,0.55)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <Row label="Date" value={info.date} />
            <Row label="Time" value={info.time} />
            {info.serviceTitle && (
              <Row
                label="Service"
                value={
                  info.price ? `${info.serviceTitle} • ${info.price}` : info.serviceTitle
                }
              />
            )}
            <Row label="Name" value={info.name} />
            <Row label="Phone" value={info.phone} />
            <Row label="Booking ID" value={info.bookingId} mono />
          </div>
        ) : (
          <p style={{ marginTop: 12 }}>We have received your payment.</p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Link href="/" className="btn primary">Back to Home</Link>
          <Link href="/booking" className="btn">New booking</Link>
        </div>

        
      </div>
    </main>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
      <strong style={{ minWidth: 110 }}>{label}:</strong>
      <span style={{ fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined }}>
        {value}
      </span>
    </div>
  );
}
