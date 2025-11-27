import Image from "next/image";
import styles from "./blackpromo.css";

export default function BlackFridayBlock() {
  return (
    <section className="bf-static reveal">
      <div className="bf-static-inner">
        <div className="bf-static-text">
          <h2 className="bf-static-title">Black Friday</h2>
           <p className="bf-static-sub">11/27–12/05</p>
                <p className="bf-static-off">30% off brows & lashes<br/>20% off makeup</p>

        </div>

        <div className="bf-static-photo">
          <img
    src="/images/bf.jpg"
    alt="Black Friday promo"
  />
        </div>
      </div>
    </section>
  );
}
