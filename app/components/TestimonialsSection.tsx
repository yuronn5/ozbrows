/* ==== TESTIMONIALS with centered slide, peek & autoplay ==== */
"use client";

import { useEffect, useRef, useState } from "react";

export default function TestimonialsSection() {
  const items = [
    {
      text:
        "Perfect shape and color. Very attentive approach, the result lasts long!",
      name: "Maria K.",
      role: "Client",
      stars: 5,
    },
    {
      text:
        "Lamination changed my mornings — no styling needed. Highly recommend OzBrows!",
      name: "Olena V.",
      role: "Client",
      stars: 5,
    },
    {
      text:
        "Neat, symmetric, and natural. The best brow experience I’ve had so far.",
      name: "Anna P.",
      role: "Client",
      stars: 5,
    },
  ];

  const [i, setI] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<HTMLDivElement[]>([]);

  const AUTOPLAY_MS = 4500;
  const pausedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const scrollToIndex = (idx: number) => {
    const vp = viewportRef.current;
    const el = slideRefs.current[idx];
    if (!vp || !el) return;
    const left = el.offsetLeft - (vp.clientWidth - el.clientWidth) / 2;
    vp.scrollTo({ left, behavior: "smooth" });
    setI(idx);
  };

  const next = () => scrollToIndex((i + 1) % items.length);

  // старт/стоп автоплею
  const startAutoplay = () => {
    stopAutoplay();
    timerRef.current = window.setInterval(() => {
      if (!pausedRef.current) next();
    }, AUTOPLAY_MS);
  };
  const stopAutoplay = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // центруємо перший слайд
  useEffect(() => {
    const t = setTimeout(() => scrollToIndex(0), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // автоплей: перезапуск при зміні активного індексу
  useEffect(() => {
    startAutoplay();
    return stopAutoplay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  // пауза при взаємодії і при неактивній вкладці
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const pause = () => (pausedRef.current = true);
    const resume = () => (pausedRef.current = false);

    vp.addEventListener("mouseenter", pause);
    vp.addEventListener("mouseleave", resume);
    vp.addEventListener("touchstart", pause, { passive: true });
    vp.addEventListener("touchend", () => {
      // маленька затримка, щоб не одразу рушало
      setTimeout(resume, 600);
    });

    const onVis = () => {
      pausedRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      vp.removeEventListener("mouseenter", pause);
      vp.removeEventListener("mouseleave", resume);
      vp.removeEventListener("touchstart", pause);
      vp.removeEventListener("touchend", resume);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // підсвічуємо активну крапку при ручному скролі
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const center = vp.scrollLeft + vp.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        slideRefs.current.forEach((el, idx) => {
          if (!el) return;
          const elCenter = el.offsetLeft + el.clientWidth / 2;
          const d = Math.abs(elCenter - center);
          if (d < bestDist) {
            bestDist = d;
            best = idx;
          }
        });
        setI(best);
      });
    };
    vp.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      vp.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="container testimonials" id="reviews">
      <div className="card reveal testimonials__wrap">
        <div className="t-left">
          <span className="eyebrow">TESTIMONIALS</span>
          <h2 className="title">Clients Reviews</h2>
          <p className="lead">
            When replacing a multi-lined selection of text, the generated dummy
            text maintains the amount of lines. Real messages from our clients.
          </p>
        </div>

        <div className="t-right">
          <div className="slider">
            <div className="viewport" ref={viewportRef}>
              {items.map((it, idx) => (
                <div
                  className={`slide ${i === idx ? "is-active" : ""}`}
                  key={idx}
                  ref={(el) => {
                    if (el) slideRefs.current[idx] = el;
                  }}
                >
                  <figure className="card-in">
                    <div className="bubble">
                      <div className="stars" aria-label={`${it.stars} stars`}>
                        {Array.from({ length: it.stars }).map((_, j) => (
                          <span key={j}>★</span>
                        ))}
                      </div>
                      <p>{it.text}</p>
                      <span className="tail" aria-hidden />
                    </div>
                    <figcaption className="person">
                      <div className="name">{it.name}</div>
                      <div className="role">{it.role}</div>
                    </figcaption>
                  </figure>
                </div>
              ))}
            </div>
          </div>

          <div className="dots" role="tablist" aria-label="Testimonials">
            {items.map((_, idx) => (
              <button
                key={idx}
                role="tab"
                aria-selected={i === idx}
                className={`dot ${i === idx ? "is-active" : ""}`}
                onClick={() => scrollToIndex(idx)}
              />
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .testimonials__wrap {
          padding: clamp(18px, 2.5vw, 28px);
          border-radius: 26px;
          display: grid;
          gap: clamp(18px, 2.2vw, 28px);
          grid-template-columns: 1fr;
        }
        section.testimonials {
          padding: 24px 0;
        }
        @media (min-width: 980px) {
          .testimonials__wrap {
            grid-template-columns: 1fr 1.2fr;
            align-items: start;
          }
        }

        .eyebrow {
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #c4a667;
        }
        .title {
          margin: 6px 0 8px;
          font-size: clamp(28px, 3.8vw, 56px);
          line-height: 1.05;
          letter-spacing: -0.6px;
        }
        .lead {
          color: #6a6159;
          max-width: 48ch;
        }

        .slider {
          position: relative;
        }
        .viewport {
          display: flex;
          gap: 18px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          padding: 0 7%;
          margin: 8px 0;
        }
        .viewport::-webkit-scrollbar { display: none; }
        .viewport { scrollbar-width: none; }

        .slide {
          scroll-snap-align: center;
          flex: 0 0 88%;
          transition: transform 220ms ease, opacity 220ms ease;
          opacity: 0.88;
        }
        @media (min-width: 980px) {
          .slide { flex-basis: 66%; }
        }
        .slide.is-active {
          transform: scale(1);
          opacity: 1;
        }

        .card-in { margin: 0; }
        .bubble {
          position: relative;
          background: #fff;
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 20px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.06);
          padding: clamp(16px, 2vw, 22px) clamp(16px, 2.2vw, 26px);
        }
        .stars { margin-bottom: 10px; color: #caa03f; letter-spacing: 2px; font-size: 18px; }
        .bubble p { margin: 0; color: #5f564d; line-height: 1.55; font-size: clamp(16px, 1.5vw, 20px); }
        .tail {
          position: absolute; left: 36px; bottom: -12px; width: 0; height: 0;
          border-left: 10px solid transparent; border-right: 10px solid transparent;
          border-top: 12px solid #fff; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.06));
        }
        .person { margin-top: 18px; padding-left: 6px; }
        .person .name { font-weight: 700; }
        .person .role { color: #7b7269; font-size: 14px; }

        .dots {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 10px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(0,0,0,0.18);
          border: 0;
          padding: 0;
          cursor: pointer;
        }
        .dot.is-active {
          width: 26px;
          background: #caa03f;
        }
      `}</style>
    </section>
  );
}
