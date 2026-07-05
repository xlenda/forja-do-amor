"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Checkout real (Hotmart), embutido en la página vía Checkout Elements — el backend
// (api-forja) genera un correlationCode server-side y valida el webhook de pago.
const API_BASE = "https://oddpro.pro/api-forja";
const HOTMART_CHECKOUT_ELEMENTS_SRC = "https://checkout.hotmart.com/lib/hotmart-checkout-elements.js";
// Fallback si el checkout embutido falla por algún motivo (red, script bloqueado, etc.)
const HOTMART_CHECKOUT_FALLBACK = "https://pay.hotmart.com/W105128423R?bid=1783049846019";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmtES(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d} ${MESES[+m - 1]} ${y}`;
}
function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function trackInitiateCheckout() {
  if (typeof window !== "undefined") {
    window.fbq && window.fbq("track", "InitiateCheckout", { value: 5, currency: "USD" });
    window.gtag && window.gtag("event", "begin_checkout", { value: 5, currency: "USD" });
  }
}

// Adapta el tono del texto principal según la energía real que la pareja marcó en el quiz — sin inventar nada, solo escuchando lo que ya dijeron.
function tonoPorEnergia(en) {
  if (!en) return "bien";
  if (en.startsWith("En crisis") || en.startsWith("Distantes") || en.startsWith("En conflicto")) return "dificil";
  if (en.startsWith("Recomenzando")) return "recomenzando";
  return "bien";
}

const FAQ = [
  {
    q: "¿Y si mi pareja todavía no quiere participar?",
    a: "Puedes empezar tú y compartirlo cuando se sienta natural. Forja del Amor no presiona ni cambia a nadie: es un espacio para acercarse cuando los dos quieran.",
  },
  {
    q: "¿Qué pasa cuando terminan los 7 días?",
    a: "Te avisamos 2 días antes. Si sigues, son $5 USD/mes. Si no, cancelas y no se cobra nada.",
  },
  {
    q: "¿Esto es solo astrología?",
    a: "La astrología es la puerta de entrada, con datos reales de nacimiento. Adentro, lo que guardan es concreto: sus recuerdos, fotos, fechas y cápsulas que se abren cuando ustedes eligen.",
  },
  {
    q: "¿Nuestras fotos y datos están seguros?",
    a: "Son solo de ustedes. Pueden exportar todo cuando quieran y borrar la cuenta sin preguntas.",
  },
  {
    q: "¿Puedo cancelar de verdad?",
    a: "Sí, desde el mismo lugar donde te suscribiste. Sin llamadas ni formularios.",
  },
];

function PlanosInner() {
  const params = useSearchParams();
  const voce = params.get("voce") || "";
  const amor = params.get("amor") || "";
  const tono = tonoPorEnergia(params.get("en") || "");

  const [sellado, setSellado] = useState(null);
  const [capsuleDate, setCapsuleDate] = useState("");
  const [capsuleSaved, setCapsuleSaved] = useState(false);
  const [promesa, setPromesa] = useState("");
  const [promesaGuardada, setPromesaGuardada] = useState(false);
  const [checkoutAberto, setCheckoutAberto] = useState(false);
  const [checkoutCargando, setCheckoutCargando] = useState(false);
  const [checkoutErro, setCheckoutErro] = useState("");

  useEffect(() => {
    if (!voce || !amor) return;
    try {
      const t = JSON.parse(localStorage.getItem(`gff:${voce}:${amor}`) || "{}");
      const a = JSON.parse(localStorage.getItem(`gff-agir:${voce}:${amor}`) || "{}");
      const rec = (t.memories?.find((m) => m.title === "Cómo empezó todo") || t.memories?.[0])?.text;
      setSellado({ recuerdo: rec, deseo: a.goalSaved, inicio: t.startDate });
      const savedPromesa = localStorage.getItem(`gff-promesa:${voce}:${amor}`);
      if (savedPromesa) {
        setPromesa(savedPromesa);
        setPromesaGuardada(true);
      }
    } catch {}
  }, [voce, amor]);

  function guardarPromesa() {
    const texto = promesa.trim();
    if (!texto) return;
    try {
      localStorage.setItem(`gff-promesa:${voce}:${amor}`, texto);
      const tKey = `gff:${voce}:${amor}`;
      const t = JSON.parse(localStorage.getItem(tKey) || "{}");
      const capsules = t.capsules || [];
      if (!capsules.some((c) => c.id === "promesa-planos")) {
        const unlock = new Date();
        unlock.setMonth(unlock.getMonth() + 1);
        const unlockAt = unlock.toISOString().slice(0, 10);
        t.memories = t.memories || [];
        t.capsules = [...capsules, { id: "promesa-planos", message: `Lo que decidimos antes de empezar: “${texto}”`, unlockAt }];
        localStorage.setItem(tKey, JSON.stringify(t));
      }
    } catch {}
    setPromesaGuardada(true);
  }

  function cargarScriptHotmart() {
    return new Promise((resolve, reject) => {
      if (window.checkoutElements) return resolve();
      const existente = document.querySelector(`script[src="${HOTMART_CHECKOUT_ELEMENTS_SRC}"]`);
      if (existente) {
        existente.addEventListener("load", () => resolve());
        existente.addEventListener("error", () => reject(new Error("script falhou")));
        return;
      }
      const script = document.createElement("script");
      script.src = HOTMART_CHECKOUT_ELEMENTS_SRC;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("script falhou"));
      document.body.appendChild(script);
    });
  }

  async function abrirCheckout(e) {
    if (e) e.preventDefault();
    trackInitiateCheckout();
    setCheckoutErro("");
    setCheckoutCargando(true);
    setCheckoutAberto(true);
    try {
      const resp = await fetch(`${API_BASE}/api/checkout/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coupleName: voce && amor ? `${voce} & ${amor}` : undefined }),
      });
      if (!resp.ok) throw new Error("initiate falhou");
      const data = await resp.json();
      if (voce && amor) {
        try { localStorage.setItem(`gff-correlation:${voce}:${amor}`, data.correlationCode); } catch {}
      }

      await cargarScriptHotmart();

      window.checkoutElements
        .init("inlineCheckout", {
          offer: data.checkoutConfig.offerCode,
          xcod: data.checkoutConfig.xcod,
          ...(data.checkoutConfig.prefilledInfo || {}),
        })
        .mount("#hotmart-checkout-mount");
      setCheckoutCargando(false);
    } catch (err) {
      setCheckoutErro("No pudimos abrir el checkout ahora. Intenten de nuevo en un momento.");
      setCheckoutCargando(false);
    }
  }

  function cerrarCheckout() {
    setCheckoutAberto(false);
    setCheckoutErro("");
  }

  function guardarFechaCapsula(e) {
    e.preventDefault();
    if (!capsuleDate) return;
    try {
      const aKey = `gff-agir:${voce}:${amor}`;
      const a = JSON.parse(localStorage.getItem(aKey) || "{}");
      a.firstCapsuleDate = capsuleDate;
      localStorage.setItem(aKey, JSON.stringify(a));
    } catch {}
    setCapsuleSaved(true);
  }

  if (checkoutAberto) {
    return (
      <main className="wrap">
        <div className="line-label"><span>Checkout seguro</span></div>
        <div className="bigstar">✴</div>
        <h1 className="reveal-title" style={{ fontSize: 26 }}>Últimos datos para empezar</h1>
        <p className="reveal-sub" style={{ maxWidth: 440, margin: "0 auto 20px" }}>
          $5 USD/mes · 7 días gratis · sin compromiso.
        </p>

        {checkoutCargando && (
          <div className="loading">
            <div className="orb">✴</div>
            <h2>Preparando el checkout seguro<span className="dots" /></h2>
          </div>
        )}

        {checkoutErro && (
          <div className="card" style={{ textAlign: "center" }}>
            <p role="alert" className="compat-line" style={{ color: "var(--gold-bright)" }}>{checkoutErro}</p>
            <a className="btn btn-ghost" style={{ marginTop: 12 }} href={HOTMART_CHECKOUT_FALLBACK} target="_blank" rel="noreferrer">
              Abrir el checkout en otra pestaña →
            </a>
          </div>
        )}

        <div id="hotmart-checkout-mount" style={{ minHeight: checkoutCargando ? 0 : 480 }} />

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={cerrarCheckout}>← Volver</button>
        </div>
        <footer>Forja del Amor · prototipo</footer>
      </main>
    );
  }

  const HERO_TEXTOS = {
    dificil: `Atravesar un momento así no borra lo que ya construyeron. Forja del Amor guarda el comienzo de ${voce || "ustedes"} y ${amor || "su amor"} — y también un espacio para cuidar lo que viene, a su propio ritmo.`,
    recomenzando: `Recomenzar toma coraje. Forja del Amor guarda el comienzo de esta nueva etapa de ${voce || "ustedes"} y ${amor || "su amor"}, para que no se pierda en el ajetreo del día a día.`,
    bien: `Con el tiempo, los detalles del comienzo se vuelven borrosos — es normal, le pasa a todas las parejas. Forja del Amor es el lugar donde el comienzo de ${voce || "ustedes"} y ${amor || "su amor"} queda escrito, entero, para volver a él cuando quieran.`,
  };

  return (
    <main className="wrap" style={{ paddingBottom: 72 }}>
      <div className="sticky-cta">
        <span className="sticky-price">$5 USD/mes · 7 días gratis</span>
        <button className="btn" onClick={abrirCheckout}>
          Empezar →
        </button>
      </div>
      <div className="hero" style={{ paddingBottom: 8 }}>
        <span className="badge">✷ El mapa ya está sellado ✷</span>
        <h1 style={{ fontSize: 32 }}>
          Dentro de un año, ustedes van a querer volver a leer exactamente este momento.
        </h1>
        <p className="sub" style={{ fontSize: 17 }}>
          {HERO_TEXTOS[tono]}
        </p>
      </div>

      {(sellado?.recuerdo || sellado?.deseo) && (
        <div className="card" style={{ marginTop: 6 }}>
          <div className="section-title" style={{ margin: "0 0 10px" }}>Ustedes ya escribieron la primera página</div>
          {sellado.recuerdo && <p className="compat-line" style={{ fontStyle: "italic" }}>“{sellado.recuerdo}”</p>}
          {sellado.deseo && (
            <p className="compat-line">
              Y un deseo para los próximos 12 meses: “{sellado.deseo}”.
            </p>
          )}
          <p className="muted" style={{ marginTop: 6 }}>
            Eso ya quedó sellado. Aquí es donde sigue vivo — y donde se le suman todos los capítulos que vienen.
          </p>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <button className="btn btn-ghost" onClick={abrirCheckout}>
          Ya lo tenemos claro → empezar nuestros 7 días gratis
        </button>
      </div>

      {(sellado?.recuerdo || sellado?.deseo) && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="section-title" style={{ margin: "0 0 14px", textAlign: "center" }}>Así se ve el espacio de ustedes por dentro</div>

          {sellado.recuerdo && (
            <div className="timeline" style={{ marginBottom: 18 }}>
              <div className="tl-item">
                <div className="tl-date">{sellado.inicio ? fmtES(sellado.inicio) : "Línea de tiempo"}</div>
                <div className="tl-title">Cómo empezó todo</div>
                <p className="muted">{sellado.recuerdo}</p>
              </div>
            </div>
          )}

          {sellado.deseo && (
            <div className="capsule" style={{ marginBottom: 6 }}>
              <div className="lock">🔒</div>
              <h3>Primera cápsula del tiempo</h3>
              <small>Sellada ✦ — guarda su deseo</small>
              <div className="msg" style={{ marginTop: 10 }}>“{sellado.deseo}”</div>
            </div>
          )}

          <p className="disclaimer" style={{ textAlign: "center", marginTop: 14 }}>
            Esto no es un ejemplo: es lo que ustedes ya guardaron. Al entrar, sigue exactamente aquí.
          </p>

          {!capsuleSaved ? (
            <form onSubmit={guardarFechaCapsula} style={{ marginTop: 16 }}>
              <div className="field" style={{ marginBottom: 10 }}>
                <label>¿Cuándo quieren abrir su primera cápsula?</label>
                <input
                  className="input"
                  type="date"
                  min={tomorrowISO()}
                  value={capsuleDate}
                  onChange={(e) => setCapsuleDate(e.target.value)}
                />
              </div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                Elijan una fecha que signifique algo — su aniversario, un cumpleaños, el año que viene.
              </p>
              <button className="btn btn-ghost" type="submit" style={{ width: "100%" }}>
                Sellar esta fecha
              </button>
            </form>
          ) : (
            <p className="compat-line" style={{ marginTop: 16, textAlign: "center" }}>
              Cápsula sellada para el {fmtES(capsuleDate)}. Guarda: “{sellado.deseo}”. Se abre sola, ese día, adentro de la app.
            </p>
          )}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: "0 0 10px" }}>Todo lo que ya empezaron a construir sigue aquí</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--muted)", lineHeight: 2 }}>
          <li><b style={{ color: "var(--ivory)" }}>La línea de tiempo</b> de {voce || "ustedes"} &amp; {amor || "su amor"}, con fotos y los momentos que definieron la relación</li>
          <li><b style={{ color: "var(--ivory)" }}>Cápsulas del tiempo</b> que se abren solas, en la fecha exacta que ustedes elijan</li>
          <li><b style={{ color: "var(--ivory)" }}>Rutas de reconexión</b> guiadas, 5 minutos al día, para las semanas en que el amor pide un poco más de cuidado</li>
          <li><b style={{ color: "var(--ivory)" }}>Horóscopo mensual de la pareja</b> + su lenguaje del amor y estilo de apego</li>
          <li><b style={{ color: "var(--ivory)" }}>Sus datos son solo suyos</b> — exporten todo, cuando quieran, sin preguntas</li>
        </ul>
      </div>

      <div style={{ maxWidth: 380, margin: "20px auto 0" }}>
        <div className="card card-3" style={{ textAlign: "center" }}>
          <span className="badge"><span className="overline">7 días gratis, después $5/mes</span></span>
          <h2 style={{ fontSize: 38, margin: "14px 0 2px" }}>
            $5<span style={{ fontSize: 16, color: "var(--muted)" }}> USD/mes</span>
          </h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Parecido a lo que ya pagan por una plataforma de streaming — con una diferencia: esto no se ve
            una noche y se olvida. Es la historia de ustedes dos, creciendo cada mes.
          </p>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Son unos $60 en todo un año: cerca de lo que sale una sola salida especial… que dura una noche.
            Esto les guarda las 365.
          </p>

          <div className="field" style={{ marginTop: 16, textAlign: "left" }}>
            <label>Si quieren, completen: “Nosotros decidimos...”</label>
            <input
              className="input"
              value={promesa}
              onChange={(e) => setPromesa(e.target.value)}
              onBlur={guardarPromesa}
              placeholder="cuidar esta historia, un mes a la vez"
            />
            {promesaGuardada && promesa.trim() && (
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>✓ Guardado — se convierte en una cápsula que se abre en un mes.</p>
            )}
          </div>

          <button className="btn" style={{ marginTop: 16, width: "100%", fontSize: 15 }} onClick={abrirCheckout}>
            Comenzar mis 7 días gratis →
          </button>
          <div style={{ marginTop: 14, textAlign: "left" }}>
            <p className="disclaimer" style={{ marginBottom: 6 }}>Hoy no se cobra nada. Los 7 días son completos y gratis.</p>
            <p className="disclaimer" style={{ marginBottom: 6 }}>Si deciden quedarse, recién ahí son $5/mes — y les avisamos 2 días antes del primer cobro.</p>
            <p className="disclaimer">Cancelan cuando quieran desde su cuenta de Hotmart, sin dar explicaciones.</p>
          </div>
        </div>

        <div className="card" style={{ borderColor: "rgba(212,175,55,.35)", marginTop: 14 }}>
          <div className="section-title" style={{ margin: "0 0 8px" }}>Nuestra promesa</div>
          <p className="compat-line">
            Todo lo que escriban aquí es de ustedes — hoy, mañana y si algún día deciden irse. Su línea de
            tiempo, sus fotos y sus cápsulas se las pueden llevar completas, en un archivo, cuando quieran.
            Nadie se queda con los recuerdos de ustedes: pagan por seguir sumando capítulos, no por
            conservar los que ya escribieron.
          </p>
          <p className="muted" style={{ marginTop: 8 }}>
            Y los 7 días son gratis de verdad: hoy no se cobra nada, y les avisamos 2 días antes del primer
            cobro. Cancelan desde su cuenta, sin dar explicaciones.
          </p>
        </div>
      </div>

      <div className="section-title">Parejas que ya lo están viviendo</div>
      <p className="disclaimer" style={{ marginTop: -4 }}>Ejemplos — reemplazar por testimonios reales antes del lanzamiento.</p>
      <div className="grid2">
        <div className="card">
          <p className="compat-line">“Pensamos que íbamos a olvidar los detalles del comienzo. Hoy tenemos todo guardado, y cada tanto lo volvemos a leer juntos.”</p>
          <p className="muted">— Pareja (ejemplo)</p>
        </div>
        <div className="card">
          <p className="compat-line">“La cápsula del tiempo que se abrió en nuestro aniversario me hizo llorar. Por $5 al mes, no hay nada que se compare.”</p>
          <p className="muted">— Pareja (ejemplo)</p>
        </div>
      </div>

      <div className="section-title">Antes de decidir</div>
      <div className="grid2">
        {FAQ.map((f) => (
          <div className="card" key={f.q}>
            <p className="compat-line" style={{ fontWeight: 700 }}>{f.q}</p>
            <p className="muted" style={{ marginTop: 6 }}>{f.a}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16, textAlign: "center" }}>
        <p className="compat-line" style={{ fontSize: 16 }}>
          Prueben Forja del Amor 7 días, gratis. Si en una semana no sienten que vale la pena, cancelan
          y no pagan nada. Lo que escriban esta semana queda guardado, y es suyo: lo pueden exportar
          cuando quieran.
        </p>
        <button className="btn" style={{ marginTop: 14, width: "100%", maxWidth: 320 }} onClick={abrirCheckout}>
          Quiero guardar nuestra historia →
        </button>
      </div>

      <p className="disclaimer" style={{ textAlign: "center", marginTop: 16 }}>
        Sin cobro durante los 7 días. Cancelación sin explicaciones. Datos exportables en cualquier momento. Avisamos 2 días antes de cualquier cobro.
      </p>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <Link className="btn btn-ghost" href="/">Volver al inicio</Link>
      </div>
      <footer>Forja del Amor · prototipo</footer>
    </main>
  );
}

export default function Planos() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
      <PlanosInner />
    </Suspense>
  );
}
