"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [quizHref, setQuizHref] = useState("/quiz");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("utm_source")) {
        sessionStorage.setItem("utm", params.toString());
      }
      const saved = sessionStorage.getItem("utm");
      if (saved) setQuizHref(`/quiz?${saved}`);
    } catch {}
  }, []);

  return (
    <main className="wrap">
      <section className="hero">
        <span className="badge">✷ Astrología real de la pareja ✷</span>
        <h1>¿Qué dice el cielo sobre ustedes dos?</h1>
        <p className="sub">
          Pongan sus dos signos y sus fechas reales de nacimiento y, en pocos minutos, descubran su
          compatibilidad y las cartas de ustedes dos.
        </p>
        <div className="cta-row">
          <Link className="btn" href={quizHref}>
            Ver la lectura de nosotros dos 💫
          </Link>
        </div>
        <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
          La lectura es gratis. Si después quieren guardar su historia como pareja, la app completa es US$5/mes, con 7 días gratis.
        </p>

        <Link href={quizHref} className="card" style={{ display: "block", marginTop: 22, maxWidth: 340, marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <div className="zcell" style={{ maxWidth: 70 }}>
              <div className="sym">☉</div>
              <div className="nm">?</div>
            </div>
            <span style={{ fontSize: 22 }}>💛</span>
            <div className="zcell" style={{ maxWidth: 70 }}>
              <div className="sym">☉</div>
              <div className="nm">?</div>
            </div>
          </div>
          <div className="badge" style={{ marginTop: 14 }}>?% compatibilidad de la pareja</div>
          <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            Su porcentaje real aparece al terminar la lectura.
          </p>
        </Link>

        <p className="disclaimer" style={{ marginTop: 14 }}>
          Unos minutos · la lectura es gratis · sin tarjeta
        </p>
      </section>

      <div className="steps3">
        <div className="card">
          <div className="step-num">1</div>
          <h3>Descubran las señales</h3>
          <p className="muted">La astrología revela el Sol, la Luna y el Ascendente de cada uno — y el camino para reencender la energía de ustedes.</p>
        </div>
        <div className="card">
          <div className="step-num">2</div>
          <h3>Guarden la reconexión</h3>
          <p className="muted">Cada foto, audio y mensaje que reconstruye lo que es de ustedes.</p>
        </div>
        <div className="card">
          <div className="step-num">3</div>
          <h3>Revívanlo en el momento justo</h3>
          <p className="muted">Cápsulas del tiempo traen de vuelta lo que importa, exactamente cuando el corazón lo necesita.</p>
        </div>
      </div>

      <hr className="hr" />
      <p className="disclaimer" style={{ textAlign: "center" }}>
        Suscripción transparente, cancelable en cualquier momento, con tus datos siempre en tus manos.
      </p>

      <footer>Forja del Amor · Suscripción US$5/mes · 7 días gratis · cancelás sin explicaciones · tus datos, siempre tuyos.</footer>
    </main>
  );
}
