"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const TRACKS = [
  {
    id: "conversar",
    emoji: "💬",
    title: "Volver a conversar",
    intro: "Pequeños gestos para reabrir el canal y escucharse de verdad.",
    steps: [
      "Escucha a tu pareja durante 2 minutos sin interrumpir y resume con tus palabras lo que escuchaste.",
      "Envía un mensaje corto preguntando cómo estuvo su día — y lee la respuesta con atención.",
      "Elige un momento sin apuros para conversar, con los celulares lejos.",
      "Haz una pregunta abierta ('¿qué has estado sintiendo últimamente?') en vez de una de sí o no.",
      "Comparte algo tuyo primero: cuenta cómo te has sentido, empezando con 'yo siento...'.",
      "Acuerden un horario fijo en la semana, solo para ustedes, para ponerse al día.",
    ],
  },
  {
    id: "frieza",
    emoji: "🌤️",
    title: "Reducir la frialdad",
    intro: "Calentar el ambiente poco a poco, sin presión y al ritmo de los dos.",
    steps: [
      "Saluda a tu pareja con un buenos días o buenas noches, incluso en los días más difíciles.",
      "Reconoce en voz alta algo que admiras de él o ella.",
      "Ofrece un contacto cariñoso — la mano en el hombro, un abrazo — si es cómodo para los dos.",
      "Respira antes de hablar cuando sientas ganas de cerrarte, para no responder en automático.",
      "Di 'te extrañé' cuando sea verdad, sin esperar nada a cambio.",
      "Retomen un pequeño hábito de ustedes: un café juntos, una canción, una caminata.",
    ],
  },
  {
    id: "carinho",
    emoji: "💛",
    title: "Reconstruir el cariño",
    intro: "Regar el afecto con atención, gratitud y presencia.",
    steps: [
      "Agradece algo específico que tu pareja hizo hoy, por pequeño que parezca.",
      "Envía un mensaje recordando un buen momento que vivieron juntos.",
      "Haz un elogio sincero sobre quién es él o ella, no solo sobre lo que hace.",
      "Ofrece ayuda en algo que sabes que le pesa, sin esperar a que te lo pida.",
      "Reserven 10 minutos solo para estar juntos, sin resolver nada — solo presencia.",
      "Escribe una nota corta diciendo qué valoras de tener a esta persona cerca.",
    ],
  },
  {
    id: "confianca",
    emoji: "🤝",
    title: "Retomar la confianza",
    intro: "Reconstruir la seguridad con transparencia y reparaciones honestas.",
    steps: [
      "Cumple una pequeña promesa esta semana y avísale con cariño cuando la cumplas.",
      "Pide disculpas por algo específico, sin agregar un 'pero' después.",
      "Escucha el dolor de tu pareja hasta el final, sin defenderte, y valida lo que sintió.",
      "Haz un pedido empezando con 'yo siento...' en vez de acusar ('siento inseguridad cuando...').",
      "Sé transparente sobre algo que solías evitar contar, a tu propio ritmo.",
      "Acuerden juntos un pequeño pacto de convivencia y revísenlo dentro de una semana.",
    ],
  },
];

const SOS_STEPS = [
  "Respiren hondo, cada uno por su lado, antes de decir cualquier cosa más.",
  "El primero que pueda, diga en voz alta: 'no quiero pelear contigo, quiero entenderte'.",
  "Escuchen al otro sin interrumpir ni defenderse — solo para entender, no para responder ya.",
  "Ofrezcan un abrazo de 20 segundos, aunque todavía quede algo por resolver.",
];

function todayISOLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DESAFIO_TRACK = {
  "Comunicación": "conversar",
  "Rutina vs. romance": "carinho",
  "Confianza": "confianca",
  "Redescubrirse": "carinho",
};

// Cruza el clima de hoy, el desafío que marcaron en Descubrir y el estilo de apego para sugerir la trayectoria más útil ahora.
function trilhaRecomendada(apego, clima, desafio) {
  if (clima === "distante") return "frieza";
  if (desafio && DESAFIO_TRACK[desafio]) return DESAFIO_TRACK[desafio];
  if (apego === "ansioso") return "confianca";
  if (apego === "evitativo") return "conversar";
  if (apego === "seguro") return "carinho";
  return null;
}

function ReconectarInner() {
  const params = useSearchParams();
  const voce = params.get("voce") || "Tú";
  const amor = params.get("amor") || "Tu amor";
  const storageKey = `gff-reconectar:${voce}:${amor}`;

  const qs = () => {
    const q = new URLSearchParams();
    ["voce", "amor", "sa", "sb"].forEach((k) => {
      const v = params.get(k);
      if (v) q.set(k, v);
    });
    const s = q.toString();
    return s ? `?${s}` : "";
  };

  const [mounted, setMounted] = useState(false);
  const [checks, setChecks] = useState({});
  const [open, setOpen] = useState(TRACKS[0].id);
  const [celebrate, setCelebrate] = useState(null);
  const [recomendada, setRecomendada] = useState(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [sosStep, setSosStep] = useState(0);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecks(JSON.parse(raw) || {});
    } catch {}
    try {
      const descobrir = JSON.parse(localStorage.getItem(`gff-descobrir:${voce}:${amor}`) || "{}");
      const hoje = JSON.parse(localStorage.getItem(`gff-hoje:${voce}:${amor}:${todayISOLocal()}`) || "{}");
      const rec = trilhaRecomendada(descobrir.apego?.top, hoje.clima, descobrir.conflictos?.desafio);
      setRecomendada(rec);
      if (rec) setOpen(rec);
    } catch {}
  }, [storageKey, voce, amor]);

  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(null), 5000);
    return () => clearTimeout(t);
  }, [celebrate]);

  function persist(next) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }

  function toggleStep(track, i) {
    const key = `${track.id}:${i}`;
    const willBeChecked = !checks[key];
    const next = { ...checks, [key]: willBeChecked };
    setChecks(next);
    persist(next);

    if (willBeChecked) {
      const doneAfter = track.steps.reduce(
        (n, _s, idx) => n + (next[`${track.id}:${idx}`] ? 1 : 0),
        0
      );
      if (doneAfter === track.steps.length) {
        setCelebrate(track);
      }
    }
  }

  function doneCount(track) {
    return track.steps.reduce((n, _s, i) => n + (checks[`${track.id}:${i}`] ? 1 : 0), 0);
  }

  const totalSteps = TRACKS.reduce((n, t) => n + t.steps.length, 0);
  const totalDone = TRACKS.reduce((n, t) => n + doneCount(t), 0);
  const trilhasCompletas = TRACKS.filter((t) => doneCount(t) === t.steps.length).length;

  return (
    <main className="wrap">
      {celebrate && (
        <div className="celebration-toast" role="status">
          <button
            className="celebration-close"
            onClick={() => setCelebrate(null)}
            aria-label="Cerrar"
          >
            ✕
          </button>
          <span className="celebration-emoji">🎉{celebrate.emoji}</span>
          <div className="section-title" style={{ margin: "0 0 4px" }}>
            ¡Lo lograron, {voce} &amp; {amor}!
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Completaron juntos la trayectoria «{celebrate.title}». Un paso más, real y de los dos.
          </p>
        </div>
      )}

      <div className="couple-header">
        <span className="badge">💞 Reconectar</span>
        <div className="couple-names">{voce} &amp; {amor}</div>
        <div className="couple-meta">un paso a la vez, juntos 💛</div>
      </div>

      {/* Acción más urgente de la página: Modo SOS, para justo después de una pelea */}
      <div className="card card-3" style={{ marginBottom: 14 }}>
        <button
          onClick={() => setSosOpen((v) => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text)", width: "100%", textAlign: "left", padding: 0, display: "flex", alignItems: "center", gap: 12 }}
        >
          <div style={{ fontSize: 28 }}>🆘</div>
          <div style={{ flex: 1 }}>
            <span className="overline">Ayuda inmediata</span>
            <div className="section-title" style={{ margin: 0 }}>Modo SOS — recién después de una pelea</div>
            <p className="muted" style={{ margin: "2px 0 0" }}>4 pasos cortos para bajar la tensión ahora, sin elegir ninguna trayectoria.</p>
          </div>
          <span className="muted" style={{ fontSize: 18 }}>{sosOpen ? "▾" : "▸"}</span>
        </button>
        {sosOpen && (
          <div style={{ marginTop: 16 }}>
            <p className="compat-line" style={{ fontSize: 17 }}>{SOS_STEPS[sosStep]}</p>
            <div className="progress" style={{ marginTop: 12, marginBottom: 10 }}>
              <i style={{ width: `${((sosStep + 1) / SOS_STEPS.length) * 100}%` }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {sosStep < SOS_STEPS.length - 1 ? (
                <button className="btn" onClick={() => setSosStep((s) => s + 1)}>Listo, siguiente paso</button>
              ) : (
                <button className="btn" onClick={() => { setSosOpen(false); setSosStep(0); }}>Terminamos los 4 pasos 💛</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contenido de contexto/explicación: baja jerarquía visual */}
      <div className="card card-1">
        <div className="section-title" style={{ margin: "0 0 8px" }}>Reavivar la conexión</div>
        <p className="muted" style={{ margin: 0 }}>
          Reconectar no es convencer ni controlar a nadie — es volver a escucharse, cuidarse y
          comunicarse con honestidad. Elijan una trayectoria y hagan una pequeña misión por día,
          a su propio ritmo. Los gestos pequeños, repetidos, reconstruyen el vínculo.
        </p>
        <p className="disclaimer" style={{ marginTop: 12 }}>
          Para cuestiones serias, consideren terapia de pareja con un profesional.
        </p>
      </div>

      {mounted && (
        <div className="card card-2" style={{ marginTop: 14, marginBottom: 14 }}>
          <span className="overline">Su avance conjunto</span>
          <div className="stat-row" style={{ marginTop: 10 }}>
            <div className="stat">
              <div className="stat-value">{totalDone}</div>
              <div className="stat-label">✅ hechas</div>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <div className="stat-value">{totalSteps - totalDone}</div>
              <div className="stat-label">⏳ pendientes</div>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <div className="stat-value">{trilhasCompletas}/{TRACKS.length}</div>
              <div className="stat-label">🏁 trayectorias</div>
            </div>
          </div>
          <div className="progress" style={{ marginTop: 14 }}>
            <i style={{ width: `${totalSteps ? (totalDone / totalSteps) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      <div className="section-head">
        <span className="section-head-title">Trayectorias de reconexión</span>
      </div>
      {recomendada && (
        <p className="muted" style={{ marginTop: -8, marginBottom: 10 }}>
          Según cómo suelen vincularse y el clima de hoy, les sugerimos empezar por la trayectoria marcada abajo.
        </p>
      )}

      {TRACKS.map((track) => {
        const done = doneCount(track);
        const total = track.steps.length;
        const pct = total ? (done / total) * 100 : 0;
        const isOpen = open === track.id;
        const complete = mounted && pct === 100;
        const isRecommended = recomendada === track.id;
        return (
          <div
            className="card card-2"
            key={track.id}
            style={{
              marginBottom: 14,
              ...(isRecommended
                ? { borderColor: "rgba(212,175,55,.55)", boxShadow: "0 0 0 1px rgba(212,175,55,.3), 0 12px 40px rgba(0,0,0,.35)" }
                : {}),
            }}
          >
            <button
              onClick={() => setOpen(isOpen ? "" : track.id)}
              style={{
                background: "none", border: "none", cursor: "pointer", color: "var(--text)",
                width: "100%", textAlign: "left", padding: 0, display: "flex",
                alignItems: "center", gap: 12,
              }}
            >
              <div style={{ fontSize: 28 }}>{track.emoji}</div>
              <div style={{ flex: 1 }}>
                {isRecommended && (
                  <span className="badge" style={{ marginBottom: 6, display: "inline-block" }}>
                    ✷ sugerida para hoy
                  </span>
                )}
                <div className="section-title" style={{ margin: 0 }}>{track.title}</div>
                <p className="muted" style={{ margin: "2px 0 0" }}>{track.intro}</p>
              </div>
              <span className="badge" style={{ whiteSpace: "nowrap" }}>
                {mounted ? (complete ? `✓ ${done}/${total}` : `${done}/${total}`) : `0/${total}`}
              </span>
              <span className="muted" style={{ fontSize: 18 }}>{isOpen ? "▾" : "▸"}</span>
            </button>

            <div className="progress" style={{ marginTop: 14, marginBottom: isOpen ? 4 : 0 }}>
              <i style={{ width: `${mounted ? pct : 0}%` }} />
            </div>

            {isOpen && (
              <div className="opts" style={{ marginTop: 14 }}>
                {track.steps.map((step, i) => {
                  const checked = mounted && !!checks[`${track.id}:${i}`];
                  return (
                    <button
                      key={i}
                      className={`opt ${checked ? "sel" : ""}`}
                      onClick={() => toggleStep(track, i)}
                      style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          flex: "0 0 22px", width: 22, height: 22, borderRadius: 6,
                          border: "1.5px solid rgba(232,195,122,.6)", display: "inline-flex",
                          alignItems: "center", justifyContent: "center", marginTop: 1,
                          color: "var(--gold)", fontWeight: 700,
                          background: checked ? "rgba(232,195,122,.18)" : "transparent",
                        }}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      <span style={{ textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.75 : 1 }}>
                        {step}
                      </span>
                    </button>
                  );
                })}
                {complete && (
                  <p className="hint" style={{ margin: "4px 0 0" }}>
                    Trayectoria completa. Cuando quieran, pueden volver a repasarla juntos.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      <hr className="hr" />
      <p className="disclaimer" style={{ textAlign: "center" }}>
        Modo demo: tu progreso se guarda solo en este navegador. En la app final, queda en tu
        cuenta, sincronizado entre tú y tu amor.
      </p>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <Link className="btn btn-ghost" href={`/hub${qs()}`}>← Volver a nuestra app</Link>
      </div>
      <footer>Forja del Amor · prototipo — cuidar el vínculo, nunca controlar al otro.</footer>
    </main>
  );
}

export default function Reconectar() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
      <ReconectarInner />
    </Suspense>
  );
}
