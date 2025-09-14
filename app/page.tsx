// app/page.tsx
'use client';
import { useEffect } from 'react';

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
      <nav className="nav" aria-label="Основна навігація">
        <div className="container nav-inner">
          <a className="brand" href="#home" aria-label="До початку">
            <span className="badge" aria-hidden="true">OZ</span>
            <span>OzBrows</span>
          </a>
          <div className="menu" role="menu">
            <a href="#services">Послуги</a>
            <a href="#pricing">Ціни</a>
            <a href="#gallery">Галерея</a>
            <a href="#reviews">Відгуки</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Контакти</a>
          </div>
          <a className="btn" href="#" data-book-url="https://calendly.com/your-link">Записатися</a>
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
              Підкреслимо вашу природну красу{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, var(--brand), var(--brand-2))',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                ідеальними бровами
              </span>
            </h1>
            <p className="hero-lead">
              Професійна корекція, ламінування та фарбування брів. Прецизійна форма, стійкий результат і делікатний догляд.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
              <a className="btn" href="#" data-book-url="https://calendly.com/your-link">Записатися</a>
              <a className="btn-ghost" href="#gallery">Дивитися роботи</a>
            </div>
            <div className="stats">
              <div className="stat"><div className="val">1.2k+</div><div className="lbl">щасливих клієнтів</div></div>
              <div className="stat"><div className="val">4.9★</div><div className="lbl">середній рейтинг</div></div>
              <div className="stat"><div className="val">7+ років</div><div className="lbl">досвіду</div></div>
            </div>
          </div>
          <div className="col">
            <figure className="hero-img">
              <img src="/hero.jpg" alt="Ніжний портрет клієнтки з ідеально сформованими бровами" />
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
            <p>Індивідуальна форма з урахуванням пропорцій вашого обличчя, симетрія та легкий природний вигляд.</p>
          </article>
          <article className="card reveal" style={{ padding: 20 }}>
            <div className="icon" aria-hidden="true">💧</div>
            <h3>Brow Tinting</h3>
            <p>Підібраний відтінок, що підкреслює густоту та робить погляд виразнішим на 3–4 тижні.</p>
          </article>
          <article className="card reveal" style={{ padding: 20 }}>
            <div className="icon" aria-hidden="true">🌿</div>
            <h3>Brow Lamination</h3>
            <p>Стійке укладання волосків, дзеркальний блиск і акуратна форма без гелю до 6 тижнів.</p>
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
              <img src="/brow-1.jpg" alt="Фото брів — вигляд до та після, крупний план" />
              <img src="/brow-2.jpg" alt="Фото брів — доглянуті брови після процедури" />
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS + FAQ */}
      <section className="container" style={{ padding: '6px 0 24px' }}>
        <div className="grid-2">
          <div id="reviews" className="card reveal stack" style={{ padding: 22 }}>
            <h2>Testimonials</h2>
            <div className="quote"><p>«Форма і колір — ідеальні. Дуже дбайливе ставлення, результат тримається довго!»</p><div className="name">— Марія К.</div></div>
            <div className="quote"><p>«Ламінування змінило мої ранки — укладка не потрібна. Рекомендую OzBrows!»</p><div className="name">— Олена В.</div></div>
          </div>
          <div id="faq" className="card reveal stack" style={{ padding: 22 }}>
            <h2>FAQ</h2>
            <div className="faq-item"><button className="faq-q" aria-expanded="false">Що таке ламінування брів?<span>▾</span></button><div className="faq-a">Це безпечний склад...</div></div>
            <div className="faq-item"><button className="faq-q" aria-expanded="false">Скільки тримається фарбування?<span>▾</span></button><div className="faq-a">Зазвичай 3–4 тижні...</div></div>
            <div className="faq-item"><button className="faq-q" aria-expanded="false">Як часто робити корекцію?<span>▾</span></button><div className="faq-a">Раз на 3–5 тижнів...</div></div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="container" style={{ padding: '10px 0 28px' }}>
        <div className="glass" style={{ padding: 24 }}>
          <div className="grid-2">
            <div className="stack">
              <h2>Контакти</h2>
              <div className="foot-card"><strong>Адреса</strong><br /><span>вул. Прикладна, 12, Київ</span></div>
              <div className="foot-card"><strong>Телефон</strong><br /><a href="tel:+380000000000">+380 00 000 00 00</a></div>
              <div className="foot-card"><strong>Instagram</strong><br /><a href="https://instagram.com/ozbrows" target="_blank" rel="noopener">instagram.com/ozbrows</a></div>
            </div>
            <div className="stack">
              <h2>Запис онлайн</h2>
              <p>Виберіть зручний час — підтвердження прийде у Direct або SMS.</p>
              <a className="btn" href="#" data-book-url="https://calendly.com/your-link">Відкрити форму запису</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="container" role="contentinfo">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span>© <span id="y" /> OzBrows</span>
          <a href="#home" className="btn-ghost" aria-label="До початку сторінки">⬆ Повернутись нагору</a>
        </div>
      </footer>
    </>
  );
}
