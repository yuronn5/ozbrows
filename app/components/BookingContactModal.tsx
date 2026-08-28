"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Instagram, MessageCircle, Phone, X } from "lucide-react";

export default function BookingContactModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="booking-contact-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-contact-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="booking-contact-modal">
        <button
          className="booking-contact-close"
          type="button"
          onClick={onClose}
          aria-label="Close booking contacts"
        >
          <X />
        </button>

        <div className="booking-contact-heading">
          <span className="booking-contact-kicker">Book an appointment</span>
          <h2 id="booking-contact-title">Let&apos;s find a time for you</h2>
          <p>
            Send me a private message with the service and preferred date, and
            I&apos;ll get back to you as soon as possible.
          </p>
        </div>

        <div className="booking-contact-list">
          <a className="booking-contact-row" href="sms:+16576273017">
            <span className="booking-contact-icon booking-contact-icon--primary">
              <MessageCircle />
            </span>
            <span>
              <b>Send a text message</b>
              <small>657-627-3017</small>
            </span>
          </a>

          <a
            className="booking-contact-row"
            href="https://www.instagram.com/bilous_mua/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="booking-contact-icon">
              <Instagram />
            </span>
            <span>
              <b>Message on Instagram</b>
              <small>@bilous_mua</small>
            </span>
          </a>

          <a className="booking-contact-row" href="tel:+16576273017">
            <span className="booking-contact-icon">
              <Phone />
            </span>
            <span>
              <b>Call me</b>
              <small>657-627-3017</small>
            </span>
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
