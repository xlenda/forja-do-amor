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

  const planKey = `gff-plan:${voce}:${amor}`;
  const notifKey = `gff-notif-prefs:${voce}:${amor}`;

  const [mounted, setMounted] = useState(false);
  const [plan, setPlan] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [justCanceled, setJustCanceled] = useState(false);
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

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(planKey);
      if (raw) {
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = { name: raw };
        }
        setPlan(parsed);
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
  }, [planKey, notifKey]);

  // Esconde el aviso de exportación exitosa después de unos segundos.
  useEffect(() => {
    if (!justExported) return;
    const t = setTimeout(() => setJustExported(false), 4000);
    return () => clearTimeout(t);
  }, [justExported]);

  function requestCancel() {
    setShowCancelConfirm(true);
  }

  function keepSubscription() {
    setShowCancelConfirm(false);
  }

  function confirmCancel() {
    try {
      localStorage.removeItem(planKey);
    } catch {}
    setPlan(null);
    setShowCancelConfirm(false);
    setJustCanceled(true);
  }

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
        <div className="card fade-in" style={{ marginTop: 16, textAlign: "center", borderColor: "rgba(212,175,55,.45)" }}>
          <span className="badge">🎉 {marcoAtingido} {marcoAtingido === 1 ? "mes" : "meses"} de suscripción</span>
          <p className="compat-line" style={{ marginTop: 10 }}>
            {voce} &amp; {amor} llevan {marcoAtingido} {marcoAtingido === 1 ? "mes" : "meses"} guardando su historia en Forja del Amor. Feliz aniversario de suscripción 💛
          </p>
        </div>
      )}

      {/* Suscripción */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: "0 0 10px" }}>Sobre la suscripción</div>

        {!mounted ? (
          <p className="muted">Cargando...</p>
        ) : justCanceled ? (
          <p className="compat-line">
            Cancelada — sin letra chica. Ustedes mantienen el acceso hasta el final del período ya pagado, y los datos de {voce} &amp; {amor} siguen guardados aquí.
          </p>
        ) : plan ? (
          <>
            <p className="compat-line">
              Plan actual: <b>{plan.name || "Plan activo"}</b>
            </p>
            {renewal && (
              <p className="muted" style={{ marginTop: 4 }}>
                Próximo cobro el {fmt(renewal)}
                {diasParaCobro != null && diasParaCobro >= 0 && (
                  <>
                    {" · "}
                    <span className="gold-italic">{diasAnimados}</span> {diasAnimados === 1 ? "día" : "días"}
                  </>
                )}
              </p>
            )}

            {!showCancelConfirm ? (
              <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={requestCancel}>
                Cancelar suscripción
              </button>
            ) : (
              <div style={{ marginTop: 14 }}>
                <p className="muted">
                  ¿Están seguros? Perderán el acceso al final del período ya pagado, pero los datos seguirán siendo de ustedes.
                </p>
                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <button className="btn" onClick={confirmCancel}>Sí, cancelar</button>
                  <button className="btn btn-ghost" onClick={keepSubscription}>Mantener suscripción</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="muted">Sin suscripción activa — 7 días gratis disponibles.</p>
            <Link className="btn" style={{ marginTop: 14, display: "inline-block" }} href={`/planos${qs()}`}>
              Ver planes
            </Link>
          </>
        )}
      </div>

      {/* Exportar datos */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: "0 0 10px" }}>Exportar mis datos</div>
        <p className="muted">
          Descarguen todo lo que {voce} &amp; {amor} guardaron en la app — recuerdos, cápsulas, respuestas y preferencias — en un solo archivo, cuando quieran.
        </p>
        <button className="btn" style={{ marginTop: 14 }} onClick={exportData}>
          Descargar mis datos (.json)
        </button>
        {justExported && (
          <p className="compat-line toast-in" style={{ marginTop: 12 }} aria-live="polite">
            ✓ Listo — la historia de {voce} &amp; {amor} ya está a salvo en su dispositivo.
          </p>
        )}
      </div>

      {/* Fechas importantes */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: "0 0 10px" }}>Fechas importantes de la pareja</div>
        <p className="muted">Además de su aniversario, guarden otras fechas que quieran recordar — cumpleaños, primer beso, lo que sea.</p>

        {mounted && fechas.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {fechas.map((f) => {
              const dias = nextOccurrence(f.mmdd);
              return (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ flex: 1 }}>
                    <b style={{ color: "var(--ivory)" }}>{f.label}</b>
                    {dias != null && <span className="muted"> — {dias === 0 ? "es hoy" : `en ${dias} ${dias === 1 ? "día" : "días"}`}</span>}
                  </span>
                  <button className="del" onClick={() => delFecha(f.id)}>quitar</button>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={addFecha} style={{ marginTop: 14 }}>
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
      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title" style={{ margin: "0 0 10px" }}>Notificaciones</div>
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
