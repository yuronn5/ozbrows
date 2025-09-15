"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./gallery.module.css";

const images = [
  { src: "/images/IMG_4587.jpg", caption: "Корекція брів" },
  { src: "/images/IMG_4320.jpg", caption: "Вечірній макіяж" },
  { src: "/images/IMG_5383.jpg", caption: "Весільний макіяж" },
  { src: "/images/IMG_5617.jpg", caption: "Ламінування вій" },
  { src: "/images/IMG_9582.jpg", caption: "Денний макіяж" },
  { src: "/images/IMG_7794.jpg", caption: "Брови + війки" },
];

export default function Gallery() {
  const [perView, setPerView] = useState(4);
  const [index, setIndex] = useState(4);
  const [anim, setAnim] = useState(true);

  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hoverRef = useRef(false);

  const extended = [
    ...images.slice(-perView),
    ...images,
    ...images.slice(0, perView),
  ];

  useEffect(() => {
    const computePV = () => (innerWidth < 640 ? 1 : innerWidth < 1024 ? 2 : 4);
    const apply = () => {
      const pv = computePV();
      setPerView((prev) => {
        if (prev !== pv) {
          setAnim(false);
          setIndex(pv);
          requestAnimationFrame(() => setAnim(true));
        }
        return pv;
      });
    };
    apply();
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };
    addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (index === 0) {
      setAnim(false);
      setIndex(images.length);
      requestAnimationFrame(() => setAnim(true));
    } else if (index === images.length + perView) {
      setAnim(false);
      setIndex(perView);
      requestAnimationFrame(() => setAnim(true));
    }
  }, [index, perView]);

  const next = () => setIndex((i) => i + 1);
  const prev = () => setIndex((i) => i - 1);

  const start = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      if (!hoverRef.current && document.visibilityState === "visible") next();
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
    const vis = () =>
      document.visibilityState === "visible" ? start() : stop();
    document.addEventListener("visibilitychange", vis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  const onEnter = () => {
    hoverRef.current = true;
    stop();
  };
  const onLeave = () => {
    hoverRef.current = false;
    start();
  };

  const openLb = (i: number) => {
    setLbIndex(i);
    setLbOpen(true);
  };
  const closeLb = () => setLbOpen(false);
  const lbNext = () => setLbIndex((v) => (v + 1) % images.length);
  const lbPrev = () =>
    setLbIndex((v) => (v - 1 + images.length) % images.length);

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

  const shift = index * (100 / perView);

  return (
    <section className={styles.wrapper}>
      <div
        className={styles.viewport}
        style={{ "--pv": perView } as React.CSSProperties}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onTouchStart={onEnter}
        onTouchEnd={onLeave}
      >
        <div
          className={styles.track}
          style={{
            transform: `translateX(-${shift}%)`,
            transition: anim ? "transform .6s ease" : "none",
          }}
        >
          {extended.map((item, i) => {
            const real = (i - perView + images.length) % images.length;
            return (
              <div className={styles.slide} key={`${item.src}-${i}`}>
                <div className={styles.imgWrapper}>
                  <img
                    className={styles.image}
                    src={item.src}
                    alt={`work-${real + 1}`}
                    onClick={() => openLb(real)}
                  />
                  <div
                    className={styles.captionAlways}
                    style={{ borderRadius: 16 }}
                  >
                    {item.caption}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.controls}>
          <button
            className={`${styles.arrow} ${styles.left}`}
            onClick={prev}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            className={`${styles.arrow} ${styles.right}`}
            onClick={next}
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </div>

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
                src={images[lbIndex].src}
                alt={`Full ${lbIndex + 1}`}
              />
              <p className={styles.lbCaption}>{images[lbIndex].caption}</p>
              <button
                className={styles.lbClose}
                onClick={closeLb}
                aria-label="Close"
              >
                ×
              </button>
              <button
                className={`${styles.lbArrow} ${styles.lbLeft}`}
                onClick={lbPrev}
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                className={`${styles.lbArrow} ${styles.lbRight}`}
                onClick={lbNext}
                aria-label="Next"
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
