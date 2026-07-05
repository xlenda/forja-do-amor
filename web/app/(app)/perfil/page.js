"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { readImportantDates, saveImportantDates, nextOccurrence } from "@/lib/activity";

const MILESTONES_MESES = [1, 3, 6, 12, 18, 24];
function mesesDesde(iso) {
  if (!iso) return 0;
  const start = new Date(iso + "T00:00");
  if (isNaN(start.getTime())) return 0;
  const now = new Date();
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmt(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d} ${MESES[+m - 1]} ${y}`;
}

function renewalDateOf(plan) {
  if (!plan) return null;
  if (plan.renewalDate) return plan.renewalDate;
  if (plan.trialEnd) return plan.trialEnd;
  if (plan.startedAt) {
    const d = new Date(plan.startedAt + "T00:00");
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + 7);
      return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

// Cuántos días faltan hasta una fecha (ISO) — solo un cálculo sobre datos ya existentes.
function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(iso + "T00:00");
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - todayMid) / 86400000);
}

// Pequeña animación de conteo (0 → valor) para que el número de días "llegue" con vida.
function useCountUp(target, durationMs = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target == null || target <= 0) {
      setValue(target && target > 0 ? target : 0);
      return;
    }
    let raf;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

const NOTIF_OPTIONS = [
  { key: "pergunta", label: "Recordatorio de la pregunta del día" },
  { key: "capsula", label: "Aviso cuando se abra una cápsula" },
  { key: "aniversario", label: "Recordatorio del aniversario de la pareja" },
];

function PerfilInner() {
  const params = useSearchParams();
  const voce = params.get("voce") || "Tú";
  const amor = params.get("amor") || "Tu amor";

  const qs = () => {
    const q = new URLSearchParams();
    ["voce", "amor", "sa", "sb"].forEach((k) => {
      const v = params.get(k);
      if (v) q.set(k, v);
    });
    const s = q.toString();
    return s ? `?${s}` : "";
  };

  const notifKey = `gff-notif-prefs:${voce}:${amor}`;

  const [mounted, setMounted] = useState(false);
  const [plan, setPlan] = useState(null);
  const [notifPrefs, setNotifPrefs] = useState({ pergunta: false, capsula: false, aniversario: false });
  const [justExported, setJustExported] = useState(false);
  const [fechas, setFechas] = useState([]);
  const [novoLabel, setNovoLabel] = useState("");
  const [novoMes, setNovoMes] = useState("");
  const [novoDia, setNovoDia] = useState("");

  useEffect(() => {
    setFechas(readImportantDates(voce, amor));
  }, [voce, amor]);

  function addFecha(e) {
    e.preventDefault();
    const label = novoLabel.trim();
    const mm = String(novoMes).padStart(2, "0");
    const dd = String(novoDia).padStart(2, "0");
    if (!label || !novoMes || !novoDia) return;
    const next = [...fechas, { id: String(Date.now()), label, mmdd: `${mm}-${dd}` }];
    setFechas(next);
    saveImportantDates(voce, amor, next);
    setNovoLabel(""); setNovoMes(""); setNovoDia("");
  }
  function delFecha(id) {
    const next = fechas.filter((f) => f.id !== id);
    setFechas(next);
    saveImportantDates(voce, amor, next);
  }

  const STATUS_LABEL = {
    pending: "Pago pendiente de confirmación",
    active: "Activa",
    past_due: "Pago atrasado — en proceso de reintento",
    canceled: "Cancelada",
    expired: "Vencida",
  };

  useEffect(() => {
    setMounted(true);
    try {
      const correlationCode = localStorage.getItem(`gff-correlation:${voce}:${amor}`);
      if (correlationCode) {
        fetch(`https://oddpro.pro/api-forja/api/subscription/${correlationCode}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((estado) => {
            if (!estado) return setPlan(null);
            setPlan({
              status: estado.status,
              name: STATUS_LABEL[estado.status] || estado.status,
              hasAccess: estado.hasAccess,
              renewalDate: estado.currentPeriodEnd,
            });
          })
          .catch(() => setPlan(null));
      } else {
        setPlan(null);
      }
    } catch {}
    try {
      const rawNotif = localStorage.getItem(notifKey);
      if (rawNotif) {
        setNotifPrefs((prev) => ({ ...prev, ...JSON.parse(rawNotif) }));
      }
    } catch {}
  }, [voce, amor, notifKey]);

  // Esconde el aviso de exportación exitosa después de unos segundos.
  useEffect(() => {
    if (!justExported) return;
    const t = setTimeout(() => setJustExported(false), 4000);
    return () => clearTimeout(t);
  }, [justExported]);

  function toggleNotif(field) {
    const next = { ...notifPrefs, [field]: !notifPrefs[field] };
    setNotifPrefs(next);
    try {
      localStorage.setItem(notifKey, JSON.stringify(next));
    } catch {}
  }

  function exportData() {
    const suffix = `:${voce}:${amor}`;
    const bundle = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || key.indexOf(suffix) === -1) continue;
        const raw = localStorage.getItem(key);
        try {
          bundle[key] = JSON.parse(raw);
        } catch {
          bundle[key] = raw;
        }
      }
    } catch {
      alert("No se pudieron leer los datos de este navegador.");
      return;
    }

    const json = JSON.stringify({ exportadoEl: new Date().toISOString(), voce, amor, dados: bundle }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forja-del-amor-${voce}-${amor}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setJustExported(true);
  }

  const renewal = renewalDateOf(plan);
  const diasParaCobro = daysUntil(renewal);
  const diasAnimados = useCountUp(diasParaCobro);
  const mesesAssinatura = plan?.startedAt ? mesesDesde(plan.startedAt) : 0;
  const marcoAtingido = mounted && plan?.startedAt && MILESTONES_MESES.includes(mesesAssinatura) ? mesesAssinatura : null;

  return (
    <main className="wrap">
      <div className="couple-header">
        <span className="badge">Perfil y Configuración</span>
        <div className="couple-names">{voce} &amp; {amor}</div>
        <div className="couple-meta">la cuenta de la pareja, sin letra chica 💛</div>
      </div>

      {marcoAtingido && (
        <div className="card card-2 fade-in" style={{ marginTop: 16, textAlign: "center", borderColor: "rgba(212,175,55,.45)" }}>
          <span className="badge">🎉 {marcoAtingido} {marcoAtingido === 1 ? "mes" : "meses"} de suscripción</span>
          <p className="compat-line" style={{ marginTop: 10 }}>
            {voce} &amp; {amor} llevan {marcoAtingido} {marcoAtingido === 1 ? "mes" : "meses"} guardando su historia en Forja del Amor. Feliz aniversario de suscripción 💛
          </p>
        </div>
      )}

      {/* Suscripción — la info más importante de esta pantalla */}
      <div className="card card-3" style={{ marginTop: 16 }}>
        <div className="section-head">
          <span className="section-head-title">Suscripción</span>
        </div>

        {!mounted ? (
          <p className="muted">Cargando...</p>
        ) : plan ? (
          <>
            <span className="overline">Estado</span>
            <p className="compat-line" style={{ marginTop: -4 }}><b>{plan.name}</b></p>

            {renewal && (
              diasParaCobro != null && diasParaCobro >= 0 ? (
                <div className="stat-row" style={{ marginTop: 16 }}>
                  <div className="stat">
                    <div className="stat-value">{diasAnimados}</div>
                    <div className="stat-label">{diasAnimados === 1 ? "día para el cobro" : "días para el cobro"}</div>
                  </div>
                  <div className="stat-divider" />
                  <div className="stat">
                    <div className="stat-value" style={{ fontSize: "var(--fs-h3)" }}>{fmt(renewal)}</div>
                    <div className="stat-label">próximo cobro</div>
                  </div>
                </div>
              ) : (
                <p className="muted" style={{ marginTop: 4 }}>Próximo cobro el {fmt(renewal)}</p>
              )
            )}

            <p className="disclaimer" style={{ marginTop: 14 }}>
              La suscripción se gestiona directamente en su cuenta de Hotmart (donde se suscribieron) — ahí pueden cancelar o cambiar la forma de pago, sin pasar por acá.
            </p>
          </>
        ) : (
          <>
            <p className="muted">Sin suscripción activa — 7 días gratis disponibles.</p>
            <Link className="btn btn-block" style={{ marginTop: 14 }} href={`/planos${qs()}`}>
              Ver planes
            </Link>
          </>
        )}
      </div>

      <div className="section-head">
        <span className="section-head-title">Configuración</span>
      </div>

      {/* Exportar datos */}
      <div className="card card-1">
        <span className="overline">Exportar mis datos</span>
        <p className="muted" style={{ marginTop: 4 }}>
          Descarguen todo lo que {voce} &amp; {amor} guardaron en la app — recuerdos, cápsulas, respuestas y preferencias — en un solo archivo, cuando quieran.
        </p>
        <button className="btn btn-sm" style={{ marginTop: 14 }} onClick={exportData}>
          Descargar mis datos (.json)
        </button>
        {justExported && (
          <p className="compat-line toast-in" style={{ marginTop: 12 }} aria-live="polite">
            ✓ Listo — la historia de {voce} &amp; {amor} ya está a salvo en su dispositivo.
          </p>
        )}
      </div>

      {/* Fechas importantes */}
      <div className="card card-2" style={{ marginTop: 16 }}>
        <span className="overline">Fechas importantes de la pareja</span>
        <p className="muted" style={{ marginTop: 4 }}>Además de su aniversario, guarden otras fechas que quieran recordar — cumpleaños, primer beso, lo que sea.</p>

        {mounted && fechas.length > 0 ? (
          <div className="feature-list" style={{ marginTop: 14 }}>
            {fechas.map((f) => {
              const dias = nextOccurrence(f.mmdd);
              return (
                <div key={f.id} className="feature-item">
                  <div className="feature-item-icon">📅</div>
                  <div className="feature-item-text" style={{ flex: 1 }}>
                    <b>{f.label}</b>
                    {dias != null && <span>{dias === 0 ? "es hoy" : `en ${dias} ${dias === 1 ? "día" : "días"}`}</span>}
                  </div>
                  <button className="del" onClick={() => delFecha(f.id)}>quitar</button>
                </div>
              );
            })}
          </div>
        ) : mounted ? (
          <div className="empty-state">
            <span className="empty-state-icon">📅</span>
            <div className="empty-state-title">Aún no guardaron fechas</div>
            <div className="empty-state-desc">Agreguen la primera con el formulario de abajo</div>
          </div>
        ) : null}

        <form onSubmit={addFecha} style={{ marginTop: 16 }}>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>¿Qué fecha es?</label>
            <input className="input" value={novoLabel} onChange={(e) => setNovoLabel(e.target.value)} placeholder="Ej.: Cumpleaños de Ana" />
          </div>
          <div className="grid2">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Mes (1-12)</label>
              <input className="input" type="number" min="1" max="12" value={novoMes} onChange={(e) => setNovoMes(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Día (1-31)</label>
              <input className="input" type="number" min="1" max="31" value={novoDia} onChange={(e) => setNovoDia(e.target.value)} />
            </div>
          </div>
          <button className="btn" type="submit" style={{ marginTop: 12 }}>Guardar fecha</button>
        </form>
      </div>

      {/* Notificaciones */}
      <div className="card card-1" style={{ marginTop: 16 }}>
        <span className="overline">Notificaciones</span>
        <div style={{ marginTop: 4 }}>
          {NOTIF_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={!!notifPrefs[opt.key]}
                onChange={() => toggleNotif(opt.key)}
                style={{ width: 18, height: 18, accentColor: "var(--gold)" }}
              />
              <span>{opt.label}</span>
              {notifPrefs[opt.key] && <span className="gold-italic toast-in" style={{ fontSize: 12 }}>activado</span>}
            </label>
          ))}
        </div>
        <p className="disclaimer" style={{ marginTop: 8 }}>
          Prototipo: estas preferencias se guardan solo en este navegador. En la app publicada, controlan notificaciones reales.
        </p>
      </div>

      <hr className="hr" />
      <p className="disclaimer" style={{ textAlign: "center" }}>
        Sin cobros escondidos, sin "¿estás seguro de verdad?" tres veces. Cancelen y exporten cuando quieran.
      </p>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <Link className="btn btn-ghost" href={`/hub${qs()}`}>Volver al hub</Link>
      </div>
      <footer>Forja del Amor · prototipo — suscripción transparente, cancelable cuando quieran.</footer>
    </main>
  );
}

export default function Perfil() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
      <PerfilInner />
    </Suspense>
  );
}
