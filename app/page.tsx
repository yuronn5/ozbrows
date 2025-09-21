"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "./components/Nav";
import Gallery from "./components/Gallery";
import { createPortal } from "react-dom";
import { MapPin, Phone, Instagram } from "lucide-react";

import { useRouter } from "next/navigation";
import PricesModal, { Service } from "./components/PricesModal";
import TestimonialsSection from "./components/TestimonialsSection";

export default function Page() {
  const [showPrices, setShowPrices] = useState(false);
  const router = useRouter();
  const services: Service[] = [
    // Brows
    {
      id: "brow-lam-tint-tweeze",
      title: "Brow lamination + tint + tweeze",
      price: "$100",
      duration: "1 h",
      category: "Brows",
    },
    {
      id: "brow-lam-tweeze",
      title: "Brow lamination + tweeze",
      price: "$85",
      duration: "30 min",
      category: "Brows",
    },
    {
      id: "brow-tint",
      title: "Brow tint",
      price: "$40",
      duration: "25 min",
      category: "Brows",
    },
    {
      id: "wax-brows",
      title: "Wax brows",
      price: "$25",
      duration: "15 min",
      category: "Brows",
    },
    {
      id: "wax-tint",
      title: "Wax + tint",
      price: "$50",
      duration: "40 min",
      category: "Brows",
    },
    {
      id: "lip-wax",
      title: "Lip wax",
      price: "$10",
      duration: "15 min",
      category: "Brows",
    },

    // Lashes
    {
      id: "lash-lift",
      title: "Lash lift (tint included)",
      price: "$100",
      duration: "1 h 30 min",
      category: "Lashes",
    },
    {
      id: "lash-tint",
      title: "Lash tint",
      price: "$35",
      duration: "15 min",
      category: "Lashes",
    },
    {
      id: "brow-lam-lash-lift",
      title: "Brow lamination + Lash lift",
      price: "$190",
      duration: "2 h",
      category: "Lashes",
    },

    // Make up
    {
      id: "makeup-nude",
      title: "Nude makeup + lashes",
      price: "$90",
      duration: "1 h",
      category: "Make up",
    },
    {
      id: "makeup-day",
      title: "Day makeup + lashes",
      price: "$100",
      duration: "1 h",
      category: "Make up",
    },
    {
      id: "makeup-evening",
      title: "Evening makeup + lashes",
      price: "$120",
      duration: "1 h 15 min",
      category: "Make up",
    },
  ];
  const openPricesModal = () => setShowPrices(true);
  const closePricesModal = () => setShowPrices(false);

  const handleSelectService = (s: Service) => {
    closePricesModal();
    router.push(`/booking?service=${encodeURIComponent(s.id)}`);
  };

  useEffect(() => {
    document
      .querySelectorAll<HTMLAnchorElement>('a[href^="#"]')
      .forEach((a) => {
        a.addEventListener("click", (e) => {
          const id = a.getAttribute("href");
          if (id && id.length > 1) {
            e.preventDefault();
            document
              .querySelector(id)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      });

    // Sync book-url
    const bookAttr =
      document
        .querySelector("[data-book-url]")
        ?.getAttribute("data-book-url") || "#";
    document.querySelectorAll<HTMLElement>("[data-book-url]").forEach((el) => {
      el.setAttribute("href", bookAttr);
    });

    // FAQ accordion

    document
      .querySelectorAll<HTMLButtonElement>(".faq-item .faq-q")
      .forEach((btn) => {
        const item = btn.closest(".faq-item");
        const panel = item?.querySelector<HTMLElement>(".faq-a");
        if (!item || !panel) return;

        panel.style.maxHeight = "0px";
        btn.setAttribute("aria-expanded", "false");

        btn.addEventListener("click", () => {
          const isOpen = item.classList.toggle("open");
          btn.setAttribute("aria-expanded", isOpen ? "true" : "false");

          if (isOpen) {
            panel.style.maxHeight = "0px";

            requestAnimationFrame(() => {
              panel.style.maxHeight = panel.scrollHeight + "px";
            });
          } else {
            panel.style.maxHeight = panel.scrollHeight + "px";

            requestAnimationFrame(() => {
              panel.style.maxHeight = "0px";
            });
          }
        });
      });

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const panel = entry.target as HTMLElement;
        const item = panel.closest(".faq-item");
        if (item?.classList.contains("open")) {
          panel.style.maxHeight = panel.scrollHeight + "px";
        }
      }
    });
    document
      .querySelectorAll<HTMLElement>(".faq-item .faq-a")
      .forEach((p) => ro.observe(p));

    // Reveal on scroll
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    // Year
    const y = document.getElementById("y");
    if (y) y.textContent = String(new Date().getFullYear());

    return () => io.disconnect();
  }, []);

  return (
    <>
      <Nav />

      {/* HERO */}
      <header id="home" className="hero container">
        <div className="glass hero-wrap reveal">
          <div className="col">
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span className="icon" aria-hidden="true">
                ✨
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--muted)",
                  letterSpacing: 0.4,
                }}
              >
                Brow &amp; Beauty Studio
              </span>
            </div>
            <h1 className="display">
              Highlight your natural beauty{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg, var(--brand), var(--brand-2))",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                with perfect brows
              </span>
            </h1>
            <p className="hero-lead">
              Professional shaping, lamination, and tinting. Precise form,
              long-lasting results, and gentle care.
            </p>
            <div
              style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}
            >
              <a
                className="btn"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  openPricesModal();
                }}
              >
                Book Now
              </a>
              <PricesModal
                open={showPrices}
                onClose={closePricesModal}
                onSelect={handleSelectService}
                services={services}
              />
              <a className="btn-ghost" href="#gallery">
                View Works
              </a>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="val">1.2k+</div>
                <div className="lbl">happy clients</div>
              </div>
              <div className="stat">
                <div className="val">5★</div>
                <div className="lbl">average rating</div>
              </div>
              <div className="stat">
                <div className="val">7+ years</div>
                <div className="lbl">experience</div>
              </div>
            </div>
          </div>
          <div className="col">
            <figure className="hero-img">
              <img
                src="/images/main-artist.png"
                alt="Gentle portrait of a client with perfectly shaped brows"
              />
            </figure>
          </div>
        </div>
      </header>

      {/* SERVICES */}
      <section id="services" className="container services">
        <div className="grid-3">
          <article className="card reveal" style={{ padding: 20 }}>
            <div className="icon" aria-hidden="true">
              🍃
            </div>
            <h3>Brow Shaping</h3>
            <p>
              Custom shape that matches your face proportions, symmetry, and a
              soft natural look.
            </p>
          </article>
          <article className="card reveal" style={{ padding: 20 }}>
            <div className="icon" aria-hidden="true">
              💧
            </div>
            <h3>Brow Tinting</h3>
            <p>
              Selected shade to enhance density and add expressiveness for 3–4
              weeks.
            </p>
          </article>
          <article className="card reveal" style={{ padding: 20 }}>
            <div className="icon" aria-hidden="true">
              🌿
            </div>
            <h3>Brow Lamination</h3>
            <p>
              Long-lasting styling, glossy shine, and neat shape without gel for
              up to 6 weeks.
            </p>
          </article>
        </div>
      </section>

      {/* PRICING + GALLERY */}
      <section className="container pricing">
        <div className="grid-1">
          <div id="gallery" className="card reveal" style={{ padding: 22 }}>
            <h2 style={{ textAlign: "center" }}>Gallery</h2>
            <div className="gallery">
              <Gallery />
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS + FAQ */}

      <TestimonialsSection />

      {/* CONTACT and faq */}
      <section id="contact" className="container contact">
        <div className="glass" style={{ padding: 24 }}>
          <div className="grid-2">
            <div id="faq" className="card reveal stack" style={{ padding: 22 }}>
              <h2>FAQ</h2>
              <div className="faq-item">
                <button className="faq-q" aria-expanded="false">
                  What is brow lamination?<span>▾</span>
                </button>
                <div className="faq-a">
                  A safe formula that fixes hairs in the desired direction, adds
                  shine and neat look for up to 6 weeks.
                </div>
              </div>
              <div className="faq-item">
                <button className="faq-q" aria-expanded="false">
                  How long does tinting last?<span>▾</span>
                </button>
                <div className="faq-a">
                  Usually 3–4 weeks, depending on skin type and home care.
                </div>
              </div>
              <div className="faq-item">
                <button className="faq-q" aria-expanded="false">
                  How often should I do shaping?<span>▾</span>
                </button>
                <div className="faq-a">
                  Every 3–5 weeks to maintain clear form and neat look.
                </div>
              </div>
            </div>

            <div id="contact" className="card reveal" style={{ padding: 22 }}>
              <h2>Contacts</h2>

              {/* Address */}
              <div className="contact-row">
                <div className="contact-text">
                  <div className="contact-label">Address</div>
                  <div className="contact-value">
                    3300 Clark Street, Chicago, IL
                  </div>
                </div>
                <a
                  className="icon-btn icon-btn--primary"
                  href="https://www.google.com/maps/search/?api=1&query=3300%20Clark%20Street%2C%20Chicago%2C%20IL"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in Google Maps"
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

              <a
                className="btn book-cta"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  openPricesModal();
                }}
              >
                Book Now
              </a>

              <PricesModal
                open={showPrices}
                onClose={closePricesModal}
                onSelect={handleSelectService}
                services={services}
              />
            </div>
          </div>
        </div>
      </section>

      <footer
        className="container"
        role="contentinfo"
        style={{ paddingBottom: "15px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span style={{ padding: "10px 14px" }}>
            © <span id="y" /> OzBrows
          </span>
          <a href="#home" className="btn-ghost" aria-label="Back to top">
            ⬆ Back to top
          </a>
        </div>
      </footer>
    </>
  );
}
