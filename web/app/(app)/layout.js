"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

// Áreas siempre libres: el hub (navegación), Hoy y Nosotros (para vivir la app un poco antes de pedir pago), y Perfil (para poder suscribirse).
const RUTAS_LIBRES = ["/hub", "/hoje", "/timeline", "/perfil"];

// El build usa trailingSlash:true, así que usePathname() puede devolver "/hub/" en vez de "/hub".
// Normalizamos quitando una barra final (sin reducir la raíz "/" a cadena vacía) antes de comparar.
function normalizarPathname(pathname) {
  if (pathname && pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

// El resto de las áreas quedan bloqueadas desde el primer acceso hasta que haya una suscripción activa.
function FeatureGate({ children }) {
  const params = useSearchParams();
  const pathname = normalizarPathname(usePathname());
  const voce = params.get("voce") || "";
  const amor = params.get("amor") || "";
  const bloqueable = !RUTAS_LIBRES.includes(pathname);
  const [hasAccess, setHasAccess] = useState(true); // optimista: no bloquea hasta confirmar que no tiene acceso

  useEffect(() => {
    if (!bloqueable || !voce || !amor) return;
    let cancelado = false;
    (async () => {
      let acesso = false;
      try {
        const correlationCode = localStorage.getItem(`gff-correlation:${voce}:${amor}`);
        if (correlationCode) {
          const r = await fetch(`https://oddpro.pro/api-forja/api/subscription/${correlationCode}`);
          if (r.ok) {
            const estado = await r.json();
            acesso = Boolean(estado?.hasAccess);
          }
        }
      } catch {}
      if (!cancelado) setHasAccess(acesso);
    })();
    return () => { cancelado = true; };
  }, [voce, amor, bloqueable]);

  if (!bloqueable || hasAccess) return children;

  const qs = () => {
    const q = new URLSearchParams();
    ["voce", "amor", "sa", "sb"].forEach((k) => params.get(k) && q.set(k, params.get(k)));
    const s = q.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="wrap">
      <div className="locked-map" style={{ maxHeight: 480, overflow: "hidden", marginTop: 20 }}>
        <div className="locked-map-body" style={{ maxHeight: 480, overflow: "hidden" }}>
          <div className="locked-map-content" aria-hidden="true">{children}</div>
          <div className="locked-map-veil" />
          <div className="locked-seal">🔒</div>
          <div className="locked-cta">
            <h3>Esto se abre con la suscripción</h3>
            <p>$5 USD/mes · 7 días gratis, sin compromiso</p>
            <Link className="btn" href={`/planos${qs()}`}>Suscribirme →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const NAV = [
  { href: "/hub", emoji: "🏠", label: "App" },
  { href: "/hoje", emoji: "☀️", label: "Hoy" },
  { href: "/timeline", emoji: "📸", label: "Nosotros" },
  { href: "/reconectar", emoji: "💞", label: "Reconectar" },
  { href: "/descobrir", emoji: "🔮", label: "Descubrir" },
  { href: "/agir", emoji: "🎯", label: "Actuar" },
  { href: "/horoscopo", emoji: "✷", label: "Astro" },
  { href: "/progresso", emoji: "📊", label: "Progreso" },
  { href: "/retrospectiva", emoji: "🎉", label: "Retrospectiva" },
  { href: "/perfil", emoji: "⚙️", label: "Perfil" },
];

function AppNavInner() {
  const pathname = normalizarPathname(usePathname());
  const params = useSearchParams();
  const voce = params.get("voce") || "";
  const amor = params.get("amor") || "";
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    if (!voce || !amor) return;
    let cancelado = false;
    (async () => {
      let acesso = false;
      try {
        const correlationCode = localStorage.getItem(`gff-correlation:${voce}:${amor}`);
        if (correlationCode) {
          const r = await fetch(`https://oddpro.pro/api-forja/api/subscription/${correlationCode}`);
          if (r.ok) {
            const estado = await r.json();
            acesso = Boolean(estado?.hasAccess);
          }
        }
      } catch {}
      if (!cancelado) setHasAccess(acesso);
    })();
    return () => { cancelado = true; };
  }, [voce, amor]);

  const qs = () => {
    const q = new URLSearchParams();
    ["voce", "amor", "sa", "sb"].forEach((k) => params.get(k) && q.set(k, params.get(k)));
    const s = q.toString();
    return s ? `?${s}` : "";
  };
  return (
    <div className="appnav-wrap">
      <nav className="appnav">
        {NAV.map((n) => {
          const bloqueado = !hasAccess && !RUTAS_LIBRES.includes(n.href);
          return (
            <Link key={n.href} href={`${n.href}${qs()}`} className={pathname === n.href ? "active" : ""} style={bloqueado ? { opacity: 0.55 } : undefined}>
              <span>{n.emoji}</span>
              <span>{n.label}</span>
              {bloqueado && <span style={{ fontSize: 10 }}>🔒</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AppGroupLayout({ children }) {
  return (
    <>
      <Suspense fallback={<div className="appnav-wrap" style={{ height: 44 }} />}>
        <AppNavInner />
      </Suspense>
      <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
        <FeatureGate>{children}</FeatureGate>
      </Suspense>
    </>
  );
}
