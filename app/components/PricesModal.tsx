"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export type Service = {
  id: string; // те, що піде в query (?service=shaping)
  title: string; // назва в UI
  price: string; // ціна в UI
};

export default function PricesModal({
  open,
  onClose,
  onSelect,
  services,
  headline = "Prices & Services",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (service: Service) => void;
  services: Service[];
  headline?: string;
}) {
  // lock scroll + ESC
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.25)",
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        role="document"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(680px, 100%)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.86))",
          backdropFilter: "saturate(140%) blur(12px)",
          border: "1px solid rgba(0,0,0,.06)",
          borderRadius: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,.25)",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(0,0,0,.06)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 22 }}>{headline}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              appearance: "none",
              border: 0,
              background: "transparent",
              fontSize: 26,
              lineHeight: 1,
              cursor: "pointer",
              padding: 6,
            }}
          >
            ×
          </button>
        </div>

        {/* body */}
        <div style={{ padding: 16, display: "grid", gap: 10 }}>
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              style={{
                textAlign: "left",
                border: "1px solid rgba(0,0,0,.06)",
                background: "rgba(255,255,255,.75)",
                borderRadius: 14,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 6px 16px rgba(0,0,0,.06)",
                cursor: "pointer",
              }}
            >
              <span style={{ fontWeight: 600 }}>{s.title}</span>
              <span style={{ fontWeight: 700, color: "#6e4b3a" }}>
                {s.price}
              </span>
            </button>
          ))}
        </div>

        {/* footer */}
        <div
          style={{
            padding: 14,
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            borderTop: "1px solid rgba(0,0,0,.06)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px dashed rgba(0,0,0,.2)",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
