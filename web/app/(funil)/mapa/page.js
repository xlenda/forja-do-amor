"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { compatibility, compatPercent } from "@/lib/signs.es";

function CountUp({ to, duration = 1200 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!to) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span>{n}</span>;
}

function MapaInner() {
  const params = useSearchParams();
  const router = useRouter();
  const voce = params.get("voce") || "Tú";
  const amor = params.get("amor") || "Tu amor";
  const sa = params.get("sa") || "";
  const sb = params.get("sb") || "";

  const compat = sa && sb ? compatibility(sa, sb) : null;
  const pct = sa && sb ? compatPercent(sa, sb) : null;

  const [sellado, setSellado] = useState(null);
  const [email, setEmail] = useState("");
  const [leadEnviado, setLeadEnviado] = useState(false);

  useEffect(() => {
    try {
      const t = JSON.parse(localStorage.getItem(`gff:${voce}:${amor}`) || "{}");
      const a = JSON.parse(localStorage.getItem(`gff-agir:${voce}:${amor}`) || "{}");
      const rec = (t.memories?.find((m) => m.title === "Cómo empezó todo") || t.memories?.[0])?.text || "";
      setSellado({ memoria: rec, inicio: t.startDate || "", deseo: a.goalSaved || "" });
      setLeadEnviado(localStorage.getItem("gff:lead-sent") === "1");
    } catch {}
  }, [voce, amor]);

  const deseo = sellado?.deseo;
  const seccionesAbiertas = leadEnviado ? 1 : 0;

  const secciones = [
    {
      icon: "🌙",
      title: "Luna y conflicto",
      abierto: compat
        ? `Cuando discuten, ${voce} y ${amor} no reaccionan igual: una Luna quiere resolver hablando ya, la otra necesita espacio antes.`
        : `Cuando discuten, no reaccionan igual — y eso no es un problema, es información.`,
      bloqueado: "El gesto exacto que desarma la pelea entre ustedes — y por qué casi siempre empieza por lo mismo.",
    },
    {
      icon: "💬",
      title: "Cómo se comunican",
      abierto: compat
        ? `Entre ${compat.elementoA} y ${compat.elementoB} hay un tema en el que siempre se enredan al hablar, y otro en el que se entienden sin decir una palabra.`
        : `Hay un tema en el que siempre se enredan al hablar, y otro en el que se entienden sin decir una palabra.`,
      bloqueado: "Las 3 frases que a esta combinación le funcionan para no terminar discutiendo por un malentendido.",
    },
    {
      icon: "💞",
      title: "Intimidad y cercanía",
      abierto: `La cercanía que buscan ${voce} y ${amor} no es la misma todos los días — y hoy ninguno de los dos la está pidiendo en voz alta.`,
      bloqueado: "Cómo pedirla sin que suene a reclamo, según cómo funciona cada uno de ustedes.",
    },
    {
      icon: "🌱",
      title: "Hacia dónde crecen",
      abierto: deseo
        ? `El deseo que sellaron — “${deseo}” — marca justo hacia dónde está creciendo esta etapa de ustedes.`
        : `Esta etapa que viven juntos está construyendo algo concreto entre ustedes dos.`,
      bloqueado: "El primer paso pequeño y realista para acercarse a ese deseo este mes, sin presión.",
    },
  ];

  function irAPlanes() {
    const q = new URLSearchParams();
    ["voce", "amor", "sa", "sb", "en"].forEach((k) => params.get(k) && q.set(k, params.get(k)));
    router.push(`/planos?${q.toString()}`);
  }

  function enviarLead(e) {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      localStorage.setItem("gff:lead-sent", "1");
    } catch {}
    setLeadEnviado(true);
    if (typeof window !== "undefined") {
      window.fbq && window.fbq("track", "Lead");
      window.gtag && window.gtag("event", "generate_lead");
    }
    // TODO producción: fetch('/api/lead', { method: 'POST', body: JSON.stringify({ email, voce, amor, sa, sb, memoria: sellado?.memoria, deseo }) })
  }

  return (
    <main className="wrap">
      <div className="line-label"><span>El mapa está listo</span></div>
      <div className="bigstar">✴</div>
      <h1 className="reveal-title">El mapa de ustedes dos</h1>
      <p className="reveal-sub" style={{ maxWidth: 480, margin: "0 auto 8px" }}>
        Su compatibilidad, sus elementos y el recuerdo que sellaron, reunidos en un solo lugar.
        Y cuatro partes más, escritas para ustedes.
      </p>

      {compat && (
        <div className="compat-box card-elevated" style={{ marginTop: 16 }}>
          <span className="overline">Compatibilidad de la pareja</span>
          <div className="pct" style={{ marginTop: 4 }}><CountUp to={pct} />%</div>
          <p className="compat-line" style={{ marginTop: 12 }}><b>Lo que más los une:</b> {compat.forte}</p>
        </div>
      )}

      {sellado?.memoria && (
        <div className="card card-1" style={{ marginTop: 14, textAlign: "center" }}>
          <span className="overline">Ya sellado</span>
          <div className="section-title" style={{ margin: "0 0 10px" }}>Lo que ustedes sellaron</div>
          <p className="compat-line" style={{ fontStyle: "italic" }}>“{sellado.memoria}”</p>
          {sellado.inicio && (
            <p className="muted">
              El comienzo de {voce} &amp; {amor}: {new Date(sellado.inicio).toLocaleDateString("es")}
            </p>
          )}
          {sellado.deseo && (
            <p className="compat-line">
              <b>Su deseo para este año:</b> {sellado.deseo}
            </p>
          )}
        </div>
      )}

      <div className="section-head">
        <span className="section-head-title">Cuatro partes más de su mapa</span>
        <span className="section-head-action">{seccionesAbiertas}/4 abiertas</span>
      </div>

      <div className="reveal-stack">
        {secciones.map((s, i) => {
          const desbloqueada = leadEnviado && i === 0;
          return (
            <div className="card card-2 map-index-card" key={s.title}>
              <div className="idx-head">
                <span className="idx-icon">{s.icon}</span>
                <span className="idx-title">{s.title}</span>
                <span className="idx-lock">{desbloqueada ? "🔓" : "🔒"}</span>
              </div>
              <p className="compat-line">{s.abierto}</p>
              <div
                className="locked-text"
                style={
                  desbloqueada
                    ? { position: "relative", marginTop: 10 }
                    : { position: "relative", marginTop: 10, filter: "blur(5px)", userSelect: "none", pointerEvents: "none" }
                }
              >
                <p className="compat-line">{s.bloqueado}</p>
              </div>
              {desbloqueada && (
                <p className="disclaimer" style={{ marginTop: 6 }}>
                  Esta parte ya quedó abierta — por el correo que nos dejaron.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="map-unlock-block">
        <div className="locked-seal" style={{ position: "static", transform: "none", margin: "0 auto 16px" }}>🔒</div>
        <span className="overline">Última parte del mapa</span>
        <h3 style={{ fontStyle: "italic", fontSize: 22, color: "var(--gold-bright)", marginTop: 4 }}>
          Las cuatro revelaciones están listas
        </h3>
        <p className="muted" style={{ margin: "10px auto 4px", maxWidth: 440 }}>
          Estas cuatro partes ya están escritas para ustedes, pero todavía cerradas:
        </p>

        <div className="feature-list" style={{ maxWidth: 340, margin: "14px auto 6px", textAlign: "left" }}>
          {secciones.map((s) => (
            <div className="feature-item" key={`lock-${s.title}`}>
              <div className="feature-item-icon">{s.icon}</div>
              <div className="feature-item-text"><b>{s.title}</b><span>Todavía cerrada</span></div>
            </div>
          ))}
        </div>

        <p className="muted" style={{ margin: "6px auto 20px", maxWidth: 440 }}>
          Ya pusieron lo más difícil: tiempo, y un recuerdo verdadero. Esto es el resto de la historia.
        </p>

        {!leadEnviado && (
          <form onSubmit={enviarLead} className="form-wrap" style={{ maxWidth: 380, margin: "0 auto 20px", textAlign: "left" }}>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>¿A qué correo les enviamos su mapa?</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
              />
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
              Guardamos la carta de {voce} &amp; {amor} y les mandamos una copia — así no la pierden y pueden volver cuando quieran, sin apuro.
            </p>
            <button className="btn btn-ghost" type="submit" style={{ width: "100%" }}>
              Enviar y guardar nuestro mapa
            </button>
          </form>
        )}
        {leadEnviado && (
          <p className="compat-line" style={{ marginBottom: 16 }}>
            Listo — enviamos una copia a su correo, y ya abrimos la primera parte arriba (“{secciones[0].title}”). Las otras tres se abren dentro de la app.
          </p>
        )}

        <button className="btn" style={{ width: "100%", maxWidth: 360 }} onClick={irAPlanes}>
          Abrir el resto de nuestra historia →
        </button>
        <p className="disclaimer" style={{ marginTop: 12 }}>
          Los primeros 7 días son gratis. Cancela cuando quieras.
        </p>
      </div>

      <footer>Forja del Amor · prototipo</footer>
    </main>
  );
}

export default function Mapa() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
      <MapaInner />
    </Suspense>
  );
}
