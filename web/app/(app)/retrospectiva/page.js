"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { readStreak, collectData } from "@/lib/activity";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmt(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d} ${MESES[+m - 1]} ${y}`;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
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

// Agregado anual — no existe todavía en lib/activity.js (que solo hace recap mensual),
// así que leemos directo la clave de la línea de tiempo y filtramos por el año actual.
function yearlyRecap(voce, amor) {
  const timeline = readJSON(`gff:${voce}:${amor}`, { memories: [], capsules: [] });
  const year = String(new Date().getFullYear());

  const memoriesThisYear = (timeline.memories || [])
    .filter((m) => (m.date || "").slice(0, 4) === year)
    .sort((a, b) => a.date.localeCompare(b.date));

  const capsulesSealedThisYear = (timeline.capsules || []).filter(
    (c) => (c.unlockAt || "").slice(0, 4) === year
  ).length;

  return {
    year,
    memoriesCount: memoriesThisYear.length,
    capsulesSealedThisYear,
    oldest: memoriesThisYear[0] || null,
    newest: memoriesThisYear[memoriesThisYear.length - 1] || null,
  };
}

function RetrospectivaInner() {
  const params = useSearchParams();
  const voce = params.get("voce") || "Tú";
  const amor = params.get("amor") || "Tu amor";

  const [mounted, setMounted] = useState(false);
  const [recap, setRecap] = useState(null);
  const [streak, setStreak] = useState({ count: 0, longest: 0 });
  const [reconectarChecks, setReconectarChecks] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRecap(yearlyRecap(voce, amor));
    setStreak(readStreak(voce, amor));
    setReconectarChecks(collectData(voce, amor).reconectarChecks);
  }, [voce, amor]);

  const qs = () => {
    const q = new URLSearchParams();
    ["voce", "amor", "sa", "sb"].forEach((k) => {
      const v = params.get(k);
      if (v) q.set(k, v);
    });
    const s = q.toString();
    return s ? `?${s}` : "";
  };

  const semMemorias = mounted && recap && recap.memoriesCount === 0;

  const shareText = recap
    ? `Año de ${voce} y ${amor}: ${recap.memoriesCount} ${recap.memoriesCount === 1 ? "recuerdo guardado" : "recuerdos guardados"}, ${recap.capsulesSealedThisYear} ${recap.capsulesSealedThisYear === 1 ? "cápsula sellada" : "cápsulas selladas"} 💛`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard no disponible — el botón de WhatsApp sigue funcionando igual
    }
  };

  return (
    <main className="wrap">
      <div className="couple-header">
        <span className="badge">✨ Retrospectiva anual</span>
        <div className="couple-names">El año de {voce} &amp; {amor} en números</div>
        <div className="couple-meta">{recap ? recap.year : new Date().getFullYear()}</div>
      </div>

      {semMemorias && (
        <div className="card" style={{ textAlign: "center" }}>
          <p className="compat-line">El año de ustedes todavía se está escribiendo — empiecen a guardar recuerdos en Nosotros 💛</p>
          <Link className="btn" style={{ marginTop: 10 }} href={`/timeline${qs()}`}>Guardar el primer recuerdo →</Link>
        </div>
      )}

      {mounted && recap && !semMemorias && (
        <>
          <div className="card" style={{ textAlign: "center" }}>
            <div className="pct"><CountUp value={recap.memoriesCount} /></div>
            <p className="muted">{recap.memoriesCount === 1 ? "recuerdo guardado" : "recuerdos guardados"} en {recap.year}</p>
          </div>

          <div className="grid2" style={{ marginTop: 14 }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28 }}>⏳</div>
              <div className="section-title" style={{ margin: "6px 0 4px" }}><CountUp value={recap.capsulesSealedThisYear} /></div>
              <p className="muted" style={{ margin: 0 }}>{recap.capsulesSealedThisYear === 1 ? "cápsula sellada" : "cápsulas selladas"} este año</p>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28 }}>💞</div>
              <div className="section-title" style={{ margin: "6px 0 4px" }}><CountUp value={reconectarChecks} /></div>
              <p className="muted" style={{ margin: 0 }}>misiones de reconexión completadas desde el inicio</p>
            </div>

            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28 }}>🔥</div>
              <div className="section-title" style={{ margin: "6px 0 4px" }}><CountUp value={streak.longest} /></div>
              <p className="muted" style={{ margin: 0 }}>racha más larga de días seguidos</p>
            </div>

            {recap.oldest && (
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28 }}>🌱</div>
                <div className="section-title" style={{ margin: "6px 0 4px" }}>{recap.oldest.title}</div>
                <p className="muted" style={{ margin: 0 }}>recuerdo más antiguo del año · {fmt(recap.oldest.date)}</p>
              </div>
            )}

            {recap.newest && recap.newest.id !== recap.oldest?.id && (
              <div className="card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28 }}>🌟</div>
                <div className="section-title" style={{ margin: "6px 0 4px" }}>{recap.newest.title}</div>
                <p className="muted" style={{ margin: 0 }}>recuerdo más reciente del año · {fmt(recap.newest.date)}</p>
              </div>
            )}
          </div>

          <div className="card" style={{ textAlign: "center", marginTop: 16 }}>
            <span className="badge">🎁 Guarden este año</span>
            <p className="muted" style={{ marginTop: 10 }}>Compartan la retrospectiva de ustedes con quienes celebran su historia.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 6 }}>
              <a
                className="btn"
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
              >
                Compartir
              </a>
              <button type="button" className="btn btn-ghost" onClick={handleCopy}>
                {copied ? "¡Copiado! ✓" : "Copiar texto"}
              </button>
            </div>
          </div>
        </>
      )}

      <p className="disclaimer" style={{ textAlign: "center", marginTop: 18 }}>
        Todos los números de arriba vienen de los recuerdos y cápsulas que ustedes mismos guardaron — nada aquí está inventado.
      </p>

      <hr className="hr" />
      <div style={{ textAlign: "center" }}>
        <Link className="btn btn-ghost" href={`/hub${qs()}`}>Volver a la app</Link>
      </div>
      <footer>Forja del Amor · prototipo</footer>
    </main>
  );
}

export default function Retrospectiva() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
      <RetrospectivaInner />
    </Suspense>
  );
}
