'use client';
import { useEffect } from 'react';
import Link from "next/link";

export default function Page() {
  useEffect(() => {
    // Smooth-scroll for anchors
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id && id.length > 1) {
          e.preventDefault();
          document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Sync book-url
    const bookAttr = document.querySelector('[data-book-url]')?.getAttribute('data-book-url') || '#';
    document.querySelectorAll<HTMLElement>('[data-book-url]').forEach((el) => {
      el.setAttribute('href', bookAttr);
    });

    // FAQ accordion
    document.querySelectorAll<HTMLButtonElement>('.faq-item .faq-q').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        if (!item) return;
        const open = item.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    // Reveal on scroll
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18 }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    // Year
    const y = document.getElementById('y');
    if (y) y.textContent = String(new Date().getFullYear());

    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* NAV */}
      <nav className="nav" aria-label="Main navigation">
        <div className="container nav-inner">
          <a className="brand" href="#home" aria-label="Back to top">
            <span className="badge" aria-hidden="true">OZ</span>
            <span>OzBrows</span>
          </a>
          <div className="menu" role="menu">
            <a href="#services">Services</a>
            <a href="#pricing">Pricing</a>
            <a href="#gallery">Gallery</a>
            <a href="#reviews">Testimonials</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contacts</a>
            <Link href="/booking">Booking</Link>
          </div>
          <a className="btn" href="#" data-book-url="https://calendly.com/your-link">Book Now</a>
        </div>
      </nav>

      {/* HERO */}
      <header id="home" className="hero container">
        <div className="glass hero-wrap reveal">
          <div className="col">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <span className="icon" aria-hidden="true">✨</span>
              <span style={{ fontWeight: 600, color: 'var(--muted)', letterSpacing: 0.4 }}>
                Brow &amp; Beauty Studio
              </span>
            </div>
            <h1 className="display">
              Highlight your natural beauty{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, var(--brand), var(--brand-2))',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                with perfect brows
              </span>
            </h1>
            <p className="hero-lead">
              Professional shaping, lamination, and tinting. Precise form, long-lasting results, and gentle care.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
              <a className="btn" href="#" data-book-url="https://calendly.com/your-link">Book Now</a>
              <a className="btn-ghost" href="#gallery">View Works</a>
            </div>
            <div className="stats">
              <div className="stat"><div className="val">1.2k+</div><div className="lbl">happy clients</div></div>
              <div className="stat"><div className="val">4.9★</div><div className="lbl">average rating</div></div>
              <div className="stat"><div className="val">7+ years</div><div className="lbl">experience</div></div>
            </div>
          </div>
          <div className="col">
            <figure className="hero-img">
              <img src="/hero.jpg" alt="Gentle portrait of a client with perfectly shaped brows" />
            </figure>
          </div>
        </div>
      </header>

      {/* SERVICES */}
      <section id="services" className="container" style={{ padding: '26px 0' }}>
        <div className="grid-3">
          <article className="card reveal" style={{ padding: 20 }}>
            <div className="icon" aria-hidden="true">🍃</div>
            <h3>Brow Shaping</h3>
            <p>Custom shape that matches your face proportions, symmetry, and a soft natural look.</p>
          </article>
          <article className="card reveal" style={{ padding: 20 }}>
            <div className="icon" aria-hidden="true">💧</div>
            <h3>Brow Tinting</h3>
            <p>Selected shade to enhance density and add expressiveness for 3–4 weeks.</p>
          </article>
          <article className="card reveal" style={{ padding: 20 }}>
            <div className="icon" aria-hidden="true">🌿</div>
            <h3>Brow Lamination</h3>
            <p>Long-lasting styling, glossy shine, and neat shape without gel for up to 6 weeks.</p>
          </article>
        </div>
      </section>

      {/* PRICING + GALLERY */}
      <section className="container" style={{ padding: '6px 0 8px' }}>
        <div className="grid-2">
          <div id="pricing" className="card reveal" style={{ padding: 22 }}>
            <h2>Pricing</h2>
            <div className="price-row"><span>Brow Shaping</span><span className="price">$30</span></div>
            <div className="price-row"><span>Brow Tinting</span><span className="price">$40</span></div>
            <div className="price-row"><span>Brow Lamination</span><span className="price">$50</span></div>
          </div>
          <div id="gallery" className="card reveal" style={{ padding: 22 }}>
            <h2>Gallery</h2>
            <div className="gallery">
              <img src="/brow-1.jpg" alt="Before and after brows — close-up view" />
              <img src="/brow-2.jpg" alt="Well-groomed brows after the procedure" />
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS + FAQ */}
      <section className="container" style={{ padding: '6px 0 24px' }}>
        <div className="grid-2">
          <div id="reviews" className="card reveal stack" style={{ padding: 22 }}>
            <h2>Testimonials</h2>
            <div className="quote"><p>“Perfect shape and color. Very attentive approach, the result lasts long!”</p><div className="name">— Maria K.</div></div>
            <div className="quote"><p>“Lamination changed my mornings — no styling needed. Highly recommend OzBrows!”</p><div className="name">— Olena V.</div></div>
          </div>
          <div id="faq" className="card reveal stack" style={{ padding: 22 }}>
            <h2>FAQ</h2>
            <div className="faq-item"><button className="faq-q" aria-expanded="false">What is brow lamination?<span>▾</span></button><div className="faq-a">A safe formula that fixes hairs in the desired direction, adds shine and neat look for up to 6 weeks.</div></div>
            <div className="faq-item"><button className="faq-q" aria-expanded="false">How long does tinting last?<span>▾</span></button><div className="faq-a">Usually 3–4 weeks, depending on skin type and home care.</div></div>
            <div className="faq-item"><button className="faq-q" aria-expanded="false">How often should I do shaping?<span>▾</span></button><div className="faq-a">Every 3–5 weeks to maintain clear form and neat look.</div></div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="container" style={{ padding: '10px 0 28px' }}>
        <div className="glass" style={{ padding: 24 }}>
          <div className="grid-2">
            <div className="stack">
              <h2>Contacts</h2>
              <div className="foot-card"><strong>Address</strong><br /><span>12 Example St, Kyiv</span></div>
              <div className="foot-card"><strong>Phone</strong><br /><a href="tel:+380000000000">+380 00 000 00 00</a></div>
              <div className="foot-card"><strong>Instagram</strong><br /><a href="https://instagram.com/ozbrows" target="_blank" rel="noopener">instagram.com/ozbrows</a></div>
            </div>
            <div className="stack">
              <h2>Online Booking</h2>
              <p>Select a convenient time — confirmation will be sent via Direct or SMS.</p>
              <a className="btn" href="#" data-book-url="https://calendly.com/your-link">Open Booking Form</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="container" role="contentinfo">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span>© <span id="y" /> OzBrows</span>
          <a href="#home" className="btn-ghost" aria-label="Back to top">⬆ Back to top</a>
        </div>
      </footer>
    </>
  );
}
