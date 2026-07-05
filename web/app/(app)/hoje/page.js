"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Preguntas organizadas por tema, en cadena: se avanza un tema a la vez en vez de saltar al azar.
const TEMAS = [
  {
    title: "Empezando",
    qs: [
      "¿Cuál fue el momento más feliz de nuestra semana?",
      "¿Qué es lo que más te gusta de cómo empezamos el día juntos?",
    ],
  },
  {
    title: "Conocerse más",
    qs: [
      "¿Qué hago yo que te hace sentir amado/a?",
      "¿Cuál es esa pequeña cosa mía que más te gusta?",
      "¿Qué fue lo primero que te llamó la atención de mí?",
    ],
  },
  {
    title: "Soñar juntos",
    qs: [
      "¿Qué lugar sueñas con conocer conmigo?",
      "¿Cómo te imaginas a nosotros dos dentro de 5 años?",
      "¿Qué te gustaría que hiciéramos más seguido juntos?",
    ],
  },
  {
    title: "Apoyo mutuo",
    qs: [
      "¿Cómo puedo apoyarte mejor esta semana?",
      "¿Qué necesitas de mí cuando tienes un mal día?",
    ],
  },
];
const PERGUNTAS = TEMAS.flatMap((t) => t.qs.map((q) => ({ q, tema: t.title })));

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const CONFETI = ["💛", "✨", "💫", "🌟", "💛", "✨"];

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function fmtBR(iso) {
  const [y, m, d] = iso.split("-");
  return `${d} ${MESES[+m - 1]} ${y}`;
}
// Avanza una pregunta por día en la cadena de temas (no salta al azar), y vuelve a empezar al terminar.
function perguntaDoDia(iso) {
  const epoch = new Date("2024-01-01T00:00");
  const d = new Date(iso + "T00:00");
  const dias = Math.floor((d - epoch) / 86400000);
  const idx = ((dias % PERGUNTAS.length) + PERGUNTAS.length) % PERGUNTAS.length;
  return PERGUNTAS[idx];
}

const CLIMAS = [
  { v: "proximo", label: "Cerca 💛" },
  { v: "ok", label: "Bien 🙂" },
  { v: "distante", label: "Distantes 🌧️" },
];

function HojeInner() {
  const params = useSearchParams();
  const voce = params.get("voce") || "Tú";
  const amor = params.get("amor") || "Tu amor";
  const iso = todayISO();
  const key = `gff-hoje:${voce}:${amor}:${iso}`;
  const toqueKey = `gff-toque:${voce}:${amor}:${iso}`;

  const [mounted, setMounted] = useState(false);
  const [rVoce, setRVoce] = useState("");
  const [rAmor, setRAmor] = useState("");
  const [savedVoce, setSavedVoce] = useState("");
  const [savedAmor, setSavedAmor] = useState("");
  const [clima, setClima] = useState("");
  const [celebrar, setCelebrar] = useState(false);
  const [climaPop, setClimaPop] = useState("");
  const [toqueVoce, setToqueVoce] = useState(false);
  const [toqueAmor, setToqueAmor] = useState(false);
  const celebrarTimeout = useRef(null);
  const climaTimeout = useRef(null);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const d = JSON.parse(raw);
        setSavedVoce(d.savedVoce || "");
        setSavedAmor(d.savedAmor || "");
        setClima(d.clima || "");
      }
      const rawToque = localStorage.getItem(toqueKey);
      if (rawToque) {
        const t = JSON.parse(rawToque);
        setToqueVoce(!!t.voce);
        setToqueAmor(!!t.amor);
      }
    } catch {}
    return () => {
      if (celebrarTimeout.current) clearTimeout(celebrarTimeout.current);
      if (climaTimeout.current) clearTimeout(climaTimeout.current);
    };
  }, [key, toqueKey]);

  function enviarToque(quien) {
    const next = {
      voce: quien === "voce" ? true : toqueVoce,
      amor: quien === "amor" ? true : toqueAmor,
    };
    setToqueVoce(next.voce);
    setToqueAmor(next.amor);
    try {
      localStorage.setItem(toqueKey, JSON.stringify(next));
    } catch {}
  }

  function persist(next) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  }
  function dispararCelebracion() {
    setCelebrar(true);
    if (celebrarTimeout.current) clearTimeout(celebrarTimeout.current);
    celebrarTimeout.current = setTimeout(() => setCelebrar(false), 2400);
  }
  function salvarVoce() {
    if (!rVoce.trim()) return;
    const nv = rVoce.trim();
    setSavedVoce(nv);
    setRVoce("");
    persist({ savedVoce: nv, savedAmor, clima });
    if (savedAmor) dispararCelebracion();
  }
  function salvarAmor() {
    if (!rAmor.trim()) return;
    const na = rAmor.trim();
    setSavedAmor(na);
    setRAmor("");
    persist({ savedVoce, savedAmor: na, clima });
    if (savedVoce) dispararCelebracion();
  }
  function escolherClima(c) {
    setClima(c);
    persist({ savedVoce, savedAmor, clima: c });
    setClimaPop(c);
    if (climaTimeout.current) clearTimeout(climaTimeout.current);
    climaTimeout.current = setTimeout(() => setClimaPop(""), 500);
  }

  const back = new URLSearchParams();
  ["voce", "amor", "sa", "sb"].forEach((k) => params.get(k) && back.set(k, params.get(k)));
  const ambos = savedVoce && savedAmor;

  return (
    <main className="wrap">
      <div className="couple-header">
        <span className="badge">☀️ Hoy</span>
        <div className="couple-names">{voce} &amp; {amor}</div>
        <div className="couple-meta">{fmtBR(iso)}</div>
      </div>

      <div className="section-head">
        <span className="section-head-title">Pregunta del día</span>
        <span className="section-head-action">Tema: {perguntaDoDia(iso).tema}</span>
      </div>
      <div className="card card-3">
        <p className="compat-line" style={{ fontSize: 18 }}>{perguntaDoDia(iso).q}</p>

        {!mounted ? null : !ambos ? (
          <>
            <p className="muted" style={{ marginTop: 6 }}>
              Cada quien responde a su tiempo — las respuestas solo se revelan cuando ambos hayan respondido.
            </p>
            {!savedVoce ? (
              <div className="field" style={{ marginTop: 10 }}>
                <label>Respuesta de {voce}</label>
                <input className="input" value={rVoce} onChange={(e) => setRVoce(e.target.value)} placeholder="Escribe..." />
                <button className="btn" style={{ marginTop: 8 }} onClick={salvarVoce}>Guardar respuesta</button>
              </div>
            ) : (
              <p className="badge" style={{ marginTop: 10 }}>{voce} ya respondió ✓</p>
            )}
            {!savedAmor ? (
              <div className="field" style={{ marginTop: 14 }}>
                <label>Respuesta de {amor}</label>
                <input className="input" value={rAmor} onChange={(e) => setRAmor(e.target.value)} placeholder="Escribe..." />
                <button className="btn" style={{ marginTop: 8 }} onClick={salvarAmor}>Guardar respuesta</button>
              </div>
            ) : (
              <p className="badge" style={{ marginTop: 10, marginLeft: 8 }}>{amor} ya respondió ✓</p>
            )}
          </>
        ) : (
          <div style={{ marginTop: 10, position: "relative" }}>
            {celebrar && (
              <div className="hoje-confetti-wrap" aria-hidden="true">
                {CONFETI.map((e, i) => (
                  <span
                    key={i}
                    className="hoje-confetti-piece"
                    style={{ left: `${8 + i * 15}%`, animationDelay: `${i * 0.08}s` }}
                  >
                    {e}
                  </span>
                ))}
              </div>
            )}
            <div className={celebrar ? "hoje-pop" : ""}>
              {celebrar && (
                <p className="badge" style={{ marginBottom: 10 }}>✨ ¡{voce} y {amor} respondieron el mismo día! ✨</p>
              )}
              <p className="compat-line"><b>{voce}:</b> {savedVoce}</p>
              <p className="compat-line"><b>{amor}:</b> {savedAmor}</p>
              <p className="disclaimer" style={{ marginTop: 8 }}>Respuestas reveladas 💛 Mañana hay una nueva pregunta.</p>
            </div>
          </div>
        )}
      </div>

      <div className="section-head">
        <span className="section-head-title">Un toque rápido</span>
        <span className="section-head-action">sin escribir nada</span>
      </div>
      <div className="card card-2" style={{ textAlign: "center" }}>
        <p className="muted" style={{ marginTop: 0 }}>Para los días con poco tiempo — un aviso de "estoy pensando en ti".</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
          <button className={`opt ${toqueVoce ? "sel" : ""}`} style={{ flex: "1 1 140px" }} onClick={() => enviarToque("voce")} disabled={toqueVoce}>
            {toqueVoce ? `💛 ${voce} lo envió` : `Enviar como ${voce}`}
          </button>
          <button className={`opt ${toqueAmor ? "sel" : ""}`} style={{ flex: "1 1 140px" }} onClick={() => enviarToque("amor")} disabled={toqueAmor}>
            {toqueAmor ? `💛 ${amor} lo envió` : `Enviar como ${amor}`}
          </button>
        </div>
        {mounted && toqueVoce && toqueAmor && (
          <p className="compat-line fade-in" style={{ marginTop: 10 }}>Los dos pensaron el uno en el otro hoy 💛</p>
        )}
      </div>

      <div className="section-head">
        <span className="section-head-title">¿Cómo está el clima de ustedes hoy?</span>
      </div>
      <div className="card card-2">
        <div className="opts" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          {CLIMAS.map((c) => (
            <button
              key={c.v}
              type="button"
              className={`opt ${clima === c.v ? "sel" : ""} ${climaPop === c.v ? "hoje-pop" : ""}`}
              style={{ textAlign: "center" }}
              onClick={() => escolherClima(c.v)}
            >
              {c.label}
            </button>
          ))}
        </div>
        {mounted && clima === "distante" && (
          <p className="muted" style={{ marginTop: 10 }}>
            Los días más fríos pasan. ¿Qué tal un gesto pequeño? Échale un vistazo a la pestaña <b>Reconectar</b>.
          </p>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Link className="btn btn-ghost" href={`/hub?${back.toString()}`}>Volver a la app</Link>
      </div>
      <footer>Forja del Amor · prototipo</footer>
    </main>
  );
}

export default function Hoje() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
      <HojeInner />
    </Suspense>
  );
}
