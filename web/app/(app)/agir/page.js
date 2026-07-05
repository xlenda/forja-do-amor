"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Ideas de encuentro (mezcla de casa, aire libre, económicas y especiales)
// lang: a qué lenguaje del amor (de Descubrir) le habla más esta idea — para poder priorizar sin inventar nada nuevo.
const DATE_IDEAS = [
  { id: "i1", tag: "en casa", lang: "tempo", text: "Noche de cine en casa: cada uno elige una película, el otro prepara las palomitas." },
  { id: "i2", tag: "en casa", lang: "servico", text: "Cocinar juntos una receta nueva que ninguno de los dos haya hecho antes." },
  { id: "i3", tag: "en casa", lang: "toque", text: "Picnic en el piso de la sala, luces apagadas y velas encendidas." },
  { id: "i4", tag: "en casa", lang: "toque", text: "Tarde de juegos: cartas, mesa o videojuego, con una caricia de premio." },
  { id: "i5", tag: "al aire libre", lang: "tempo", text: "Caminata al atardecer en un lugar donde nunca hayan estado juntos." },
  { id: "i6", tag: "al aire libre", lang: "tempo", text: "Llevar un café y sentarse en una banca de la plaza a ver pasar el día." },
  { id: "i7", tag: "al aire libre", lang: "tempo", text: "Andar en bici por un parque en una mañana soleada." },
  { id: "i8", tag: "al aire libre", lang: "toque", text: "Recostarse en el pasto por la noche e intentar encontrar constelaciones juntos." },
  { id: "i9", tag: "económico", lang: "servico", text: "Ir a un mercado local: comprar ingredientes e improvisar una cena." },
  { id: "i10", tag: "económico", lang: "presentes", text: "Visitar una librería y regalarse mutuamente un libro económico." },
  { id: "i11", tag: "económico", lang: "tempo", text: "Hacer un tour a pie por el barrio, fingiendo ser turistas en su propia ciudad." },
  { id: "i12", tag: "económico", lang: "tempo", text: "Tarde de helado: probar un sabor que ninguno de los dos pediría solo." },
  { id: "i13", tag: "especial", lang: "tempo", text: "Recrear su primera cita, tal como fue." },
  { id: "i14", tag: "especial", lang: "palavras", text: "Escribirse una carta el uno al otro e intercambiarla a la hora de la cena." },
  { id: "i15", tag: "especial", lang: "tempo", text: "Planear juntos una micro-escapada de un día para el próximo mes." },
];

const LANG_LABELS_AGIR = {
  palavras: "palabras de afirmación",
  tempo: "tiempo de calidad",
  presentes: "regalos",
  servico: "actos de servicio",
  toque: "contacto físico",
};

// Desafío de 7 días
const CHALLENGE = [
  { id: "d1", text: "Envía un mensaje diciendo algo que admiras de él/ella." },
  { id: "d2", text: "Dale un abrazo de 20 segundos, sin apuro." },
  { id: "d3", text: "Haz una pregunta que nunca le hayas hecho y escucha de verdad." },
  { id: "d4", text: "Encárgate de una tarea que suele hacer el otro, sin pedir nada a cambio." },
  { id: "d5", text: "Recuerden juntos un buen momento que hayan vivido." },
  { id: "d6", text: "Elogia algo pequeño que suele pasar desapercibido." },
  { id: "d7", text: "Planeen juntos algo simple para hacer la próxima semana." },
];

// Gestos posibles para el "gesto del día" (elegido según la fecha)
const DAILY_GESTURES = [
  "Prepara el café o una merienda tal como a él/ella le gusta.",
  "Envía un mensaje a media mañana solo para decir que te acordaste de él/ella.",
  "Guarda 10 minutos sin celular solo para conversar mirándose a los ojos.",
  "Haz un elogio sincero sobre algo más allá del físico.",
  "Deja una notita cariñosa donde él/ella la vaya a encontrar.",
  "Ofrece una caricia en la cabeza o la espalda, sin ningún motivo.",
  "Pregunta cómo fue su día y escucha sin interrumpir.",
  "Encárgate de una pequeña tarea de la casa para aliviarle el día.",
  "Recuerda un momento gracioso que hayan vivido juntos.",
  "Agradece por algo específico que él/ella haya hecho hace poco.",
];

// Hash simple y estable a partir de YYYY-MM-DD
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function AgirInner() {
  const params = useSearchParams();
  const voce = params.get("voce") || "Tú";
  const amor = params.get("amor") || "Tu amor";
  const storageKey = `gff-agir:${voce}:${amor}`;

  const backQuery = () => {
    const q = new URLSearchParams();
    ["voce", "amor", "sa", "sb"].forEach((k) => {
      const v = params.get(k);
      if (v) q.set(k, v);
    });
    const s = q.toString();
    return s ? `?${s}` : "";
  };

  const [mounted, setMounted] = useState(false);
  const [idea, setIdea] = useState(null);
  const [drawKey, setDrawKey] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [done, setDone] = useState([]); // ids del desafío de 7 días
  const [goal, setGoal] = useState("");
  const [goalSaved, setGoalSaved] = useState("");
  const [goalDone, setGoalDone] = useState(false);
  const [linguagem, setLinguagem] = useState(null);
  const [usarLinguagem, setUsarLinguagem] = useState(true);
  const [dreams, setDreams] = useState([]);
  const [dreamInput, setDreamInput] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const d = JSON.parse(raw);
        setFavorites(d.favorites || []);
        setDone(d.done || []);
        setGoalSaved(d.goalSaved || "");
        setGoal(d.goalSaved || "");
        setGoalDone(!!d.goalDone);
        setDreams(d.dreams || []);
      }
      const descobrir = JSON.parse(localStorage.getItem(`gff-descobrir:${voce}:${amor}`) || "{}");
      setLinguagem(descobrir.linguagem?.top || null);
    } catch {}
  }, [storageKey, voce, amor]);

  function persist(next) {
    try {
      const base = { favorites, done, goalSaved, goalDone, dreams };
      localStorage.setItem(storageKey, JSON.stringify({ ...base, ...next }));
    } catch {}
  }

  // 1) Idea de encuentro
  function sortear() {
    let pool = DATE_IDEAS;
    if (usarLinguagem && linguagem) {
      const matching = DATE_IDEAS.filter((d) => d.lang === linguagem);
      if (matching.length > 0) pool = matching;
    }
    let i = Math.floor(Math.random() * pool.length);
    // evita repetir la misma idea dos veces seguidas, cuando hay más de una opción
    if (idea && pool.length > 1 && pool[i].id === idea.id) {
      i = (i + 1) % pool.length;
    }
    setIdea(pool[i]);
    setDrawKey((k) => k + 1); // fuerza el remount para repetir la animación de fade-in
  }

  // 5) Sueños de la pareja (metas de largo plazo, persistentes)
  function addDream(e) {
    e.preventDefault();
    const t = dreamInput.trim();
    if (!t) return;
    const next = [...dreams, { id: String(Date.now()), text: t, done: false, createdAt: todayISO() }];
    setDreams(next);
    persist({ dreams: next });
    setDreamInput("");
  }
  function toggleDream(id) {
    const next = dreams.map((d) => (d.id === id ? { ...d, done: !d.done } : d));
    setDreams(next);
    persist({ dreams: next });
  }
  function delDream(id) {
    const next = dreams.filter((d) => d.id !== id);
    setDreams(next);
    persist({ dreams: next });
  }

  function toggleFav(id) {
    const next = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavorites(next);
    persist({ favorites: next });
  }

  const favList = DATE_IDEAS.filter((d) => favorites.includes(d.id));

  // 2) Desafío de 7 días
  function toggleDone(id) {
    const next = done.includes(id) ? done.filter((d) => d !== id) : [...done, id];
    setDone(next);
    persist({ done: next });
  }
  const progress = Math.round((done.length / CHALLENGE.length) * 100);

  // 3) Gesto del día (determinístico según la fecha)
  const iso = todayISO();
  const gesture = DAILY_GESTURES[hashStr(iso) % DAILY_GESTURES.length];

  // 4) Meta de la semana
  function saveGoal(e) {
    e.preventDefault();
    const g = goal.trim();
    if (!g) return;
    setGoalSaved(g);
    setGoalDone(false);
    persist({ goalSaved: g, goalDone: false });
  }
  function markGoalDone() {
    setGoalDone(true);
    persist({ goalDone: true });
  }
  function clearGoal() {
    setGoalSaved("");
    setGoal("");
    setGoalDone(false);
    persist({ goalSaved: "", goalDone: false });
  }

  return (
    <main className="wrap">
      <div className="couple-header">
        <span className="badge">🎯 Actuar</span>
        <div className="couple-names">{voce} &amp; {amor}</div>
        <div className="couple-meta">pequeños gestos que los acercan 💛</div>
      </div>

      {/* 1) Idea de encuentro */}
      <div className="section-head">
        <span className="section-head-title">Idea para una cita</span>
      </div>
      <div className="card card-2">
        <p className="muted" style={{ marginTop: 0 }}>¿Sin tiempo para pensar? Dejen que nosotros sugiramos.</p>
        {mounted && linguagem && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={usarLinguagem} onChange={(e) => setUsarLinguagem(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--gold)" }} />
            <span className="muted" style={{ fontSize: 13 }}>Priorizar ideas para su lenguaje del amor: {LANG_LABELS_AGIR[linguagem]}</span>
          </label>
        )}
        <button className="btn" onClick={sortear} style={{ marginTop: 4 }}>Sortear una idea ✨</button>
      </div>

      {/* La idea recién sorteada es el foco de la pantalla mientras existe */}
      {idea && (
        <div key={drawKey} className="card card-3 fade-in" style={{ marginTop: 14, textAlign: "center" }}>
          <span className="badge">{idea.tag}</span>
          <p style={{ margin: "14px 0 0", fontSize: 18 }}>{idea.text}</p>
          <button
            className="btn-ghost"
            onClick={() => toggleFav(idea.id)}
            style={{ marginTop: 14, padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontWeight: 700 }}
          >
            {favorites.includes(idea.id) ? "💛 En favoritas" : "🤍 Agregar a favoritas"}
          </button>
        </div>
      )}

      {mounted && (
        <div className="card card-1" style={{ marginTop: 14 }}>
          {favList.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🤍</span>
              <div className="empty-state-title">Todavía no hay favoritas</div>
              <p className="empty-state-desc">Sorteen una idea y guarden aquí las que más les gusten.</p>
            </div>
          ) : (
            <>
              <span className="overline">Favoritas ({favList.length})</span>
              <div className="feature-list" style={{ marginTop: 10 }}>
                {favList.map((f) => (
                  <div key={f.id} className="feature-item">
                    <button
                      className="feature-item-icon"
                      onClick={() => toggleFav(f.id)}
                      title="Quitar de favoritas"
                      style={{ cursor: "pointer" }}
                    >
                      💛
                    </button>
                    <div className="feature-item-text" style={{ flex: 1 }}>
                      <b>{f.tag}</b>
                      <span>{f.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 2) Desafío de 7 días */}
      <div className="section-head">
        <span className="section-head-title">Desafío de 7 días</span>
        {mounted && <span className="section-head-action">{done.length}/{CHALLENGE.length}</span>}
      </div>
      <div className="card card-2">
        <p className="muted" style={{ marginTop: 0 }}>Un gesto por día. A su ritmo, vayan marcando a medida que lo hagan.</p>

        {mounted && <div className="progress"><i style={{ width: `${progress}%` }} /></div>}

        <div className="opts">
          {CHALLENGE.map((c, idx) => {
            const isDone = done.includes(c.id);
            return (
              <button
                key={c.id}
                className={`opt ${isDone ? "sel" : ""}`}
                onClick={() => toggleDone(c.id)}
                style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
              >
                <span style={{ fontSize: 18, lineHeight: 1.4 }}>{isDone ? "✅" : "⬜"}</span>
                <span style={{ flex: 1 }}>
                  <b style={{ color: "var(--gold)" }}>Día {idx + 1}.</b> {c.text}
                </span>
              </button>
            );
          })}
        </div>

        {mounted && progress === 100 && (
          <p className="compat-line fade-in" style={{ marginTop: 14, textAlign: "center" }}>
            <b>¡Desafío completo!</b> {voce} y {amor} se animaron a 7 días de gestos. 💛
          </p>
        )}
      </div>

      {/* 3) Gesto del día */}
      <div className="section-head">
        <span className="section-head-title">Gesto del día</span>
      </div>
      <div className="card card-2" style={{ textAlign: "center" }}>
        <p className="muted" style={{ marginTop: 0 }}>Una idea simple, una por día — la misma para ustedes dos hoy.</p>
        <div style={{ marginTop: 10, padding: 18, borderRadius: 12, background: "linear-gradient(160deg, #171436, #2a2456)", border: "1px solid rgba(232,195,122,.25)" }}>
          <div style={{ fontSize: 28 }}>💛</div>
          <p style={{ margin: "8px 0 0", fontSize: 18 }}>{gesture}</p>
        </div>
      </div>

      {/* 4) Meta de la semana */}
      <div className="section-head">
        <span className="section-head-title">Meta de la semana</span>
      </div>
      <div className="card card-2">
        <p className="muted" style={{ marginTop: 0 }}>Acuerden algo para cuidar juntos esta semana.</p>

        <form onSubmit={saveGoal}>
          <div className="field" style={{ margin: "10px 0" }}>
            <label>Nuestra meta</label>
            <input
              className="input"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ej.: Cenar sin celular dos veces esta semana"
            />
          </div>
          <button className="btn" type="submit">Guardar meta</button>
        </form>

        {mounted && goalSaved && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 12, border: "1px solid var(--line)", background: "rgba(255,255,255,.05)" }}>
            <p style={{ margin: 0, fontSize: 17, textDecoration: goalDone ? "line-through" : "none", opacity: goalDone ? 0.7 : 1 }}>
              {goalDone ? "✅ " : "🎯 "}{goalSaved}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              {!goalDone && (
                <button className="btn" onClick={markGoalDone} style={{ padding: "10px 18px" }}>Marcar como cumplida 💛</button>
              )}
              {goalDone && (
                <span className="compat-line fade-in" style={{ margin: 0 }}><b>¡Meta cumplida!</b> Qué orgullo de ustedes dos.</span>
              )}
              <button className="del" onClick={clearGoal}>cambiar meta</button>
            </div>
          </div>
        )}
      </div>

      {/* 5) Sueños de la pareja (largo plazo) */}
      <div className="section-head">
        <span className="section-head-title">Sueños de la pareja</span>
        {mounted && dreams.length > 0 && (
          <span className="section-head-action">{dreams.filter((d) => d.done).length}/{dreams.length}</span>
        )}
      </div>
      <div className="card card-2">
        <p className="muted" style={{ marginTop: 0 }}>Metas más grandes, sin fecha límite — se quedan aquí hasta que las cumplan.</p>

        <form onSubmit={addDream} style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: "1 1 220px" }}
            value={dreamInput}
            onChange={(e) => setDreamInput(e.target.value)}
            placeholder="Ej.: Ahorrar para nuestro primer viaje juntos"
          />
          <button className="btn" type="submit">Agregar sueño</button>
        </form>

        {mounted && dreams.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">🌠</span>
            <div className="empty-state-title">Todavía no hay sueños guardados</div>
            <p className="empty-state-desc">Agreguen su primera meta grande y quédense acá hasta cumplirla.</p>
          </div>
        )}

        {mounted && dreams.length > 0 && (
          <div className="feature-list" style={{ marginTop: 14 }}>
            {dreams.map((d) => (
              <div key={d.id} className="feature-item">
                <button
                  className="feature-item-icon"
                  onClick={() => toggleDream(d.id)}
                  style={{ cursor: "pointer" }}
                >
                  {d.done ? "✅" : "⬜"}
                </button>
                <div className="feature-item-text" style={{ flex: 1, textDecoration: d.done ? "line-through" : "none", opacity: d.done ? 0.7 : 1 }}>
                  <span>{d.text}</span>
                </div>
                <button className="del" onClick={() => delDream(d.id)}>quitar</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="hr" />
      <p className="disclaimer" style={{ textAlign: "center" }}>
        Modo demo: sus ideas, desafíos y metas se guardan solo en este navegador. En la app final, todo queda en su cuenta, sincronizado entre {voce} y {amor}.
      </p>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <Link className="btn btn-ghost" href={`/hub${backQuery()}`}>← Volver a nuestra app</Link>
      </div>
      <footer>Forja del Amor · prototipo — pequeños gestos, cada día.</footer>
    </main>
  );
}

export default function Agir() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
      <AgirInner />
    </Suspense>
  );
}
