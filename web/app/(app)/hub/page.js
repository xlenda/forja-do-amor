"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  bumpStreak,
  collectData,
  getCoupleStartDate,
  nextAnniversary,
  onThisDay,
  distanciamentoStreak,
  repairInfo,
  repairStreak,
  weeklyDigest,
  readImportantDates,
  nextOccurrence,
} from "@/lib/activity";

const AREAS = [
  { href: "/hoje", emoji: "☀️", title: "Hoy", desc: "Pregunta del día, respuestas espejo y el clima de ustedes" },
  { href: "/timeline", emoji: "📸", title: "Nosotros", desc: "Línea de tiempo, fotos y cápsulas del tiempo" },
  { href: "/reconectar", emoji: "💞", title: "Reconectar", desc: "Rutas y misiones para reavivar la conexión" },
  { href: "/descobrir", emoji: "🔮", title: "Descubrir", desc: "Lenguaje del amor y estilo de apego" },
  { href: "/agir", emoji: "🎯", title: "Actuar", desc: "Ideas de citas, desafíos y metas de la pareja" },
  { href: "/horoscopo", emoji: "✷", title: "Astro de la pareja", desc: "Horóscopo de la pareja del día (por diversión)" },
  { href: "/progresso", emoji: "📊", title: "Nuestro progreso", desc: "Racha, logros y el resumen del mes" },
  { href: "/retrospectiva", emoji: "🎉", title: "Retrospectiva", desc: "El año de ustedes en números, para compartir" },
  { href: "/perfil", emoji: "⚙️", title: "Perfil", desc: "Suscripción, notificaciones y exportar tus datos" },
];

// Debe ser el mismo criterio que RUTAS_LIBRES en app/(app)/layout.js — estas áreas nunca se bloquean.
const AREAS_LIBRES = ["/hoje", "/timeline", "/perfil"];

// Emoji que evoluciona según el tamaño de la racha — una pequeña recompensa visual, sin inventar datos.
function streakEmoji(count) {
  if (count >= 30) return "💎";
  if (count >= 14) return "🏆";
  if (count >= 7) return "🌟";
  if (count >= 3) return "🔥";
  return "✨";
}

function HubInner() {
  const params = useSearchParams();
  const voce = params.get("voce") || "Tú";
  const amor = params.get("amor") || "Tu amor";

  const [mounted, setMounted] = useState(false);
  const [streak, setStreak] = useState({ count: 0 });
  const [data, setData] = useState(null);
  const [aniversario, setAniversario] = useState(null);
  const [recuerdoHoy, setRecuerdoHoy] = useState([]);
  const [distante, setDistante] = useState(0);
  const [reparo, setReparo] = useState({ canRepair: false });
  const [reparado, setReparado] = useState(false);
  const [semana, setSemana] = useState(null);
  const [proximaFecha, setProximaFecha] = useState(null);
  const [selo, setSelo] = useState(false);
  const [visitas, setVisitas] = useState(0);
  const [tienePlan, setTienePlan] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStreak(bumpStreak(voce, amor));
    setData(collectData(voce, amor));
    try {
      setSelo(localStorage.getItem(`gff-selo:${voce}:${amor}`) === "1");
    } catch {}
    try {
      const vKey = `gff-visitas:${voce}:${amor}`;
      const v = (parseInt(localStorage.getItem(vKey) || "0", 10) || 0) + 1;
      localStorage.setItem(vKey, String(v));
      setVisitas(v);
    } catch {}
    try {
      const correlationCode = localStorage.getItem(`gff-correlation:${voce}:${amor}`);
      if (correlationCode) {
        fetch(`https://oddpro.pro/api-forja/api/subscription/${correlationCode}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((estado) => setTienePlan(Boolean(estado?.hasAccess)))
          .catch(() => {});
      }
    } catch {}
    const start = getCoupleStartDate(voce, amor);
    setAniversario(start ? nextAnniversary(start) : null);
    setRecuerdoHoy(onThisDay(voce, amor));
    setDistante(distanciamentoStreak(voce, amor));
    setReparo(repairInfo(voce, amor));
    setSemana(weeklyDigest(voce, amor));
    try {
      const fechas = readImportantDates(voce, amor);
      const proximas = fechas
        .map((f) => ({ ...f, dias: nextOccurrence(f.mmdd) }))
        .filter((f) => f.dias != null && f.dias <= 14)
        .sort((a, b) => a.dias - b.dias);
      setProximaFecha(proximas[0] || null);
    } catch {}
  }, [voce, amor]);

  function recuperarRacha() {
    const r = repairStreak(voce, amor, streak.prevCount || 0);
    if (r) {
      setStreak({ ...streak, count: r.count, longest: r.longest, broke: false });
      setReparo({ canRepair: false, usedThisMonth: 1, limit: 1 });
      setReparado(true);
    }
  }

  const qs = () => {
    const q = new URLSearchParams();
    ["voce", "amor", "sa", "sb"].forEach((k) => {
      const v = params.get(k);
      if (v) q.set(k, v);
    });
    const s = q.toString();
    return s ? `?${s}` : "";
  };

  const pendencias = [];
  if (data && !data.hojeRespondeuAmbos) pendencias.push({ href: "/hoje", label: "Responder la pregunta del día" });
  if (data && data.capsulesCount === 0) pendencias.push({ href: "/timeline", label: "Sellar la primera cápsula del tiempo" });
  if (data && !(data.linguagemFeito && data.apegoFeito)) pendencias.push({ href: "/descobrir", label: "Descubrir el lenguaje del amor de ustedes" });

  // Solo presentación: decide cuál de los avisos del momento merece el mayor peso visual (card-3)
  // en esta pantalla. No cambia ninguna condición de negocio, solo elige a cuál dar énfasis.
  const urgente = streak.broke && !reparado ? "streak" : distante >= 2 ? "distancia" : "pendencias";

  const hayVistazo =
    recuerdoHoy.length > 0 ||
    (semana && (semana.hojeAnsweredDays > 0 || semana.memoriesThisWeek > 0)) ||
    !!proximaFecha ||
    (aniversario && aniversario.days <= 60);

  return (
    <main className="wrap">
      <div className="couple-header">
        <span className="badge">✷ Nuestra app ✷</span>
        <div className="couple-names">{voce} &amp; {amor}</div>
        <div className="couple-meta">reconectar, recordar y crecer juntos 💛</div>
        {mounted && selo && <div className="badge" style={{ marginTop: 8 }}>🛡️ Guardianes de su propia historia</div>}
        {mounted && !tienePlan && (
          <Link href={`/planos${qs()}`} className="btn-tertiary" style={{ display: "inline-block", marginTop: 10 }}>
            Ver planes y suscripción →
          </Link>
        )}
        {mounted && data && (
          <div className="stat-row" style={{ marginTop: 16, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
            <div className="stat">
              <div className="stat-value">{streak.count}</div>
              <div className="stat-label">{streakEmoji(streak.count)} seguidos</div>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <div className="stat-value">{data.memoriesCount || 0}</div>
              <div className="stat-label">📸 recuerdos</div>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <div className="stat-value">{visitas}</div>
              <div className="stat-label">👋 visitas</div>
            </div>
          </div>
        )}
      </div>

      {/* El aviso más urgente del momento (racha rota > distanciamiento > pendientes de hoy) recibe card-3 */}
      {mounted && streak.broke && !reparado && (
        <div className={`card fade-in ${urgente === "streak" ? "card-3" : "card-2"}`} style={{ textAlign: "center", marginBottom: 16 }}>
          <p className="compat-line" style={{ margin: 0 }}>
            Qué bueno tenerlos de vuelta, {voce} &amp; {amor} 💛 La racha vuelve a empezar hoy — lo que importa es seguir cuidando la relación, a su propio ritmo.
          </p>
          {streak.prevCount > 1 && reparo.canRepair && (
            <>
              <p className="muted" style={{ marginTop: 10 }}>
                Tenían {streak.prevCount} {streak.prevCount === 1 ? "día" : "días"} seguidos. Pueden recuperar esa racha una vez al mes.
              </p>
              <button className="btn btn-ghost" style={{ marginTop: 6 }} onClick={recuperarRacha}>
                Recuperar nuestra racha 🔥
              </button>
            </>
          )}
        </div>
      )}
      {mounted && reparado && (
        <div className="card card-2 fade-in" style={{ textAlign: "center", marginBottom: 16 }}>
          <p className="compat-line" style={{ margin: 0 }}>Racha recuperada 🔥 Siguen en {streak.count} {streak.count === 1 ? "día" : "días"} seguidos.</p>
        </div>
      )}

      {mounted && distante >= 2 && (
        <div className={`card fade-in ${urgente === "distancia" ? "card-3" : "card-1"}`} style={{ textAlign: "center", marginBottom: 16 }}>
          <span className="badge"><span className="overline">🌧️ {distante} días marcando "distantes"</span></span>
          <p className="compat-line" style={{ marginTop: 10 }}>
            {voce} &amp; {amor} vienen marcando el clima como distante. Un pequeño paso ahora puede ayudar.
          </p>
          <Link className="btn btn-ghost" style={{ marginTop: 4 }} href={`/reconectar${qs()}`}>Ir a Reconectar →</Link>
        </div>
      )}

      {mounted && (
        <div className={`card fade-in ${urgente === "pendencias" ? "card-3" : "card-2"}`} style={{ marginBottom: 16 }}>
          <div className="section-head" style={{ margin: 0 }}>
            <span className="section-head-title">Hoy para ustedes</span>
            <span className="section-head-action">{streakEmoji(streak.count)} {streak.count} {streak.count === 1 ? "día" : "días"}</span>
          </div>
          {pendencias.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              {pendencias.slice(0, 2).map((p) => (
                <Link key={p.href} className="opt" style={{ display: "block", marginBottom: 8 }} href={`${p.href}${qs()}`}>
                  → {p.label}
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 10 }}>{voce} &amp; {amor} ya se ocuparon de lo esencial hoy. Exploren el resto de la app 💛</p>
          )}
        </div>
      )}

      {/* Recuerdos, resumen semanal y fechas próximas: contenido secundario, agrupado bajo un mismo encabezado */}
      {mounted && hayVistazo && (
        <div className="section-head">
          <span className="section-head-title">Un vistazo rápido</span>
        </div>
      )}

      {mounted && recuerdoHoy.length > 0 && (
        <div className="card card-1 fade-in" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ margin: "0 0 8px" }}>
            Hace {recuerdoHoy[0].yearsAgo === 1 ? "1 año" : `${recuerdoHoy[0].yearsAgo} años`}
          </div>
          <p className="compat-line" style={{ fontStyle: "italic" }}>“{recuerdoHoy[0].text || recuerdoHoy[0].title}”</p>
          <p className="muted" style={{ marginTop: 6 }}>{recuerdoHoy[0].title}</p>
          <Link className="btn btn-ghost" style={{ marginTop: 10 }} href={`/timeline${qs()}`}>Ver en la línea de tiempo →</Link>
        </div>
      )}

      {mounted && semana && (semana.hojeAnsweredDays > 0 || semana.memoriesThisWeek > 0) && (
        <div className="card card-1 fade-in" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ margin: "0 0 8px" }}>Esta semana</div>
          <p className="muted" style={{ margin: 0 }}>
            Respondieron juntos la pregunta del día en <b>{semana.hojeAnsweredDays}</b> de 7 días
            {semana.memoriesThisWeek > 0 && <> · <b>{semana.memoriesThisWeek}</b> {semana.memoriesThisWeek === 1 ? "recuerdo nuevo" : "recuerdos nuevos"}</>}
          </p>
        </div>
      )}

      {mounted && proximaFecha && (
        <div className="card card-1" style={{ textAlign: "center", marginBottom: 16 }}>
          <span className="badge"><span className="overline">📅 {proximaFecha.label}</span></span>
          <p className="compat-line" style={{ marginTop: 10 }}>
            {proximaFecha.dias === 0 ? "Es hoy 💛" : `Faltan ${proximaFecha.dias} ${proximaFecha.dias === 1 ? "día" : "días"}.`}
          </p>
        </div>
      )}

      {mounted && aniversario && aniversario.days <= 60 && (
        <div className="card card-1" style={{ textAlign: "center", marginBottom: 16 }}>
          <span className="badge"><span className="overline">💍 Aniversario que se acerca</span></span>
          <p className="compat-line" style={{ marginTop: 10 }}>
            Faltan <b>{aniversario.days}</b> {aniversario.days === 1 ? "día" : "días"} para que {voce} &amp; {amor} cumplan <b>{aniversario.anos}</b> {aniversario.anos === 1 ? "año" : "años"} juntos.
          </p>
          <Link className="btn-ghost btn" style={{ marginTop: 10 }} href={`/timeline${qs()}`}>Preparar una cápsula para ese día →</Link>
        </div>
      )}

      {mounted && !tienePlan && visitas >= 2 && data?.memoriesCount >= 1 && (
        <div className="card card-2 card-accent" style={{ textAlign: "center", marginBottom: 16 }}>
          <span className="badge"><span className="overline">💛 Ya están usando Forja del Amor</span></span>
          <p className="compat-line" style={{ marginTop: 10 }}>
            {voce} &amp; {amor} ya guardaron {data.memoriesCount} {data.memoriesCount === 1 ? "recuerdo" : "recuerdos"} y volvieron {visitas} veces. ¿Quieren garantizar que esto siga guardado y creciendo?
          </p>
          <Link className="btn" style={{ marginTop: 10 }} href={`/planos${qs()}`}>Ver cómo seguir →</Link>
        </div>
      )}

      <div className="section-head">
        <span className="section-head-title">Explorar</span>
      </div>
      <div className="card card-1">
        <div className="feature-list">
          {AREAS.map((a) => {
            const bloqueada = mounted && !tienePlan && !AREAS_LIBRES.includes(a.href);
            return (
              <Link key={a.href} className="feature-item" href={`${a.href}${qs()}`} style={{ textDecoration: "none" }}>
                <div className="feature-item-icon">{a.emoji}</div>
                <div className="feature-item-text"><b>{a.title}</b><span>{a.desc}</span></div>
                {bloqueada && <span className="feature-item-lock" title="Se abre con la suscripción">🔒</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="card card-1" style={{ textAlign: "center", marginTop: 24 }}>
        <span className="badge"><span className="overline">🎁 Invita a una pareja amiga</span></span>
        <p className="muted" style={{ marginTop: 10 }}>
          Cada pareja invitada que se suscriba les da <b>1 mes gratis</b> a ambos — a quien invita y a quien llega.
        </p>
        <a
          className="btn btn-ghost"
          style={{ marginTop: 6 }}
          href={`https://wa.me/?text=${encodeURIComponent(
            `${voce} & ${amor} están usando Forja del Amor para guardar los recuerdos de su relación — y si ustedes se suscriben, ganamos 1 mes gratis 💛 gilfforever.app`
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          Invitar por WhatsApp
        </a>
      </div>

      <p className="disclaimer" style={{ textAlign: "center", marginTop: 18 }}>
        Una app para acercarse, reavivar y cuidar el vínculo — nunca para controlar el sentimiento del otro.
      </p>
      <footer>Forja del Amor · prototipo</footer>
    </main>
  );
}

export default function Hub() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
      <HubInner />
    </Suspense>
  );
}
