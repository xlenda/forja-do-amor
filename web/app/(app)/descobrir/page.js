"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/* ---------------- Quiz 1: Lenguaje del amor ---------------- */
// Orden de prioridad para desempates
const LANG_ORDER = ["palavras", "tempo", "presentes", "servico", "toque"];

const LANG_LABELS = {
  palavras: "Palabras de afirmación",
  tempo: "Tiempo de calidad",
  presentes: "Regalos",
  servico: "Actos de servicio",
  toque: "Contacto físico",
};

const LANG_QUESTIONS = [
  {
    q: "¿Qué es lo que más te hace sentir amado(a) en el día a día?",
    opts: [
      { t: "Escuchar un cumplido sincero o un “gracias” de verdad", k: "palavras" },
      { t: "Pasar un tiempo que sea solo nuestro, sin apuro y sin celular", k: "tempo" },
      { t: "Recibir un detalle que muestre que pensaron en mí", k: "presentes" },
      { t: "Que alguien resuelva algo por mí incluso antes de pedirlo", k: "servico" },
      { t: "Un abrazo fuerte o estar tomados de la mano", k: "toque" },
    ],
  },
  {
    q: "Después de un día difícil, ¿qué es lo que más te reconforta?",
    opts: [
      { t: "Escuchar “estoy contigo, todo va a salir bien”", k: "palavras" },
      { t: "Sentarnos juntos y conversar con calma sobre todo", k: "tempo" },
      { t: "Llegar a casa y encontrar un detalle esperándome", k: "presentes" },
      { t: "Que alguien se haya encargado de una tarea que era mía", k: "servico" },
      { t: "Un abrazo largo, una caricia en la cabeza, sentirme acurrucado(a)", k: "toque" },
    ],
  },
  {
    q: "¿Cómo sueles demostrar cariño a quien amas?",
    opts: [
      { t: "Diciendo con todas las letras cuánto admiro a esa persona", k: "palavras" },
      { t: "Reservando un tiempo solo para estar juntos", k: "tempo" },
      { t: "Eligiendo regalos con significado", k: "presentes" },
      { t: "Haciendo cosas prácticas que le facilitan la vida", k: "servico" },
      { t: "Con abrazos, besos y cercanía", k: "toque" },
    ],
  },
  {
    q: "¿Cómo sería tu fin de semana ideal en pareja?",
    opts: [
      { t: "Compartiendo muchas buenas conversaciones y palabras cariñosas", k: "palavras" },
      { t: "Un plan tranquilo, con atención total el uno en el otro", k: "tempo" },
      { t: "Una pequeña sorpresa o un intercambio sencillo de regalos", k: "presentes" },
      { t: "Resolver la casa juntos y después relajarnos sin preocupaciones", k: "servico" },
      { t: "Mucho mimo, desde el desayuno en la cama hasta una película abrazados", k: "toque" },
    ],
  },
  {
    q: "Cuando están lejos, ¿qué es lo que más extrañas?",
    opts: [
      { t: "Los mensajes tiernos y el “buenos días, mi amor”", k: "palavras" },
      { t: "Nuestras conversaciones sin hora para terminar", k: "tempo" },
      { t: "Recibir (y mandar) ese detalle desde lejos", k: "presentes" },
      { t: "Tener a alguien con quien repartir las tareas del día", k: "servico" },
      { t: "El abrazo y simplemente estar cerquita", k: "toque" },
    ],
  },
  {
    q: "¿Qué gesto de tu amor te toca más profundo?",
    opts: [
      { t: "Cuando nota algo en mí y lo dice en voz alta", k: "palavras" },
      { t: "Cuando deja todo solo para prestarme atención", k: "tempo" },
      { t: "Cuando guarda un detalle y lo convierte en un regalo", k: "presentes" },
      { t: "Cuando actúa para aliviarme una carga sin que se lo pida", k: "servico" },
      { t: "Cuando me acerca hacia sí en un momento inesperado", k: "toque" },
    ],
  },
];

const LANG_RESULTS = {
  palavras: {
    emoji: "💬",
    texto:
      "Floreces cuando el amor se convierte en palabra: un cumplido sincero, un “estoy orgulloso(a) de ti”, una nota inesperada. Escuchar en voz alta que eres querido(a) te da seguridad y calienta tu día. El reconocimiento, para ti, es una forma concreta de cuidado.",
    dica:
      "Consejo para ustedes: pónganse de acuerdo en decir, cada noche, algo que admiraron el uno del otro ese día — también vale por mensaje.",
  },
  tempo: {
    emoji: "⏳",
    texto:
      "Lo que más te llena es la atención de verdad: estar juntos, sin apuro y sin distracciones. Un tiempo que sea solo de ustedes vale más que cualquier cosa material. La presencia, para ti, es la mayor prueba de amor.",
    dica:
      "Consejo para ustedes: reserven un momento fijo en la semana sin pantallas — aunque sean solo 20 minutos para conversar mirándose a los ojos.",
  },
  presentes: {
    emoji: "🎁",
    texto:
      "Para ti, un regalo no se trata del precio — se trata de la intención detrás de él. Un detalle sencillo muestra que alguien te tuvo presente incluso a la distancia. Esos gestos se convierten en símbolos de cariño que llevas contigo.",
    dica:
      "Consejo para ustedes: lleven una “listita de detalles” el uno del otro (gustos, sueños, deseos) para acertar de lleno en las próximas sorpresas.",
  },
  servico: {
    emoji: "🤝",
    texto:
      "Sientes el amor cuando se convierte en acción: alguien que resuelve, ayuda y te quita un peso de encima. Las actitudes prácticas, para ti, hablan más fuerte que las promesas. Cuidar del día a día juntos es tu manera favorita de amar y ser amado(a).",
    dica:
      "Consejo para ustedes: pregúntense “¿qué te puedo quitar de encima hoy?” — y dejen que el otro sienta que no está solo.",
  },
  toque: {
    emoji: "🤍",
    texto:
      "Para ti, la conexión pasa mucho por el cuerpo: un abrazo, la mano tomada, el mimo que calma. El contacto cariñoso te hace sentir seguro(a) y presente en el vínculo. Es por ahí que el cariño te llega más hondo.",
    dica:
      "Consejo para ustedes: creen pequeños rituales de contacto — un abrazo de 20 segundos al reencontrarse ya cambia el clima del día.",
  },
};

/* ---------------- Quiz 2: Estilo de apego ---------------- */
const ATT_ORDER = ["seguro", "ansioso", "evitativo"];

const ATT_LABELS = {
  seguro: "Estilo seguro",
  ansioso: "Estilo ansioso",
  evitativo: "Estilo evitativo",
};

const ATT_QUESTIONS = [
  {
    q: "Cuando surge un desacuerdo entre ustedes, tú tiendes a...",
    opts: [
      { t: "Conversar con calma, confiando en que lo van a resolver juntos", k: "seguro" },
      { t: "Angustiarte y querer resolverlo todo en el momento", k: "ansioso" },
      { t: "Necesitar un tiempo a solas antes de poder hablar", k: "evitativo" },
    ],
  },
  {
    q: "Cuando tu amor tarda en responder un mensaje...",
    opts: [
      { t: "Sigo tranquilo(a), sé que responde cuando puede", k: "seguro" },
      { t: "Empiezo a imaginar que tal vez algo anda mal", k: "ansioso" },
      { t: "Ni lo noto tanto — cada quien a su ritmo", k: "evitativo" },
    ],
  },
  {
    q: "Sobre hablar de sentimientos en la relación...",
    opts: [
      { t: "Me siento cómodo(a) para abrir el corazón", k: "seguro" },
      { t: "Quiero mucho, pero a veces temo estar siendo demasiado", k: "ansioso" },
      { t: "Prefiero guardarme algunas cosas para mí", k: "evitativo" },
    ],
  },
  {
    q: "En los momentos de mucha cercanía e intimidad...",
    opts: [
      { t: "Disfruto la conexión sin dejar de ser yo mismo(a)", k: "seguro" },
      { t: "Me gustaría que fuera así, bien pegaditos, todo el tiempo", k: "ansioso" },
      { t: "De vez en cuando siento la necesidad de un respiro", k: "evitativo" },
    ],
  },
  {
    q: "Pensando en contar con el otro en el día a día...",
    opts: [
      { t: "Confío en él/ella y también me gusta ser un apoyo", k: "seguro" },
      { t: "Me da miedo que, algún día, me dejen de lado", k: "ansioso" },
      { t: "Prefiero, la mayoría de las veces, contar conmigo mismo(a)", k: "evitativo" },
    ],
  },
];

const ATT_RESULTS = {
  seguro: {
    emoji: "🌿",
    texto:
      "Tiendes a sentirte cómodo(a) tanto en la cercanía como en tu individualidad. Confías con naturalidad y logras hablar de lo que sientes sin perderte en el proceso. Esto no es una etiqueta fija — es una forma de ser que se construye y se cultiva en el día a día.",
    dica:
      "Consejo para ustedes: usen esta base de confianza para crear un “espacio seguro” donde puedan hablar de inseguridades sin miedo a ser juzgados.",
  },
  ansioso: {
    emoji: "🌊",
    texto:
      "Valoras mucho la conexión y a veces estás atento(a) a señales de distancia, buscando reforzar el vínculo. Ese cuidado muestra cuánto te importa la relación. No es ningún defecto — es una necesidad de cercanía que se puede conversar con cariño.",
    dica:
      "Consejo para ustedes: acuerden pequeños gestos de reafirmación (un “estoy aquí”, un buenos días puntual) que calman sin volverse una exigencia.",
  },
  evitativo: {
    emoji: "🏔️",
    texto:
      "Valoras tu autonomía y a veces necesitas un espacio propio para procesar antes de compartir. Esto no significa amar menos — es una forma de sentirte seguro(a). Reconocer este ritmo ayuda a que ambos se encuentren a mitad de camino.",
    dica:
      "Consejo para ustedes: cuando necesites espacio, avisa con cariño (“necesito un tiempito y ya vuelvo”) para que el otro no lo interprete como un alejamiento.",
  },
};

/* ---------------- Motor de quiz ---------------- */
function computeTop(answers, order) {
  const counts = {};
  order.forEach((k) => (counts[k] = 0));
  answers.forEach((k) => {
    if (k) counts[k] = (counts[k] || 0) + 1;
  });
  let top = order[0];
  order.forEach((k) => {
    if (counts[k] > counts[top]) top = k;
  });
  return { top, counts };
}

function Quiz({ questions, order, labels, results, resultBadge, saved, onSave }) {
  const [answers, setAnswers] = useState([]);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(saved || null);
  const [tick, setTick] = useState(0);

  const total = questions.length;
  const answered = answers.filter(Boolean).length;
  const pct = Math.round((answered / total) * 100);

  // Animación de conteo: cuando aparece un resultado, las cifras del balance suben de a poco.
  useEffect(() => {
    if (!result) {
      setTick(0);
      return;
    }
    const maxNeeded = Math.max(0, ...order.map((k) => result.counts[k] || 0));
    if (maxNeeded === 0) {
      setTick(0);
      return;
    }
    setTick(0);
    let current = 0;
    const id = setInterval(() => {
      current += 1;
      setTick(current);
      if (current >= maxNeeded) clearInterval(id);
    }, 110);
    return () => clearInterval(id);
  }, [result]);

  function choose(k) {
    const next = [...answers];
    next[step] = k;
    setAnswers(next);
  }

  function next() {
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      const res = computeTop(answers, order);
      setResult(res);
      onSave(res);
    }
  }

  function redo() {
    setAnswers([]);
    setStep(0);
    setResult(null);
  }

  if (result) {
    const r = results[result.top];
    return (
      <div className="card">
        <div style={{ textAlign: "center" }}>
          <span className="badge">{resultBadge}</span>
          <div key={result.top} className="quiz-result-emoji" style={{ fontSize: 46, margin: "14px 0 4px" }}>{r.emoji}</div>
          <h2 className="reveal-title" style={{ fontSize: 28 }}>{labels[result.top]}</h2>
        </div>
        <p className="muted" style={{ margin: "10px 0 18px" }}>{r.texto}</p>
        <div className="card" style={{ background: "rgba(232,195,122,.08)", borderColor: "rgba(232,195,122,.3)" }}>
          <p style={{ margin: 0 }}>{r.dica}</p>
        </div>

        <div className="section-title" style={{ fontSize: 18, margin: "22px 0 10px" }}>Así quedó tu balance</div>
        {order.map((k) => {
          const shown = Math.min(tick, result.counts[k] || 0);
          const barPct = total ? Math.round((shown / total) * 100) : 0;
          return (
            <div key={k} style={{ marginBottom: 14 }}>
              <div className="compat-line" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: 0 }}>
                <span>{labels[k]}</span>
                <b>{shown}</b>
              </div>
              <div className="progress" style={{ height: 5, margin: "6px 0 0" }}>
                <i style={{ width: `${barPct}%` }} />
              </div>
            </div>
          );
        })}

        <div style={{ textAlign: "center", marginTop: 22 }}>
          <button className="btn btn-ghost" onClick={redo}>Rehacer</button>
        </div>
      </div>
    );
  }

  const current = questions[step];
  const chosen = answers[step];

  return (
    <div className="card">
      <div className="progress"><i style={{ width: `${pct}%` }} /></div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Pregunta {step + 1} de {total}</div>
      <div className="section-title" style={{ margin: "0 0 14px" }}>{current.q}</div>

      <div className="opts">
        {current.opts.map((o, i) => (
          <button
            key={i}
            className={`opt ${chosen === o.k ? "sel" : ""}`}
            onClick={() => choose(o.k)}
            type="button"
          >
            {chosen === o.k ? "✓ " : ""}{o.t}
          </button>
        ))}
      </div>

      <div className="nav-row">
        <button
          className="btn btn-ghost"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          type="button"
        >
          Atrás
        </button>
        <button className="btn" onClick={next} disabled={!chosen} type="button">
          {step < total - 1 ? "Siguiente" : "Ver resultado"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Página ---------------- */
function DescobrirInner() {
  const params = useSearchParams();
  const voce = params.get("voce") || "Tú";
  const amor = params.get("amor") || "Tu amor";
  const storageKey = `gff-descobrir:${voce}:${amor}`;

  const hubQuery = new URLSearchParams();
  [["voce", voce], ["amor", amor]].forEach(([k, v]) => v && hubQuery.set(k, v));

  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState("linguagem");
  const [data, setData] = useState({ linguagem: null, apego: null });

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const d = JSON.parse(raw);
        setData({ linguagem: d.linguagem || null, apego: d.apego || null });
      } else {
        setData({ linguagem: null, apego: null });
      }
    } catch {}
  }, [storageKey]);

  function saveQuiz(id, res) {
    setData((prev) => {
      const next = { ...prev, [id]: res };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return (
    <main className="wrap">
      <div className="couple-header">
        <span className="badge">Descubrir</span>
        <div className="couple-names">{voce} &amp; {amor}</div>
        <div className="couple-meta">conocerse mejor para amarse mejor 💛</div>
      </div>

      <p className="muted" style={{ textAlign: "center", marginBottom: 18 }}>
        Dos pruebas rápidas para que {voce} y {amor} abran una buena conversación. No hay respuestas correctas ni incorrectas — solo una invitación a entenderse con más cariño.
      </p>

      {/* Tabs */}
      <div className="grid2" style={{ marginBottom: 20 }}>
        <button
          className={tab === "linguagem" ? "btn" : "btn btn-ghost"}
          onClick={() => setTab("linguagem")}
          type="button"
        >
          Lenguaje del amor
        </button>
        <button
          className={tab === "apego" ? "btn" : "btn btn-ghost"}
          onClick={() => setTab("apego")}
          type="button"
        >
          Estilo de apego
        </button>
      </div>

      {!mounted ? (
        <p className="muted" style={{ textAlign: "center" }}>Cargando...</p>
      ) : tab === "linguagem" ? (
        <Quiz
          key={`ling-${storageKey}`}
          questions={LANG_QUESTIONS}
          order={LANG_ORDER}
          labels={LANG_LABELS}
          results={LANG_RESULTS}
          resultBadge={`El lenguaje principal de ${voce}`}
          saved={data.linguagem}
          onSave={(res) => saveQuiz("linguagem", res)}
        />
      ) : (
        <Quiz
          key={`apego-${storageKey}`}
          questions={ATT_QUESTIONS}
          order={ATT_ORDER}
          labels={ATT_LABELS}
          results={ATT_RESULTS}
          resultBadge={`El estilo predominante de ${voce}`}
          saved={data.apego}
          onSave={(res) => saveQuiz("apego", res)}
        />
      )}

      <hr className="hr" />
      <p className="disclaimer" style={{ textAlign: "center" }}>
        Esto es una reflexión para que conversen, no un diagnóstico. Nadie se resume a una etiqueta — y estas formas de amar y vincularse pueden cambiar y crecer con el tiempo.
      </p>

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <Link className="btn btn-ghost" href={`/hub?${hubQuery.toString()}`}>Volver al hub</Link>
      </div>
      <footer>Forja del Amor · prototipo — suscripción transparente, cancelable cuando quieras.</footer>
    </main>
  );
}

export default function Descobrir() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
      <DescobrirInner />
    </Suspense>
  );
}
