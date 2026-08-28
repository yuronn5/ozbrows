"use client";

import { useEffect, useState } from "react";
import BookingContactModal from "./BookingContactModal";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [showBookingContacts, setShowBookingContacts] = useState(false);

  const openBookingContacts = () => {
    setOpen(false);
    setShowBookingContacts(true);
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
          <span className="badge" aria-hidden="true">
            OZ
          </span>
          <span>OzBrows</span>
        </a>

        <div className="menu" role="menu">
          <a href="#services">Services</a>
          <a href="#gallery">Gallery</a>
          <a href="#reviews">Testimonials</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">Contacts</a>
        </div>

        <a
          href="#"
          className="btn"
          onClick={(e) => {
            e.preventDefault();
            openBookingContacts();
          }}
        >
          Book Now
        </a>

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

      <div
        id="mobile-menu"
        className={`mobile-sheet ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="mobile-sheet__inner">
          <div className="mobile-header">
            <a className="brand" href="#home" onClick={() => setOpen(false)}>
              <span className="badge" aria-hidden="true">
                OZ
              </span>
              <span>OzBrows</span>
            </a>
            <button
              className="close-x"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="mobile-links">
            <a href="#services" onClick={() => setOpen(false)}>
              Services
            </a>
            <a href="#pricing" onClick={() => setOpen(false)}>
              Pricing
            </a>
            <a href="#gallery" onClick={() => setOpen(false)}>
              Gallery
            </a>
            <a href="#reviews" onClick={() => setOpen(false)}>
              Testimonials
            </a>
            <a href="#faq" onClick={() => setOpen(false)}>
              FAQ
            </a>
            <a href="#contact" onClick={() => setOpen(false)}>
              Contacts
            </a>
          </div>

          <a
            href="#"
            className="btn mobile-cta"
            onClick={(e) => {
              e.preventDefault();
              openBookingContacts();
            }}
          >
            Book Now
          </a>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className={`backdrop ${open ? "show" : ""}`}
        onClick={() => setOpen(false)}
      />

      <BookingContactModal
        open={showBookingContacts}
        onClose={() => setShowBookingContacts(false)}
      />
    </nav>
  );
}
