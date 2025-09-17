"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PricesModal, { Service } from "./PricesModal";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const router = useRouter();

  // Сервіси (можеш винести у файл/пропси, якщо потрібно)
  const services: Service[] = [
    // Brows
    { id: "brow-lam-tint-tweeze", title: "Brow lamination + tint + tweeze", price: "$100", duration: "1 h", category: "Brows" },
    { id: "brow-lam-tweeze",       title: "Brow lamination + tweeze",        price: "$85",  duration: "30 min", category: "Brows" },
    { id: "brow-tint",             title: "Brow tint",                        price: "$40",  duration: "25 min", category: "Brows" },
    { id: "wax-brows",             title: "Wax brows",                        price: "$25",  duration: "15 min", category: "Brows" },
    { id: "wax-tint",              title: "Wax + tint",                       price: "$50",  duration: "40 min", category: "Brows" },
    { id: "lip-wax",               title: "Lip wax",                          price: "$10",  duration: "15 min", category: "Brows" },

    // Lashes
    { id: "lash-lift",             title: "Lash lift (tint included)",        price: "$100", duration: "1 h 30 min", category: "Lashes" },
    { id: "lash-tint",             title: "Lash tint",                        price: "$35",  duration: "15 min",     category: "Lashes" },
    { id: "brow-lam-lash-lift",    title: "Brow lamination + Lash lift",      price: "$190", duration: "2 h",        category: "Lashes" },

    // Make up
    { id: "makeup-nude",           title: "Nude makeup + lashes",             price: "$90",  duration: "1 h",        category: "Make up" },
    { id: "makeup-day",            title: "Day makeup + lashes",              price: "$100", duration: "1 h",        category: "Make up" },
    { id: "makeup-evening",        title: "Evening makeup + lashes",          price: "$120", duration: "1 h 15 min", category: "Make up" },
  ];

  const openPrices = () => {
    setOpen(false);       // закриваємо мобільне меню
    setShowPrices(true);  // відкриваємо модалку
  };
  const closePrices = () => setShowPrices(false);
  const handleSelectService = (s: Service) => {
    closePrices();
    router.push(`/booking?service=${encodeURIComponent(s.id)}`);
  };

  // Close on ESC and when resizing to desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => {
      if (window.innerWidth >= 980) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Prevent body scroll when menu open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
  }, [open]);

  return (
    <nav className="nav" aria-label="Main navigation">
      <div className="container nav-inner">
        <a className="brand" href="#home" aria-label="Back to top">
          <span className="badge" aria-hidden="true">OZ</span>
          <span>OzBrows</span>
        </a>

        {/* Desktop menu */}
        <div className="menu" role="menu">
          <a href="#services">Services</a>
          <a href="#pricing">Pricing</a>
          <a href="#gallery">Gallery</a>
          <a href="#reviews">Testimonials</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">Contacts</a>
        </div>

        {/* Desktop CTA → відкриває модалку з послугами */}
        <a
          href="#"
          className="btn"
          onClick={(e) => {
            e.preventDefault();
            openPrices();
          }}
        >
          Book Now
        </a>

        {/* Burger (shown on mobile) */}
        <button
          className={`burger ${open ? "is-open" : ""}`}
          aria-label="Toggle menu"
          aria-expanded={open ? "true" : "false"}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile sheet */}
      <div
        id="mobile-menu"
        className={`mobile-sheet ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="mobile-sheet__inner">
          <div className="mobile-header">
            <a className="brand" href="#home" onClick={() => setOpen(false)}>
              <span className="badge" aria-hidden="true">OZ</span>
              <span>OzBrows</span>
            </a>
            <button className="close-x" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="mobile-links">
            <a href="#services" onClick={() => setOpen(false)}>Services</a>
            <a href="#pricing" onClick={() => setOpen(false)}>Pricing</a>
            <a href="#gallery" onClick={() => setOpen(false)}>Gallery</a>
            <a href="#reviews" onClick={() => setOpen(false)}>Testimonials</a>
            <a href="#faq" onClick={() => setOpen(false)}>FAQ</a>
            <a href="#contact" onClick={() => setOpen(false)}>Contacts</a>
          </div>

          {/* Mobile CTA → теж відкриває модалку */}
          <a
            href="#"
            className="btn mobile-cta"
            onClick={(e) => {
              e.preventDefault();
              openPrices();
            }}
          >
            Book Now
          </a>
        </div>
      </div>

      {/* Backdrop */}
      <div className={`backdrop ${open ? "show" : ""}`} onClick={() => setOpen(false)} />

      {/* Модалка з цінами/послугами */}
      <PricesModal
        open={showPrices}
        onClose={closePrices}
        onSelect={handleSelectService}
        services={services}
        headline="Prices & Services"
      />
    </nav>
  );
}
