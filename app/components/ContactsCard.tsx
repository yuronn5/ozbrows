// components/ContactsCard.tsx (або прямо у page.tsx)
"use client";
import { MapPin, Phone, Instagram } from "lucide-react";

export default function ContactsCard() {
  return (
    <section className="contacts-card">
      <h2 className="contacts-title">Contacts</h2>

      {/* Address */}
      <div className="contact-row">
        <div className="contact-text">
          <div className="contact-label">Address</div>
          <div className="contact-value">3300 Clark Street, Chicago, IL</div>
        </div>
        <a
          className="icon-btn icon-btn--primary"
          href="https://www.google.com/maps/search/?api=1&query=3300%20Clark%20Street%2C%20Chicago%2C%20IL"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open address in Google Maps"
          title="Open in Google Maps"
        >
          <MapPin />
        </a>
      </div>

      {/* Phone */}
      <div className="contact-row">
        <div className="contact-text">
          <div className="contact-label">Phone</div>
          <div className="contact-value">657-627-3017</div>
        </div>
        <a
          className="icon-btn"
          href="tel:+16576273017"
          aria-label="Call 657-627-3017"
          title="Call"
        >
          <Phone />
        </a>
      </div>

      {/* Instagram */}
      <div className="contact-row">
        <div className="contact-text">
          <div className="contact-label">Instagram</div>
          <div className="contact-value">@ozbrows</div>
        </div>
        <a
          className="icon-btn"
          href="https://instagram.com/ozbrows"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Instagram @ozbrows"
          title="Open Instagram"
        >
          <Instagram />
        </a>
      </div>

      <a className="book-cta" href="/booking">Book Now</a>
    </section>
  );
}
