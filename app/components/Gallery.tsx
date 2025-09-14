"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./gallery.module.css";

const images = [
  "/images/IMG_4587.jpg",
  "/images/IMG_4320.jpg",
  "/images/IMG_5383.jpg",
  "/images/IMG_5617.jpg",
  "/images/IMG_9582.jpg",
  "/images/IMG_7794.jpg",
];

export default function Gallery() {
  const perView = 4;

  // індекс у розширеній стрічці
  const [index, setIndex] = useState(perView);
  // керуємо анімацією (щоб при «телепорті» не мигало)
  const [anim, setAnim] = useState(true);

  // lightbox
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  // autoplay
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hoverRef = useRef(false);

  const extended = [
    ...images.slice(-perView),
    ...images,
    ...images.slice(0, perView),
  ];

  // --- infinite «телепорт» без анімації ---
  useEffect(() => {
    if (index === 0) {
      setAnim(false);
      setIndex(images.length);
      // повертаємо transition на наступному тіку
      requestAnimationFrame(() => setAnim(true));
    } else if (index === images.length + perView) {
      setAnim(false);
      setIndex(perView);
      requestAnimationFrame(() => setAnim(true));
    }
  }, [index]);

  const next = () => setIndex((i) => i + 1);
  const prev = () => setIndex((i) => i - 1);

  // --- autoplay з паузою при hover та коли вкладка неактивна ---
  const start = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      if (!hoverRef.current && document.visibilityState === "visible") {
        next();
      }
    }, 2600);
  };
  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    start();
    const onVis = () =>
      document.visibilityState === "visible" ? start() : stop();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // hover pause
  const onEnter = () => {
    hoverRef.current = true;
    stop();
  };
  const onLeave = () => {
    hoverRef.current = false;
    start();
  };

  // --- lightbox helpers ---
  function openLb(realIndex: number) {
    // realIndex у межах images (0..n-1)
    setLbIndex(realIndex);
    setLbOpen(true);
  }
  function closeLb() {
    setLbOpen(false);
  }
  function lbNext() {
    setLbIndex((v) => (v + 1) % images.length);
  }
  function lbPrev() {
    setLbIndex((v) => (v - 1 + images.length) % images.length);
  }

  // замокати скрол сторінки, ESC і стрілки
  useEffect(() => {
    if (!lbOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowRight") lbNext();
      if (e.key === "ArrowLeft") lbPrev();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [lbOpen]);

  // shift у %, щоб 4 слайди рівно влазили
  const shift = index * (100 / perView);

  return (
    <section className={styles.wrapper}>
      <div
        className={styles.viewport}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onTouchStart={onEnter}
        onTouchEnd={onLeave}
      >
        <div
          className={styles.track}
          style={{
            transform: `translateX(-${shift}%)`,
            transition: anim ? "transform 0.6s ease" : "none",
          }}
        >
          {extended.map((src, i) => {
            // реальний індекс у межах images
            const real = (i - perView + images.length) % images.length;
            return (
              <div className={styles.slide} key={`${src}-${i}`}>
                <img
                  src={src}
                  alt={`work-${real + 1}`}
                  className={styles.image}
                  onClick={() => openLb(real)}
                />
              </div>
            );
          })}
        </div>

        {/* стрілки */}
        <div className={styles.controls} aria-hidden="false">
          <button
            type="button"
            className={`${styles.arrow} ${styles.left}`}
            onClick={prev}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.right}`}
            onClick={next}
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </div>

      {/* LIGHTBOX (через портал) */}
      {lbOpen &&
        createPortal(
          <div
            className={styles.lb}
            role="dialog"
            aria-modal="true"
            onClick={closeLb}
          >
            <div
              className={styles.lbFrame}
              role="document"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                className={styles.lbImg}
                src={images[lbIndex]}
                alt={`Full view ${lbIndex + 1}`}
              />
              <button
                className={styles.lbClose}
                onClick={closeLb}
                aria-label="Close"
                type="button"
              >
                ×
              </button>
              <button
                className={`${styles.lbArrow} ${styles.lbLeft}`}
                onClick={lbPrev}
                aria-label="Previous image"
                type="button"
              >
                ‹
              </button>
              <button
                className={`${styles.lbArrow} ${styles.lbRight}`}
                onClick={lbNext}
                aria-label="Next image"
                type="button"
              >
                ›
              </button>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
