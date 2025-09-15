"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "./components/Nav";
import Gallery from "./components/Gallery";
import { createPortal } from "react-dom";
import "./globals.css";
import { useRouter } from "next/navigation";
import PricesModal, { Service } from "./components/PricesModal";

export default function Page() {
  const [showPrices, setShowPrices] = useState(false);
  const router = useRouter();
  const services: Service[] = [
    { id: "shaping", title: "Brow Shaping", price: "$30" },
    { id: "tinting", title: "Brow Tinting", price: "$40" },
    { id: "lamination", title: "Brow Lamination", price: "$50" },
    { id: "combo-st", title: "Shaping + Tinting", price: "$65" },
    { id: "combo-sl", title: "Shaping + Lamination", price: "$75" },
    { id: "combo-lt", title: "Lamination + Tinting", price: "$85" },
    { id: "full", title: "Full Combo (Shape+Lam+Tint)", price: "$110" },
  ];
  const openPricesModal = () => setShowPrices(true);
  const closePricesModal = () => setShowPrices(false);

  const handleSelectService = (s: Service) => {
    // закриваємо модал і переходимо з query ?service=
    closePricesModal();
    router.push(`/booking?service=${encodeURIComponent(s.id)}`);
  };

  useEffect(() => {
    // Smooth-scroll for anchors
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
    // FAQ accordion (з плавною анімацією)
    document
      .querySelectorAll<HTMLButtonElement>(".faq-item .faq-q")
      .forEach((btn) => {
        const item = btn.closest(".faq-item");
        const panel = item?.querySelector<HTMLElement>(".faq-a");
        if (!item || !panel) return;

        // Початковий стан
        panel.style.maxHeight = "0px";
        btn.setAttribute("aria-expanded", "false");

        btn.addEventListener("click", () => {
          const isOpen = item.classList.toggle("open");
          btn.setAttribute("aria-expanded", isOpen ? "true" : "false");

          if (isOpen) {
            // спочатку скидка, щоб браузер переміряв висоту
            panel.style.maxHeight = "0px";
            // на наступний кадр ставимо реальну висоту
            requestAnimationFrame(() => {
              panel.style.maxHeight = panel.scrollHeight + "px";
            });
          } else {
            // захлопуємо
            panel.style.maxHeight = panel.scrollHeight + "px";
            // і одразу анімуємо до 0 (трюк для плавності)
            requestAnimationFrame(() => {
              panel.style.maxHeight = "0px";
            });
          }
        });
      });

    // Якщо контент FAQ може змінюватися динамічно, оновлюй max-height при ресайзі:
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
          {/* <div id="pricing" className="card reveal" style={{ padding: 22 }}>
            <h2>Pricing</h2>
            <div className="price-row"><span>Brow Shaping</span><span className="price">$30</span></div>
            <div className="price-row"><span>Brow Tinting</span><span className="price">$40</span></div>
            <div className="price-row"><span>Brow Lamination</span><span className="price">$50</span></div>
          </div> */}
          <div id="gallery" className="card reveal" style={{ padding: 22 }}>
            <h2 style={{ textAlign: "center" }}>Gallery</h2>
            <div className="gallery">
              {/* <img src="/images/IMG_4587.jpg" alt="Before and after brows — close-up view" />
              <img src="/images/IMG_4320.jpg" alt="Well-groomed brows after the procedure" />
              <img src="/images/IMG_5383.jpg" alt="Well-groomed brows after the procedure" />
              <img src="/images/IMG_5617.jpg" alt="Well-groomed brows after the procedure" /> */}
              <Gallery />
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS + FAQ */}
      <section className="container faq">
        <div className="grid-2">
          <div
            id="reviews"
            className="card reveal stack"
            style={{ padding: 22 }}
          >
            <h2>Testimonials</h2>
            <div className="quote">
              <p>
                “Perfect shape and color. Very attentive approach, the result
                lasts long!”
              </p>
              <div className="name">— Maria K.</div>
            </div>
            <div className="quote">
              <p>
                “Lamination changed my mornings — no styling needed. Highly
                recommend OzBrows!”
              </p>
              <div className="name">— Olena V.</div>
            </div>
          </div>
          {/* <div id="faq" className="card reveal stack" style={{ padding: 22 }}>
            <h2>FAQ</h2>
            <div className="faq-item"><button className="faq-q" aria-expanded="false">What is brow lamination?<span>▾</span></button><div className="faq-a">A safe formula that fixes hairs in the desired direction, adds shine and neat look for up to 6 weeks.</div></div>
            <div className="faq-item"><button className="faq-q" aria-expanded="false">How long does tinting last?<span>▾</span></button><div className="faq-a">Usually 3–4 weeks, depending on skin type and home care.</div></div>
            <div className="faq-item"><button className="faq-q" aria-expanded="false">How often should I do shaping?<span>▾</span></button><div className="faq-a">Every 3–5 weeks to maintain clear form and neat look.</div></div>
          </div> */}

          <div id="pricing" className="card reveal" style={{ padding: 22 }}>
            <h2>Pricing</h2>
            <div className="price-row">
              <span>Brow Shaping</span>
              <span className="price">$30</span>
            </div>
            <div className="price-row">
              <span>Brow Tinting</span>
              <span className="price">$40</span>
            </div>
            <div className="price-row">
              <span>Brow Lamination</span>
              <span className="price">$50</span>
            </div>
          </div>
          {/* <Pricing /> */}
        </div>
      </section>

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
              <div className="foot-card">
                <strong>Address</strong>
                <br />
                <span>12 Example St, Kyiv</span>
              </div>
              <div className="foot-card">
                <strong>Phone</strong>
                <br />
                <a href="tel:+380000000000">+380 00 000 00 00</a>
              </div>
              <div className="foot-card">
                <strong>Instagram</strong>
                <br />
                <a
                  href="https://instagram.com/ozbrows"
                  target="_blank"
                  rel="noopener"
                >
                  instagram.com/ozbrows
                </a>
              </div>
              <a
                className="btn"
                href="#"
                data-book-url="https://calendly.com/your-link"
              >
                Open Booking Form
              </a>
            </div>

            {/* <div className="stack">
              <h2>Contacts</h2>
              <div className="foot-card"><strong>Address</strong><br /><span>12 Example St, Kyiv</span></div>
              <div className="foot-card"><strong>Phone</strong><br /><a href="tel:+380000000000">+380 00 000 00 00</a></div>
              <div className="foot-card"><strong>Instagram</strong><br /><a href="https://instagram.com/ozbrows" target="_blank" rel="noopener">instagram.com/ozbrows</a></div>
              <a className="btn" href="#" data-book-url="https://calendly.com/your-link">Open Booking Form</a>
            </div> */}

            {/* <div className="stack">
              <h2>Online Booking</h2>
              <p>Select a convenient time — confirmation will be sent via Direct or SMS.</p>
              <a className="btn" href="#" data-book-url="https://calendly.com/your-link">Open Booking Form</a>
            </div> */}
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
