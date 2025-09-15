"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export type Service = {
  id: string;
  title: string;
  price: string;
  duration: string;
  category: string;
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

  const categories = Array.from(new Set(services.map((s) => s.category)));

  return createPortal(
    <div className="pm-backdrop" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pm-sheet" role="document" onClick={(e) => e.stopPropagation()}>
        <header className="pm-header">
          <h3 className="pm-title">{headline}</h3>
          <button className="pm-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div className="pm-body">
          {categories.map((cat) => (
            <section className="pm-section" key={cat}>
              <h4 className="pm-cat">{cat}</h4>
              <div className="pm-list">
                {services.filter((s) => s.category === cat).map((s) => (
                  <button key={s.id} className="pm-row" onClick={() => onSelect(s)}>
                    <span className="pm-left">
                      <b>{s.title}</b>
                      <span className="pm-dur">({s.duration})</span>
                    </span>
                    <span className="pm-price">{s.price}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="pm-footer">
          <button className="pm-ghost" onClick={onClose}>Close</button>
        </footer>
      </div>

      {/* styles */}
      <style jsx>{`
        .pm-backdrop{
          position:fixed; inset:0; display:grid; place-items:center;
          background:rgba(0,0,0,.25); z-index:9999; padding:16px;
        }
        .pm-sheet{
          width:min(680px, 96vw);
          background:linear-gradient(180deg,#fff,#fdfdfd);
          border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,.25);
          display:flex; flex-direction:column; overflow:hidden;
          /* mobile sheet look */
          transform:translateY(0);
        }
        .pm-header{
          position:sticky; top:0; z-index:1;
          display:flex; align-items:center; justify-content:space-between;
          padding:14px 16px; border-bottom:1px solid rgba(0,0,0,.06);
          background:linear-gradient(180deg,#fff,#fff);
        }
        .pm-title{ margin:0; font-size:22px; }
        .pm-close{
          border:0; background:transparent; font-size:28px; cursor:pointer; line-height:1;
        }
        .pm-body{
          padding:14px 16px;
          max-height:80vh;            /* ← LIMIT HEIGHT  */
          overflow-y:auto;            /* ← SCROLL HERE   */
          display:grid; gap:20px;
        }
        .pm-section{}
        .pm-cat{ margin:0 0 8px; font-size:16px; color:#444; }
        .pm-list{ display:grid; gap:8px; }
        .pm-row{
          width:100%; text-align:left; cursor:pointer;
          display:flex; align-items:center; justify-content:space-between;
          gap:12px;
          padding:14px 16px;
          border:1px solid rgba(0,0,0,.06);
          background:rgba(255,255,255,.9);
          border-radius:14px;
          box-shadow:0 4px 10px rgba(0,0,0,.05);
          transition:transform .15s ease, box-shadow .15s ease;
        }
        .pm-row:hover{ transform:translateY(-1px); box-shadow:0 8px 16px rgba(0,0,0,.08); }
        .pm-left{ display:flex; align-items:baseline; gap:6px; }
        .pm-dur{ font-size:12px; color:#666; }
        .pm-price{ font-weight:700; color:#6e4b3a; }

        .pm-footer{
          position:sticky; bottom:0; background:#fff;
          border-top:1px solid rgba(0,0,0,.06);
          padding:12px 14px; display:flex; justify-content:flex-end;
        }
        .pm-ghost{
          padding:10px 14px; border-radius:12px; background:transparent;
          border:1px dashed rgba(0,0,0,.25); font-weight:600; cursor:pointer;
        }

        /* MOBILE tweaks */
        @media (max-width: 560px){
          .pm-sheet{
            width:100%; max-width:600px;
            border-radius:18px;
          }
          .pm-title{ font-size:20px; }
          .pm-row{ padding:16px; border-radius:16px; }
          .pm-price{ font-size:15px; }
          .pm-body{ max-height:76vh; } /* трохи більше місця під хедер/футер */
        }
      `}</style>
    </div>,
    document.body
  );
}
