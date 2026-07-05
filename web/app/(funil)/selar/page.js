"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const hoyISO = new Date().toISOString().slice(0, 10);

function SelarInner() {
  const params = useSearchParams();
  const router = useRouter();
  const voce = params.get("voce") || "Tú";
  const amor = params.get("amor") || "Tu amor";

  const [memoria, setMemoria] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [desejo, setDesejo] = useState("");
  const [selando, setSelando] = useState(false);
  const [selado, setSelado] = useState(false);
  const [aviso, setAviso] = useState("");

  // Ritual de respiración
  const [ritualStarted, setRitualStarted] = useState(false);
  const [breathCount, setBreathCount] = useState(0);
  const [phase, setPhase] = useState("inhala");
  const [canalizando, setCanalizando] = useState(false);
  const phaseTimer = useRef(null);

  const pronto = memoria.trim() && dataInicio;

  function salvarDeVerdade() {
    // La promesa de esta pantalla es literal: esto se convierte en el 1er recuerdo (y, si lo escriben, la 1a meta) reales de la pareja.
    try {
      const tKey = `gff:${voce}:${amor}`;
      const traw = localStorage.getItem(tKey);
      const t = traw ? JSON.parse(traw) : { memories: [], capsules: [] };
      t.startDate = dataInicio;
      t.memories = [
        { id: `sealed-${Date.now()}`, date: dataInicio, title: "Cómo empezó todo", text: memoria, photo: null },
        ...(t.memories || []),
      ];
      localStorage.setItem(tKey, JSON.stringify(t));

      if (desejo.trim()) {
        const aKey = `gff-agir:${voce}:${amor}`;
        const araw = localStorage.getItem(aKey);
        const a = araw ? JSON.parse(araw) : { favorites: [], done: [] };
        a.goalSaved = desejo;
        a.goalDone = false;
        localStorage.setItem(aKey, JSON.stringify(a));
      }

      localStorage.setItem(`gff-selo:${voce}:${amor}`, "1");
    } catch {}
  }

  function selar() {
    if (!pronto) return;
    setSelando(true);
    setTimeout(() => {
      salvarDeVerdade();
      setSelando(false);
      setSelado(true);
    }, 900);
  }

  function handleSelar() {
    if (!pronto) {
      setAviso(
        !memoria.trim() ? "Escribí un recuerdo para sellar el capítulo." :
        "Falta la fecha en que todo empezó."
      );
      return;
    }
    setAviso("");
    selar();
  }

  function startRitual() {
    setRitualStarted(true);
    setPhase("inhala");
    phaseTimer.current = setInterval(() => {
      setPhase((p) => (p === "inhala" ? "exhala" : "inhala"));
    }, 4000);
  }

  function marcarRespiracion() {
    setBreathCount((c) => {
      const next = Math.min(3, c + 1);
      if (next === 3 && phaseTimer.current) {
        clearInterval(phaseTimer.current);
      }
      return next;
    });
  }

  useEffect(() => () => phaseTimer.current && clearInterval(phaseTimer.current), []);

  function irAlHub() {
    setCanalizando(true);
    setTimeout(() => {
      const q = new URLSearchParams();
      ["voce", "amor", "sa", "sb", "en"].forEach((k) => params.get(k) && q.set(k, params.get(k)));
      router.push(`/hub?${q.toString()}`);
    }, 900);
  }

  if (selando) {
    return (
      <main className="wrap">
        <div className="loading">
          <div className="orb">✷</div>
          <h2>Sellando el primer capítulo de ustedes<span className="dots" /></h2>
        </div>
      </main>
    );
  }

  if (canalizando) {
    return (
      <main className="wrap">
        <div className="loading">
          <div className="orb">✴</div>
          <h2>Abriendo su app<span className="dots" /></h2>
        </div>
      </main>
    );
  }

  if (selado) {
    return (
      <main className="wrap">
        <div>
          <div className="line-label"><span>Capítulo sellado</span></div>
          <div className="bigstar">✴</div>
          <h1 className="reveal-title" style={{ fontSize: 30 }}>Su primer capítulo quedó sellado.</h1>
          <p style={{ textAlign: "center", marginBottom: 6 }}>
            <span className="badge">🛡️ Guardianes de su propia historia</span>
          </p>
          <p className="reveal-sub" style={{ maxWidth: 480, margin: "0 auto" }}>
            El recuerdo y el deseo de {voce} y {amor} ya están guardados. Dentro de la app, ese deseo vuelve a ustedes el día que elijan — como una cápsula que se abre sola. Antes de entrar, una pausa juntos.
          </p>
        </div>

        <div className="section-head">
          <span className="section-head-title">Antes de entrar</span>
          <span className="section-head-action">✷ un minuto juntos</span>
        </div>

        <div className="card card-3 breath-wrap">
          <span className="overline" style={{ textAlign: "center" }}>Ritual de respiración</span>
          {!ritualStarted ? (
            <>
              <p className="compat-line" style={{ maxWidth: 420, margin: "0 auto" }}>
                Antes de entrar a su app, hagan una pausa juntos.
              </p>
              <p className="muted" style={{ maxWidth: 420, margin: "8px auto 0" }}>
                Van a respirar tres veces, a su ritmo. No promete nada mágico: solo los trae a los dos al mismo momento.
              </p>
              <button className="btn" style={{ marginTop: 20 }} onClick={startRitual}>Iniciar</button>
            </>
          ) : (
            <>
              <p className="compat-line" style={{ maxWidth: 440, margin: "0 auto" }}>
                {breathCount === 0 && "Inhalen despacio... llenen el pecho... y suelten. Así, sin apuro."}
                {breathCount === 1 && "Otra vez. Al inhalar, piensen en la persona que tienen al lado. Al soltar, dejen ir el ruido del día."}
                {breathCount === 2 && "La última. Inhalen juntos... sostengan un segundo... y suelten. Ya casi."}
                {breathCount >= 3 && "Tres respiraciones, los dos, en el mismo instante. Eso ya es estar presentes."}
              </p>

              <div className="breath-circle">
                <span>{breathCount >= 3 ? "✷" : phase === "inhala" ? "Inhala…" : "Exhala…"}</span>
              </div>

              <div className="breath-seeds">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`breath-seed ${breathCount > i ? "lit" : ""}`} />
                ))}
              </div>

              {breathCount < 3 ? (
                <button className="btn" style={{ marginTop: 26 }} onClick={marcarRespiracion}>
                  Marcar respiración
                </button>
              ) : (
                <button className="btn" style={{ marginTop: 26 }} onClick={irAlHub}>
                  Ahora sí: entrar a nuestra app →
                </button>
              )}
            </>
          )}
        </div>

        <footer>Forja del Amor · prototipo</footer>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div className="line-label"><span>Antes de continuar</span></div>
      <div className="bigstar">✴</div>
      <h1 className="reveal-title" style={{ fontSize: 28 }}>Sellen el primer capítulo de ustedes</h1>
      <p className="reveal-sub" style={{ maxWidth: 460, margin: "0 auto 20px" }}>
        Tres cosas simples — y ya empiezan la línea de tiempo de {voce} &amp; {amor}.
      </p>

      <div className="form-wrap card-3">
        <div className="field">
          <label>Un recuerdo que vale la pena guardar</label>
          <textarea
            className="input"
            rows={3}
            style={{ resize: "vertical", minHeight: 88, fontFamily: "var(--sans)" }}
            value={memoria}
            onChange={(e) => setMemoria(e.target.value)}
            placeholder="Ej.: El viaje en que nos perdimos y nos reímos hasta llorar"
          />
        </div>
        <div className="field">
          <label>La fecha en que todo empezó</label>
          <input className="input" type="date" max={hoyISO} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Un deseo para los próximos 12 meses (opcional)</label>
          <input className="input" value={desejo} onChange={(e) => setDesejo(e.target.value)} placeholder="Ej.: Viajar a un lugar donde ninguno de los dos ha estado" />
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Si todavía no lo tienen claro, lo pueden completar después, dentro de la app.</p>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 8 }}>
        <button className="btn" onClick={handleSelar}>Sellar nuestro capítulo ✷</button>
        {aviso && (
          <p role="alert" aria-live="polite" style={{ color: "var(--gold-bright)", textAlign: "center", marginTop: 8, fontSize: 14 }}>
            {aviso}
          </p>
        )}
      </div>
      <footer>Forja del Amor · prototipo</footer>
    </main>
  );
}

export default function Selar() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
      <SelarInner />
    </Suspense>
  );
}
