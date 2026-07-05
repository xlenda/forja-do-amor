"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SIGNS, signByName, compatPercent } from "@/lib/signs.es";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function fmtES(iso) {
  const [y, m, d] = iso.split("-");
  return `${d} ${MESES[+m - 1]} ${y}`;
}

// Horóscopo del día de la pareja — ENTRETENIMIENTO honesto, positivo, determinístico por la fecha.
// (Local a esta página porque lib/signs.es.js no trae este generador.)
const DAILY_ES = [
  {
    tema: "Conexión",
    texto: "Hoy la sintonía entre ustedes está en alza — buen día para una charla sin apuro.",
    dica: "Pregúntense, {voce} y {amor}: ¿cuál fue el mejor momento de esta semana?",
  },
  {
    tema: "Aventura",
    texto: "El cielo pide movimiento. Escapen de la rutina, aunque sea con un plan sencillo.",
    dica: "Planeen algo nuevo para hacer juntos este mes.",
  },
  {
    tema: "Cuidado",
    texto: "Día para bajar el ritmo y cuidarse mutuamente. Los gestos pequeños valen más que las grandes palabras.",
    dica: "Un abrazo un poco más largo hoy ya hace la diferencia.",
  },
  {
    tema: "Pasión",
    texto: "La energía entre ustedes está intensa. Aprovechen para reavivar lo que ya es fuerte.",
    dica: "{voce}, recuérdale a {amor} cómo empezó todo.",
  },
  {
    tema: "Diálogo",
    texto: "Buen momento para poner los sentimientos en palabras. Escuchar es el regalo de hoy.",
    dica: "Dejen el celular a un lado por 20 minutos.",
  },
  {
    tema: "Gratitud",
    texto: "El día favorece reconocer lo que han construido juntos. Celebren las pequeñas victorias.",
    dica: "Díganse un 'gracias' bien específico, uno al otro.",
  },
  {
    tema: "Futuro",
    texto: "Las estrellas invitan a soñar juntos. Buen día para hablar de planes.",
    dica: "Guarden un deseo de {voce} y {amor} para releer más adelante.",
  },
  {
    tema: "Ligereza",
    texto: "Hoy es día de reírse juntos. No se tomen tan en serio las cosas pequeñas.",
    dica: "Recuerden esa anécdota graciosa que siempre los hace reír.",
  },
];

function dailyHoroscopoEs(nameA, nameB, dateStr) {
  const a = signByName(nameA);
  const b = signByName(nameB);
  const key = `${dateStr}|${a ? a.element : "x"}|${b ? b.element : "y"}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return DAILY_ES[h % DAILY_ES.length];
}

function personalize(text, voce, amor) {
  return text.replace(/\{voce\}/g, voce).replace(/\{amor\}/g, amor);
}

// Pequeño contador animado — usado solo para dar un micro-feedback visual, sin inventar datos
// (el número que cuenta ya viene de compatPercent, que es determinístico y ya existe en lib/signs.es).
function CountUp({ to, duration = 900 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
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

function HoroInner() {
  const params = useSearchParams();
  const voce = params.get("voce") || "Tú";
  const amor = params.get("amor") || "Tu amor";
  const [sa, setSa] = useState(params.get("sa") || "Leo");
  const [sb, setSb] = useState(params.get("sb") || "Cáncer");

  const hoje = todayISO();
  const h = dailyHoroscopoEs(sa, sb, hoje);
  const pct = compatPercent(sa, sb) ?? 82;

  const q = new URLSearchParams();
  [["voce", voce], ["amor", amor], ["sa", sa], ["sb", sb]].forEach(([k, v]) => v && q.set(k, v));

  return (
    <main className="wrap">
      <div className="couple-header">
        <span className="badge">✷ Horóscopo de la pareja ✷</span>
        <div className="couple-names">{voce} &amp; {amor}</div>
        <div className="couple-meta">{fmtES(hoje)}</div>
      </div>

      <div className="card card-1">
        <span className="overline">Elijan sus signos</span>
        <div className="grid2" style={{ marginTop: 10 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Tu signo</label>
            <select value={sa} onChange={(e) => setSa(e.target.value)}>
              {SIGNS.map((s) => (<option key={s.name} value={s.name}>{s.emoji} {s.name}</option>))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Signo de tu amor</label>
            <select value={sb} onChange={(e) => setSb(e.target.value)}>
              {SIGNS.map((s) => (<option key={s.name} value={s.name}>{s.emoji} {s.name}</option>))}
            </select>
          </div>
        </div>
      </div>

      <div className="section-head">
        <span className="section-head-title">Horóscopo de hoy</span>
      </div>
      <div key={`${sa}|${sb}`} className="card card-3 fade-in" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 38, letterSpacing: 8 }}>✷</div>
        <span className="badge" style={{ marginTop: 6 }}>{h.tema}</span>
        <p className="compat-line" style={{ fontSize: 18, marginTop: 14 }}>{h.texto}</p>
        <p className="compat-line muted"><b style={{ color: "var(--gold)" }}>Consejo de hoy:</b> {personalize(h.dica, voce, amor)}</p>
        <div className="hr" />
        <div className="ring ring-sm" style={{ "--ring-pct": pct, margin: "0 auto" }}>
          <span className="ring-value"><CountUp to={pct} />%</span>
        </div>
        <p className="muted" style={{ fontSize: 14, marginTop: 10 }}>
          Sintonía de hoy entre {voce} y {amor}
        </p>
      </div>

      <p className="disclaimer" style={{ textAlign: "center", margin: "16px 0" }}>
        Por diversión y reflexión en pareja — cambia todos los días. Nada de esto predice el futuro: la historia la escriben ustedes dos.
      </p>
      <div style={{ textAlign: "center" }}>
        <Link className="btn" href={`/timeline?${q.toString()}`}>Ir a nuestra línea de tiempo →</Link>
      </div>
      <footer>Forja del Amor · prototipo</footer>
    </main>
  );
}

export default function Horoscopo() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
      <HoroInner />
    </Suspense>
  );
}
