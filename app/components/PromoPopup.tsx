"use client";

import { useEffect, useState } from "react";

const KEY = "ozbrows:promo:v1:dismissed";

const COOKIE_MAX_DAYS = 400;

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : "";
}
function setCookie(name: string, value: string, days = COOKIE_MAX_DAYS) {
  if (typeof document === "undefined") return;
  const exp = new Date();
  exp.setDate(exp.getDate() + days);
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${name}=${encodeURIComponent(value)};` +
    `Max-Age=${days * 86400}; ` +
    `expires=${exp.toUTCString()}; path=/; SameSite=Lax` +
    secure;
}

export default function PromoPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lsDismissed =
      typeof window !== "undefined" && localStorage.getItem(KEY) === "1";
    const cookieDismissed = getCookie(KEY) === "1";

    if (lsDismissed || cookieDismissed) {
      try {
        localStorage.setItem(KEY, "1");
      } catch {}
      setCookie(KEY, "1", COOKIE_MAX_DAYS);
      return;
    }

    const t = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const persistDismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setCookie(KEY, "1", COOKIE_MAX_DAYS);
  };
  const handleClose = () => {
    persistDismiss();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="promoBackdrop" onClick={handleClose} aria-hidden="false">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-title"
        className="promoCard"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="promoClose" onClick={handleClose} aria-label="Close">
          ×
        </button>

        <div className="promoBadge">Welcome</div>
        <h3 id="promo-title" className="promoTitle">
          –20% off your first service
        </h3>
        <p className="promoText">
          New clients only. Limited-time offer. Discount applied at booking.
        </p>

        <div className="promoCta">
          <button className="btn primary" onClick={handleClose}>
            Claim discount
          </button>
        </div>
      </div>

      <style jsx>{`
        .promoBackdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(2px);
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .promoCard {
          width: min(92vw, 420px);
          background: #fff;
          border-radius: 18px;
          padding: 22px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
          position: relative;
          text-align: center;
        }
        .promoClose {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 40px;
          height: 40px;
          border: 0;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.06);
          cursor: pointer;
          font-size: 22px;
        }
        .promoBadge {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f6efe9;
          color: #6e4b3a;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .promoTitle {
          margin: 6px 0 8px;
        }
        .promoText {
          color: #555;
          margin: 0 0 16px;
          line-height: 1.4;
        }
        .promoCta {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
