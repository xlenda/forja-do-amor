"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["Ustedes", "Signo y Nacimiento", "Energía", "Cartas", "Astros"];
import { SIGNS, compatibility, compatPercent, cosmicNumbers, frequenciaFor, CARDS, moonSign, signoFromDate } from "@/lib/signs.es";

const ENERGIAS = [
  "Romántica 💕",
  "Apasionada 🔥",
  "Poderosa ⚡",
  "Reflexiva 🌙",
  "Distantes 🌫️",
  "En conflicto 😔",
  "En crisis 💔",
  "Recomenzando 🌱",
];

const ENERGIA_ECO = {
  "Romántica 💕": "Se nota — este mapa va a mostrar de dónde nace esa chispa.",
  "Apasionada 🔥": "Intensa. Veamos qué la sostiene cuando baja la llama.",
  "Poderosa ⚡": "Dos fuerzas juntas. Ese poder también se cuida.",
  "Reflexiva 🌙": "Un momento de mirar hacia adentro, los dos.",
  "Distantes 🌫️": "La distancia también tiene mapa — y camino de vuelta, juntos.",
  "En conflicto 😔": "Están acá, juntos, buscándolo. Eso ya dice mucho.",
  "En crisis 💔": "Momentos así aprietan. Que estén los dos acá es un buen comienzo.",
  "Recomenzando 🌱": "Recomenzar es valiente. Empecemos por su cielo.",
};

const MOON_NEED = {
  fuego: "necesita chispa y movimiento para sentirse en casa",
  tierra: "necesita constancia y gestos concretos para sentirse en calma",
  aire: "necesita conversar y entender para sentirse cerca",
  agua: "necesita ternura y contacto para sentirse a salvo",
};

function Typewriter({ text, speed = 45 }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <span>{shown}</span>;
}

function CountUp({ to, duration = 1200 }) {
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

async function descargarResultado(elId, filename) {
  try {
    const html2canvas = (await import("html2canvas")).default;
    const el = document.getElementById(elId);
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: "#06000f", scale: 2 });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {}
}

function horaDorada(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hh = h % 24;
  const mm = (h >> 3) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

const hoyISO = new Date().toISOString().slice(0, 10);

export default function Quiz() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [voce, setVoce] = useState("");
  const [amor, setAmor] = useState("");
  const [signoVoce, setSignoVoce] = useState("");
  const [signoAmor, setSignoAmor] = useState("");
  const [nascVoce, setNascVoce] = useState("");
  const [nascAmor, setNascAmor] = useState("");
  const [nascHoraVoce, setNascHoraVoce] = useState("");
  const [nascHoraAmor, setNascHoraAmor] = useState("");
  const [signoManualVoce, setSignoManualVoce] = useState(false);
  const [signoManualAmor, setSignoManualAmor] = useState(false);
  const [desejo, setDesejo] = useState("");
  const [cartas, setCartas] = useState([]);
  const [analisando, setAnalisando] = useState(false);
  const [fase, setFase] = useState(0);
  const [aviso, setAviso] = useState("");
  const amorRef = useRef(null);

  const total = 5;

  function toggleCarta(name) {
    setCartas((prev) =>
      prev.includes(name)
        ? prev.filter((c) => c !== name)
        : prev.length < 3
        ? [...prev, name]
        : prev
    );
  }

  function onNascVoceChange(v) {
    setNascVoce(v);
    const auto = signoFromDate(v);
    if (auto) setSignoVoce(auto);
  }
  function onNascAmorChange(v) {
    setNascAmor(v);
    const auto = signoFromDate(v);
    if (auto) setSignoAmor(auto);
  }

  // Destaca visualmente o campo vazio específico, além do aviso de texto (que fica longe, embaixo da tela).
  const inputInvalidoStyle = { borderColor: "var(--gold-bright)", boxShadow: "0 0 0 2px rgba(245,215,110,.35)" };
  const avisoNomeVoce = Boolean(aviso) && step === 1 && !voce;
  const avisoNomeAmor = Boolean(aviso) && step === 1 && Boolean(voce) && !amor;
  const avisoFechaVoce = Boolean(aviso) && step === 2 && !nascVoce;
  const avisoFechaAmor = Boolean(aviso) && step === 2 && Boolean(nascVoce) && !nascAmor;

  const compat = signoVoce && signoAmor ? compatibility(signoVoce, signoAmor) : null;
  const lunaA = moonSign(nascVoce, nascHoraVoce);
  const lunaB = moonSign(nascAmor, nascHoraAmor);

  const canNext =
    (step === 1 && voce && amor) ||
    (step === 2 && nascVoce && nascAmor && signoVoce && signoAmor) ||
    (step === 3 && desejo) ||
    (step === 4 && cartas.length === 3) ||
    step === 5;

  const AVISOS = {
    1: !voce ? "Escribí tu nombre para continuar." : !amor ? "Falta el nombre de tu amor." : "",
    2: !nascVoce ? `Falta la fecha de nacimiento de ${voce || "ustedes"}.` : !nascAmor ? `Falta la fecha de nacimiento de ${amor || "su amor"}.` : !signoVoce || !signoAmor ? "Revisá las fechas — no pudimos calcular el signo." : "",
    3: !desejo ? "Elegí la energía de ustedes ahora." : "",
    4: cartas.length < 3 ? `Elegí 3 cartas — te faltan ${3 - cartas.length}.` : "",
  };

  useEffect(() => setAviso(""), [voce, amor, signoVoce, signoAmor, nascVoce, nascAmor, desejo, cartas.length]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gff-quiz-draft");
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.voce) setVoce(d.voce);
      if (d.amor) setAmor(d.amor);
      if (d.signoVoce) setSignoVoce(d.signoVoce);
      if (d.signoAmor) setSignoAmor(d.signoAmor);
      if (d.nascVoce) setNascVoce(d.nascVoce);
      if (d.nascAmor) setNascAmor(d.nascAmor);
      if (d.nascHoraVoce) setNascHoraVoce(d.nascHoraVoce);
      if (d.nascHoraAmor) setNascHoraAmor(d.nascHoraAmor);
      if (d.desejo) setDesejo(d.desejo);
      if (Array.isArray(d.cartas)) setCartas(d.cartas);
      if (d.step) setStep(d.step);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "gff-quiz-draft",
        JSON.stringify({ voce, amor, signoVoce, signoAmor, nascVoce, nascAmor, nascHoraVoce, nascHoraAmor, desejo, cartas, step })
      );
    } catch {}
  }, [voce, amor, signoVoce, signoAmor, nascVoce, nascAmor, nascHoraVoce, nascHoraAmor, desejo, cartas, step]);

  useEffect(() => {
    if (step === 5 && compat && typeof window !== "undefined") {
      window.fbq && window.fbq("track", "ViewContent", { content_name: "lectura_pareja", content_category: "astrologia" });
      window.gtag && window.gtag("event", "view_item", { item_name: "lectura_pareja" });
    }
  }, [step, compat]);

  function irASellar() {
    try {
      localStorage.removeItem("gff-quiz-draft");
    } catch {}
    const q = new URLSearchParams({ voce, amor, sa: signoVoce, sb: signoAmor, en: desejo });
    router.push(`/selar?${q.toString()}`);
  }

  function avancar() {
    if (step === 4) {
      const canalMsgs = [
        `Leyendo el cielo de ${voce} & ${amor}…`,
        `Cruzando ${signoVoce} con ${signoAmor}…`,
        `Trazando su mapa…`,
      ];
      setAnalisando(canalMsgs);
      setFase(0);
      const id = setInterval(() => {
        setFase((f) => {
          if (f + 1 >= canalMsgs.length) {
            clearInterval(id);
            setTimeout(() => {
              setAnalisando(false);
              setStep(5);
            }, 350);
          }
          return f + 1;
        });
      }, 350);
    } else {
      setStep(step + 1);
    }
  }

  function handleContinuar() {
    if (!canNext) {
      setAviso(AVISOS[step] || "Completá este paso para continuar.");
      return;
    }
    setAviso("");
    avancar();
  }

  if (analisando) {
    const canalMsgs = analisando;
    const idx = Math.min(fase, canalMsgs.length - 1);
    return (
      <main className="wrap">
        <div className="loading">
          <div className="orb">✴</div>
          <h2 style={{ minHeight: 30 }}>{canalMsgs[idx]}</h2>
          <div className="progress" style={{ maxWidth: 260, margin: "16px auto 0" }}>
            <i style={{ width: `${((idx + 1) / canalMsgs.length) * 100}%` }} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="stepper">
        {STEPS.map((label, idx) => {
          const n = idx + 1;
          const state = n < step ? "done" : n === step ? "now" : "";
          return (
            <Fragment key={label}>
              {idx > 0 && <div className={`bar ${n <= step ? "done" : ""}`} />}
              <div className="st">
                <div className={`dot ${state}`}>{n < step ? "✓" : n}</div>
                <div className="lbl">{label}</div>
              </div>
            </Fragment>
          );
        })}
      </div>

      {step === 1 ? (
        <>
          <div className="line-label"><span>Astrología de la pareja</span></div>
          <div className="bigstar">✴</div>
          <h1 className="reveal-title">Trío Cósmico de la Pareja</h1>
          <p className="reveal-sub gold-italic" style={{ fontSize: 22, marginTop: -10 }}>
            en construcción
          </p>
          <p className="reveal-sub" style={{ fontSize: 15, maxWidth: 440, margin: "8px auto 8px" }}>
            Sol + Ascendente + Luna. Cartas. Compatibilidad de la pareja. El mapa cósmico de ustedes, completo.
          </p>
        </>
      ) : (
        <>
          <div className="bigstar" style={{ fontSize: 40, margin: "6px 0 8px" }}>✴</div>
          <h1 className="reveal-title" style={{ fontSize: 24 }}>
            Trío Cósmico de {voce} &amp; {amor}
          </h1>
          <div className="build-strip">
            {voce && amor && <span className="chip">{voce} &amp; {amor}</span>}
            {signoVoce && <span className="chip">☉ {signoVoce}</span>}
            {signoAmor && <span className="chip">☉ {signoAmor}</span>}
            {lunaA && <span className="chip">☽ {lunaA.name}</span>}
            {desejo && <span className="chip">{desejo}</span>}
            {cartas.map((n) => (
              <span key={n} className="chip">{CARDS.find((c) => c.name === n)?.emoji}</span>
            ))}
          </div>
        </>
      )}

      {step < 5 && <p className="step-label">Paso {step} de {total} · {STEPS[step - 1]}</p>}

      {step === 1 && (
        <div>
          <div className="section-head">
            <span className="section-head-title">¿Cómo se llaman?</span>
          </div>
          <div className="form-wrap">
            <div className="field">
              <label>Tu nombre</label>
              <input
                className="input"
                autoFocus
                autoCapitalize="words"
                autoComplete="off"
                enterKeyHint="next"
                value={voce}
                onChange={(e) => setVoce(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); amorRef.current?.focus(); } }}
                placeholder="Ej.: Ana"
                style={avisoNomeVoce ? inputInvalidoStyle : undefined}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Nombre de tu amor</label>
              <input
                className="input"
                ref={amorRef}
                autoCapitalize="words"
                autoComplete="off"
                enterKeyHint="done"
                value={amor}
                onChange={(e) => setAmor(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && voce && amor) { e.preventDefault(); handleContinuar(); } }}
                placeholder="Ej.: Leo"
                style={avisoNomeAmor ? inputInvalidoStyle : undefined}
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="section-head">
            <span className="section-head-title">Fecha de nacimiento de cada uno</span>
          </div>
          <p className="muted" style={{ textAlign: "center", marginBottom: 6 }}>
            Con la fecha ya sabemos el signo de cada uno. La hora es opcional — pero revela el Ascendente.
          </p>
          <div className="form-wrap">
            <div className="grid2">
              <div className="field">
                <label>Fecha de {voce}</label>
                <input className="input" type="date" max={hoyISO} min="1900-01-01" value={nascVoce} onChange={(e) => onNascVoceChange(e.target.value)} style={avisoFechaVoce ? inputInvalidoStyle : undefined} />
              </div>
              <div className="field">
                <label>Hora de {voce} (opcional)</label>
                <input className="input" type="time" value={nascHoraVoce} onChange={(e) => setNascHoraVoce(e.target.value)} />
              </div>
            </div>
            {signoVoce && (
              <p className="muted" style={{ fontSize: 13, marginTop: -6 }}>
                Signo de {voce}: <b style={{ color: "var(--gold-bright)" }}>{signoVoce}</b>{" "}
                <button type="button" className="link-like" style={{ background: "none", border: "none", color: "var(--gold)", textDecoration: "underline", cursor: "pointer", fontSize: 13 }} onClick={() => setSignoManualVoce((v) => !v)}>
                  {signoManualVoce ? "ocultar" : "no es mi signo"}
                </button>
              </p>
            )}
            {signoManualVoce && (
              <div className="zgrid" style={{ marginBottom: 14 }}>
                {SIGNS.map((s) => {
                  const sel = signoVoce === s.name;
                  return (
                    <button type="button" key={s.name} className={`zcell ${sel ? "sel" : ""}`} aria-pressed={sel} onClick={() => setSignoVoce(s.name)}>
                      <div className="sym">{s.emoji}</div>
                      <div className="nm">{s.name}</div>
                      <div className="rg">{s.range}</div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid2" style={{ marginTop: 16 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Fecha de {amor}</label>
                <input className="input" type="date" max={hoyISO} min="1900-01-01" value={nascAmor} onChange={(e) => onNascAmorChange(e.target.value)} style={avisoFechaAmor ? inputInvalidoStyle : undefined} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Hora de {amor} (opcional)</label>
                <input className="input" type="time" value={nascHoraAmor} onChange={(e) => setNascHoraAmor(e.target.value)} />
              </div>
            </div>
            {signoAmor && (
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                Signo de {amor}: <b style={{ color: "var(--gold-bright)" }}>{signoAmor}</b>{" "}
                <button type="button" className="link-like" style={{ background: "none", border: "none", color: "var(--gold)", textDecoration: "underline", cursor: "pointer", fontSize: 13 }} onClick={() => setSignoManualAmor((v) => !v)}>
                  {signoManualAmor ? "ocultar" : "no es su signo"}
                </button>
              </p>
            )}
            {signoManualAmor && (
              <div className="zgrid">
                {SIGNS.map((s) => {
                  const sel = signoAmor === s.name;
                  return (
                    <button type="button" key={s.name} className={`zcell ${sel ? "sel" : ""}`} aria-pressed={sel} onClick={() => setSignoAmor(s.name)}>
                      <div className="sym">{s.emoji}</div>
                      <div className="nm">{s.name}</div>
                      <div className="rg">{s.range}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="section-head">
            <span className="section-head-title">{voce} y {amor}: ¿cuál es la energía de ustedes ahora?</span>
          </div>
          <div className="card card-2">
            <div className="opts" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {ENERGIAS.map((d) => (
                <button key={d} type="button" className={`opt ${desejo === d ? "sel" : ""}`} style={{ textAlign: "center" }} onClick={() => setDesejo(d)}>
                  {d}
                </button>
              ))}
            </div>
            {desejo && <p className="reveal-sub" style={{ marginTop: 14, marginBottom: 0 }}>{ENERGIA_ECO[desejo]}</p>}
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="section-head">
            <span className="section-head-title">{voce} y {amor}, elijan 3 cartas</span>
          </div>
          <div className="card card-2" style={{ textAlign: "center" }}>
            <p className="muted">
              {cartas.length < 3
                ? <>Ahora eligen su carta del <b>{["Pasado", "Presente", "Futuro"][cartas.length]}</b> · {cartas.length}/3</>
                : `El pasado, el presente y el futuro de ${voce} & ${amor} ya están sobre la mesa.`}
            </p>
            <div className="tarot-deck">
              {CARDS.map((c) => {
                const flipped = cartas.includes(c.name);
                const disabled = !flipped && cartas.length >= 3;
                return (
                  <button
                    type="button"
                    key={c.name}
                    className={`tarot-card ${flipped ? "flipped" : ""} ${disabled ? "disabled" : ""}`}
                    aria-pressed={flipped}
                    aria-disabled={disabled}
                    aria-label={`Carta ${c.name}, ${flipped ? "elegida" : "sin elegir"}`}
                    onClick={() => !disabled && toggleCarta(c.name)}
                  >
                    <div className="tarot-card-face tarot-card-back">✷</div>
                    <div className="tarot-card-face tarot-card-front">
                      <div className="tarot-card-emoji">{c.emoji}</div>
                      <div className="tarot-card-name">{c.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="tarot-tray">
              {["Pasado", "Presente", "Futuro"].map((rol, i) => {
                const name = cartas[i];
                const c = name && CARDS.find((x) => x.name === name);
                return (
                  <div key={rol} className={`tray-slot ${c ? "filled" : ""} ${cartas.length === i ? "next" : ""}`}>
                    <div className="tray-rol">{rol}</div>
                    <div className="tray-emoji">{c ? c.emoji : "·"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 5 && compat && (
        <div className="reveal-stack">
          <div id="resultado-compartir">
          <div style={{ textAlign: "center", fontSize: 48, letterSpacing: 12, margin: "8px 0" }}>
            {compat.emojiA} {compat.emojiB}
          </div>
          <h2 className="reveal-title italic">{compat.titulo}</h2>
          <p className="reveal-sub">La energía de {voce} &amp; {amor}</p>
          <div className="compat-box card-elevated">
            <div className="pct"><CountUp to={compatPercent(signoVoce, signoAmor)} />%</div>
            <div className="badge" style={{ marginTop: 10 }}>compatibilidad de la pareja</div>
            <p className="disclaimer" style={{ marginTop: 6 }}>
              Afinidad entre sus elementos ({compat.elementoA} + {compat.elementoB}) · lectura astrológica, por diversión
            </p>
            <p className="reveal-sub" style={{ marginTop: 14, marginBottom: 0, minHeight: 24, fontSize: 15 }}>
              <Typewriter
                text={
                  compatPercent(signoVoce, signoAmor) >= 88
                    ? `Elementos que se encienden: ${compat.forte}`
                    : compatPercent(signoVoce, signoAmor) >= 80
                    ? `Se equilibran bien: ${compat.forte}`
                    : `Distintos y magnéticos: ${compat.forte}`
                }
              />
            </p>
          </div>
          </div>
          <div className="card">
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <span className="badge">Elemento {compat.elementoA}</span>{" "}
              <span className="badge">Elemento {compat.elementoB}</span>
            </div>
            <p className="compat-line">{compat.texto}</p>
            <p className="compat-line"><b>Punto fuerte de ustedes:</b> {compat.forte}</p>
            <p className="compat-line"><b>Un cuidado especial:</b> {compat.cuidado}</p>
            {desejo && (
              <p className="compat-line muted">
                Y la energía de ustedes ahora — “{desejo}” — combina con esta etapa. 💛
              </p>
            )}
          </div>
          <div className="card">
            <div className="section-head" style={{ justifyContent: "center", marginTop: 0 }}>
              <span className="section-head-title">Sol · Luna · Ascendente</span>
            </div>
            {lunaA && lunaB ? (
              <>
                <p className="compat-line" style={{ textAlign: "center" }}>
                  <b>{voce}</b>: su Luna en {lunaA.name} {MOON_NEED[lunaA.element]}.
                </p>
                <p className="compat-line" style={{ textAlign: "center" }}>
                  <b>{amor}</b>: su Luna en {lunaB.name} {MOON_NEED[lunaB.element]}.
                </p>
                <p className="compat-line" style={{ textAlign: "center" }}>
                  {lunaA.element === lunaB.element
                    ? "Sus dos Lunas piden lo mismo: se calman de forma parecida — ahí tienen un refugio."
                    : "Sus Lunas piden cosas distintas: ahí nacen casi todos los malentendidos… y también la salida."}
                </p>
              </>
            ) : (
              <>
                <p className="compat-line" style={{ textAlign: "center" }}>
                  <b>{voce}</b> — ☉ {signoVoce}{lunaA ? ` · ☽ ${lunaA.name}` : ""}
                </p>
                <p className="compat-line" style={{ textAlign: "center" }}>
                  <b>{amor}</b> — ☉ {signoAmor}{lunaB ? ` · ☽ ${lunaB.name}` : ""}
                </p>
              </>
            )}
            <p className="disclaimer" style={{ textAlign: "center", marginTop: 8 }}>
              El Ascendente — la primera impresión que dan y la coraza que sacan bajo presión — se calcula con la hora y la ciudad de nacimiento. Es una de las partes que se abren dentro de la app.
            </p>
          </div>
          <div className="card">
            <div className="section-head" style={{ justifyContent: "center", marginTop: 0 }}>
              <span className="section-head-title">Las cartas de ustedes</span>
            </div>
            {cartas.map((name, i) => {
              const c = CARDS.find((x) => x.name === name);
              const rotulo = ["Pasado", "Presente", "Futuro"][i] || "";
              return (
                <p className="compat-line" key={name} style={{ textAlign: "center" }}>
                  <span className="badge" style={{ marginRight: 6 }}>{rotulo}</span>
                  <span style={{ fontSize: 22 }}>{c.emoji}</span> <b>{c.name}</b> — {c.meaning}
                </p>
              );
            })}
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <span className="badge">✷ {frequenciaFor(`${voce}${amor}${signoVoce}${signoAmor}`)} ✷</span>
            <p className="muted" style={{ marginTop: 12 }}><span className="overline">Números cósmicos de la pareja</span></p>
            <div style={{ fontFamily: "var(--serif)", fontSize: 32, color: "var(--gold)", letterSpacing: 8, marginTop: 4, textShadow: "0 0 18px rgba(232,195,122,.5)" }}>
              {cosmicNumbers(`${voce}${amor}${signoVoce}${signoAmor}`, 3).join(" · ")}
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              ✷ Hora dorada de ustedes: {horaDorada(`${voce}${amor}${signoVoce}${signoAmor}`)} ✷
            </p>
            <p className="disclaimer" style={{ marginTop: 8 }}>
              Lectura de {voce} &amp; {amor} — sellada hoy. Nadie eligió esto por ustedes: lo empezaron ustedes, hoy, juntos. Lo que sigue se escribe con lo que hagan a partir de acá.
            </p>
          </div>
          <div className="card card-accent" style={{ textAlign: "center" }}>
            <h3 style={{ fontStyle: "italic" }}>Esta fue la lectura de hoy 💫</h3>
            <p className="muted" style={{ margin: "8px 0 16px" }}>
              El mapa astral completo de la pareja — con más capas sobre cómo se comunican y se acercan — comienza a construirse en el próximo paso, con el primer recuerdo de ustedes.
            </p>
            <button className="btn" onClick={irASellar}>
              Guardar nuestro primer recuerdo →
            </button>
          </div>
          <div className="card card-quiet" style={{ textAlign: "center" }}>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <a
                className="btn btn-ghost"
                href={`https://wa.me/?text=${encodeURIComponent(
                  `La astrología de nuestra pareja dio ${compatPercent(signoVoce, signoAmor)}% de compatibilidad en Forja del Amor ✷`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Compartir en WhatsApp
              </a>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => descargarResultado("resultado-compartir", `forja-del-amor-${voce}-${amor}.png`)}
              >
                Descargar imagen 🖼️
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="nav-row">
        {step > 1 ? (
          <button className="btn btn-ghost" onClick={() => { setAviso(""); setStep(step - 1); }}>Atrás</button>
        ) : <span />}
        {step < total && (
          <button className="btn" onClick={handleContinuar}>
            {step === 4 ? "Ver la revelación" : "Continuar"}
          </button>
        )}
      </div>
      {aviso && (
        <p role="alert" aria-live="polite" style={{ color: "var(--gold-bright)", textAlign: "center", marginTop: 10, fontSize: 14 }}>
          {aviso}
        </p>
      )}
    </main>
  );
}
