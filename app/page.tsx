"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Nav from "./components/Nav";
import Gallery from "./components/Gallery";
import { MapPin, Phone, Instagram } from "lucide-react";
import { useRouter } from "next/navigation";
import PricesModal, { Service } from "./components/PricesModal";
import TestimonialsSection from "./components/TestimonialsSection";
import PromoPopup from "./components/PromoPopup";
import BlackFridayPromo from "./components/BlackFridayPromo";

export default function Page() {
  const [showPrices, setShowPrices] = useState(false);
  const router = useRouter();

  const services: Service[] = [
    // Brows
    {
      id: "brow-lam-tint-tweeze",
      title: "Brow lamination + tint + tweeze",
      price: "$110",
      duration: "1 h",
      category: "Brows",
    },
    {
      id: "brow-lam-tweeze",
      title: "Brow lamination + tweeze",
      price: "$100",
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
      price: "$40",
      duration: "15 min",
      category: "Brows",
    },
    {
      id: "wax-tint",
      title: "Wax + tint",
      price: "$60",
      duration: "40 min",
      category: "Brows",
    },
    {
      id: "brow-lightening",
      title: "Brow lightening",
      price: "$30",
      duration: "20 min",
      category: "Brows",
    },
    {
      id: "lip-wax",
      title: "Lip wax",
      price: "$20",
      duration: "15 min",
      category: "Brows",
    },
    // Lashes
    {
      id: "lash-lift",
      title: "Lash lift (tint included)",
      price: "$120",
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
      price: "$200",
      duration: "2 h",
      category: "Lashes",
    },
    // Make up
    {
      id: "makeup-nude",
      title: "Nude makeup + lashes",
      price: "$110",
      duration: "1 h",
      category: "Make up",
    },
    {
      id: "makeup-day",
      title: "Day makeup + lashes",
      price: "$120",
      duration: "1 h",
      category: "Make up",
    },
    {
      id: "makeup-evening",
      title: "Evening makeup + lashes",
      price: "$150",
      duration: "1 h 15 min",
      category: "Make up",
    },
    {
      id: "makeup-wedding",
      title: "Wedding makeup + lashes",
      price: "$170",
      duration: "1 h 20 min",
      category: "Make up",
    },
     {
      id: "makeup-ceremony",
      title: "Makeup for wedding ceremony + lashes",
      price: "$150",
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
    // smooth scroll
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

    // reveal on scroll
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.18 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    // accordion
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
            requestAnimationFrame(
              () => (panel.style.maxHeight = panel.scrollHeight + "px")
            );
          } else {
            panel.style.maxHeight = panel.scrollHeight + "px";
            requestAnimationFrame(() => (panel.style.maxHeight = "0px"));
          }
        });
      });
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const panel = entry.target as HTMLElement;
        const item = panel.closest(".faq-item");
        if (item?.classList.contains("open"))
          panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
    document
      .querySelectorAll<HTMLElement>(".faq-item .faq-a")
      .forEach((p) => ro.observe(p));

    // year
    const y = document.getElementById("y");
    if (y) y.textContent = String(new Date().getFullYear());

    return () => io.disconnect();
  }, []);

  const [heroReady, setHeroReady] = useState(false);

  return (
    <>
      <Nav />
      <PromoPopup />
      {/* ===== HERO full-bleed ===== */}
      <section id="home" className={`hero hero--fullbleed ${heroReady ? "is-ready" : ""}`}>
        <div className="hero__bg" aria-hidden>
          <Image
            src="/images/hero2.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="hero__img"
            onLoadingComplete={() => setHeroReady(true)}
          />
          <span className="hero__overlay" />
        </div>

        <div className="hero__content">
          <div className="hero__eyebrow">Brow &amp; Beauty Studio</div>

          <h1 className="hero__title">
            Highlight your natural beauty <br />
            <span className="accent">with flawless brows, makeup, and lashes.</span>
          </h1>

          <div className="hero__cta">
            <a
              className="btn primary"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                openPricesModal();
              }}
            >
              Book Now
            </a>
            <a className="btn btn--ghost" href="#gallery">
              View Works
            </a>
          </div>

          <ul className="hero__stats">
            <li>
              <b>5k+</b>
              <span>happy clients</span>
            </li>
            <li>
              <b>5★</b>
              <span>average rating</span>
            </li>
            <li>
              <b>7+ years</b>
              <span>experience</span>
            </li>
          </ul>
        </div>
      </section>

      {/* ===== Black friday  ===== */}
      {/* <BlackFridayPromo /> */}

      {/* SERVICES */}
      <section id="services" className="container services">
        <div className="grid-4">
          <article className="card reveal" style={{ padding: 20 }}>
            <div className="icon" aria-hidden="true">
              🍃
            </div>
            <h3>Brows</h3>
            <p>
              <strong>Shaping</strong>: Custom shape that matches your face
              proportions, symmetry, and a soft natural look.
            </p>
            <p>
              <strong>Tinting</strong>: Selected shade to enhance density and
              add expressiveness for 3–4 weeks.
            </p>
          </article>
          <article className="card reveal" style={{ padding: 20 }}>
            <div className="icon" aria-hidden="true">
              💧
            </div>
            <h3>Brow Lamination</h3>
            <p>
              If you want your brows to be easier to style, with a lasting
              effect for up to two months, and you’d like them to look more
              groomed and have a beautiful shape, then brow lamination is the
              treatment for you.
            </p>
          </article>
          <article className="card reveal" style={{ padding: 20 }}>
            <div className="icon" aria-hidden="true">
              🌿
            </div>
            <h3>Lash Lift</h3>
            <p>
              If you want your lashes to look naturally lifted, with a
              long-lasting curl that holds for up to two months, and you’d like
              them to appear darker, shinier, and more groomed, then lash
              lamination is the perfect treatment for you.
            </p>
          </article>
          <article className="card reveal" style={{ padding: 20 }}>
            <div className="icon" aria-hidden="true">
              💄
            </div>
            <h3>Makeup</h3>
            <p>
              If you have an important event and want to look confident and
              stunning, I’ll be happy to highlight your best features and
              carefully listen to your wishes to create the perfect makeup look
              for you.
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

      {/* CONTACT + FAQ panel */}
      <section id="contact" className="container contact">
        <div className="glass" style={{ padding: 24 }}>
          <div className="grid-2">
            {/* FAQ */}
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
              <div className="faq-item">
                <button className="faq-q" aria-expanded="false">
                  Is brow lamination safe? Any contraindications?<span>▾</span>
                </button>
                <div className="faq-a">
                  Yes—when performed with professional products. Avoid the
                  service if you have active skin irritation, cuts,
                  eczema/dermatitis around brows, recent sunburn/peels/retinoids
                  (within 48h), or known allergies to ingredients. A patch test
                  is recommended for sensitive skin.
                </div>
              </div>

              <div className="faq-item">
                <button className="faq-q" aria-expanded="false">
                  Aftercare: what should I do in the first 24–48 hours?
                  <span>▾</span>
                </button>
                <div className="faq-a">
                  Keep brows dry—avoid steam, sauna, workouts, and oils/creams
                  on the area. Don’t rub or sleep face-down. From day 2, gently
                  brush daily and use a nourishing conditioner/oil to maintain
                  shine and flexibility.
                </div>
              </div>
            </div>

            <div className="card reveal" style={{ padding: 22 }}>
              <h2>Contacts</h2>

              {/* Address */}
              {/* <div className="contact-row">
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
              </div> */}

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
                  <div className="contact-value">@bilous_mua</div>
                </div>
                <a
                  className="icon-btn"
                  href="https://www.instagram.com/bilous_mua/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Instagram @bilous_mua"
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
            </div>
          </div>
        </div>
      </section>

      {/* One shared PricesModal */}
      <PricesModal
        open={showPrices}
        onClose={closePricesModal}
        onSelect={handleSelectService}
        services={services}
      />

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
