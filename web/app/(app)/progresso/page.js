"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { readStreak, computeBadges, monthlyRecap } from "@/lib/activity";

const MESES_FULL = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
function mesLabelEs() {
  const d = new Date();
  return `${MESES_FULL[d.getMonth()]} de ${d.getFullYear()}`;
}

// Animación de conteo — pequeño toque de interactividad, sin datos nuevos:
// solo anima visualmente el número que ya calculamos hacia su valor final.
function CountUp({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const to = Number(value) || 0;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(to * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}

function ProgressoInner() {
  const params = useSearchParams();
  const voce = params.get("voce") || "Tú";
  const amor = params.get("amor") || "Tu amor";

  const [mounted, setMounted] = useState(false);
  const [streak, setStreak] = useState({ count: 0, longest: 0 });
  const [badges, setBadges] = useState([]);
  const [recap, setRecap] = useState(null);

  useEffect(() => {
    setMounted(true);
    setStreak(readStreak(voce, amor));
    setBadges(computeBadges(voce, amor));
    setRecap(monthlyRecap(voce, amor));
  }, [voce, amor]);

  const back = new URLSearchParams();
  ["voce", "amor", "sa", "sb"].forEach((k) => params.get(k) && back.set(k, params.get(k)));

  const desbloqueadas = badges.filter((b) => b.unlocked).length;
  const todasDesbloqueadas = mounted && badges.length > 0 && desbloqueadas === badges.length;

  return (
    <main className="wrap">
      <div className="couple-header">
        <span className="badge">📊 Nuestro progreso</span>
        <div className="couple-names">{voce} &amp; {amor}</div>
        <div className="couple-meta">el camino de ustedes, en números</div>
      </div>

      {mounted && (
        <div className="card card-3" style={{ textAlign: "center" }}>
          <div className="ring" style={{ "--ring-pct": Math.min(100, (streak.count / Math.max(streak.longest, 7)) * 100), margin: "0 auto" }}>
            <span className="ring-value"><CountUp value={streak.count} /></span>
          </div>
          {streak.count > 0 ? (
            <p className="muted" style={{ marginTop: 12 }}>{streak.count === 1 ? "día seguido" : "días seguidos"} cuidando la relación 🔥</p>
          ) : (
            <p className="muted" style={{ marginTop: 12 }}>Cada día que cuidan el uno del otro cuenta. Empiecen hoy, {voce} y {amor} 💛</p>
          )}
          {streak.longest > streak.count && (
            <p className="disclaimer" style={{ marginTop: 6 }}>Récord de ustedes: {streak.longest} días seguidos.</p>
          )}
        </div>
      )}

      {mounted && recap && (
        <div className="card card-2" style={{ marginTop: 14 }}>
          <span className="overline">Resumen del mes</span>
          <div className="section-title" style={{ marginTop: 0, textTransform: "capitalize" }}>{mesLabelEs()}</div>
          <div className="stat-row" style={{ marginTop: 10 }}>
            <div className="stat">
              <div className="stat-value">{recap.memoriesThisMonth}</div>
              <div className="stat-label">📸 recuerdos</div>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <div className="stat-value">{recap.capsulesSealedThisMonth}</div>
              <div className="stat-label">⏳ cápsulas</div>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <div className="stat-value">{recap.reconectarChecks}</div>
              <div className="stat-label">💞 misiones</div>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <div className="stat-value">{recap.agirDoneCount}</div>
              <div className="stat-label">🎯 gestos</div>
            </div>
          </div>
        </div>
      )}

      <div className="section-head">
        <span className="section-head-title">Logros ({desbloqueadas}/{badges.length})</span>
      </div>
      {mounted && badges.length > 0 && (
        <div className="progress">
          <i style={{ width: `${(desbloqueadas / badges.length) * 100}%` }} />
        </div>
      )}
      {todasDesbloqueadas && (
        <p className="compat-line" style={{ textAlign: "center", marginTop: -8, marginBottom: 14 }}>
          🎉 ¡Desbloquearon todos los logros, {voce} y {amor}! Sigan escribiendo la historia de ustedes.
        </p>
      )}
      <div className="grid2">
        {badges.map((b) => (
          <div key={b.id} className={`card ${b.unlocked ? "card-2" : "card-1"}`} style={{ opacity: b.unlocked ? 1 : 0.5, textAlign: "center" }}>
            <div style={{ fontSize: 30 }}>{b.unlocked ? b.emoji : "🔒"}</div>
            <div className="section-title" style={{ fontSize: 18, margin: "6px 0 4px" }}>{b.title}</div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>{b.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <Link className="btn btn-ghost" href={`/hub?${back.toString()}`}>Volver a la app</Link>
      </div>
      <footer>Forja del Amor · prototipo</footer>
    </main>
  );
}

export default function Progresso() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
      <ProgressoInner />
    </Suspense>
  );
}
