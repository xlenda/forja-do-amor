"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

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
  const pathname = usePathname();
  const params = useSearchParams();
  const qs = () => {
    const q = new URLSearchParams();
    ["voce", "amor", "sa", "sb"].forEach((k) => params.get(k) && q.set(k, params.get(k)));
    const s = q.toString();
    return s ? `?${s}` : "";
  };
  return (
    <div className="appnav-wrap">
      <nav className="appnav">
        {NAV.map((n) => (
          <Link key={n.href} href={`${n.href}${qs()}`} className={pathname === n.href ? "active" : ""}>
            <span>{n.emoji}</span>
            <span>{n.label}</span>
          </Link>
        ))}
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
      {children}
    </>
  );
}
