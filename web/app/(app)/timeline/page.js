"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const DEFAULT_MEMORIES = [
  { id: "d1", date: "2023-03-12", title: "Primera cita", text: "Ese café que se convirtió en 4 horas de charla.", photo: null },
  { id: "d2", date: "2023-07-28", title: "Primer viaje juntos", text: "Playa, lluvia y nosotros riéndonos de todo.", photo: null },
  { id: "d3", date: "2024-02-14", title: "Un “te amo” de verdad", text: "Sin apuro, como debía ser.", photo: null },
];

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmt(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d} ${MESES[+m - 1]} ${y}`;
}

// Reduce la foto antes de guardarla (modo demo usa el almacenamiento del navegador)
function resizeImage(file, maxSize = 900) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
        else if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function daysUntil(iso) {
  const ms = new Date(iso + "T00:00").getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function TimelineInner() {
  const params = useSearchParams();
  const voce = params.get("voce") || "Tú";
  const amor = params.get("amor") || "Tu amor";
  const sa = params.get("sa") || "";
  const sb = params.get("sb") || "";
  const storageKey = `gff:${voce}:${amor}`;

  const horoQuery = new URLSearchParams();
  [["voce", voce], ["amor", amor], ["sa", sa], ["sb", sb]].forEach(([k, v]) => v && horoQuery.set(k, v));

  const [mounted, setMounted] = useState(false);
  const [memories, setMemories] = useState([]);
  const [capsules, setCapsules] = useState([]);
  const [justAddedId, setJustAddedId] = useState(null);

  const memForm = useRef(null);
  const [mTitle, setMTitle] = useState("");
  const [mDate, setMDate] = useState("");
  const [mText, setMText] = useState("");
  const [mFile, setMFile] = useState(null);

  const [cMsg, setCMsg] = useState("");
  const [cDate, setCDate] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const d = JSON.parse(raw);
        setMemories(d.memories || []);
        setCapsules(d.capsules || []);
      }
    } catch {}
  }, [storageKey]);

  function persist(memoriesNext, capsulesNext) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ memories: memoriesNext, capsules: capsulesNext }));
    } catch {
      alert("Modo demo: el almacenamiento del navegador se llenó (fotos grandes). Borra algún recuerdo y vuelve a intentarlo.");
    }
  }

  async function addMemory(e) {
    e.preventDefault();
    if (!mTitle || !mDate) return;
    const photo = mFile ? await resizeImage(mFile) : null;
    const newId = String(Date.now());
    const next = [...memories, { id: newId, date: mDate, title: mTitle, text: mText, photo }];
    setMemories(next);
    persist(next, capsules);
    setMTitle(""); setMDate(""); setMText(""); setMFile(null);
    if (memForm.current) memForm.current.reset();
    // Resalta brevemente el recuerdo recién guardado en la línea de tiempo
    setJustAddedId(newId);
    setTimeout(() => setJustAddedId((cur) => (cur === newId ? null : cur)), 2400);
  }

  function delMemory(id) {
    const next = memories.filter((m) => m.id !== id);
    setMemories(next);
    persist(next, capsules);
  }

  function addCapsule(e) {
    e.preventDefault();
    if (!cMsg || !cDate) return;
    const next = [...capsules, { id: String(Date.now()), message: cMsg, unlockAt: cDate }];
    setCapsules(next);
    persist(memories, next);
    setCMsg(""); setCDate("");
  }

  function delCapsule(id) {
    const next = capsules.filter((c) => c.id !== id);
    setCapsules(next);
    persist(memories, next);
  }

  const allMemories = [...DEFAULT_MEMORIES, ...memories].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <main className="wrap">
      <div className="couple-header">
        <span className="badge">Línea del tiempo</span>
        <div className="couple-names">{voce} &amp; {amor}</div>
        <div className="couple-meta">construyendo recuerdos juntos 💛</div>
      </div>

      <Link className="card" href={`/horoscopo?${horoQuery.toString()}`} style={{ display: "block", textAlign: "center", marginBottom: 20 }}>
        <span className="badge">✷ Horóscopo de la pareja ✷</span>
        <p className="muted" style={{ marginTop: 8 }}>Mira la energía de hoy entre {voce} y {amor} →</p>
      </Link>

      {/* Línea del tiempo */}
      <div className="timeline">
        {allMemories.map((m) => (
          <div className={`tl-item${m.id === justAddedId ? " tl-item-new" : ""}`} key={m.id}>
            <div className="tl-date">{fmt(m.date)}</div>
            <div className="tl-title">{m.title}</div>
            {m.text && <p className="muted">{m.text}</p>}
            {m.photo && <img className="tl-photo" src={m.photo} alt={m.title} />}
            {!String(m.id).startsWith("d") && (
              <button className="del" onClick={() => delMemory(m.id)}>eliminar</button>
            )}
          </div>
        ))}
      </div>

      {/* Agregar recuerdo */}
      <div className="card">
        <div className="section-title" style={{ margin: "0 0 10px" }}>Agregar un recuerdo</div>
        <form ref={memForm} onSubmit={addMemory}>
          <div className="grid2">
            <div className="field" style={{ margin: "6px 0" }}>
              <label>Título</label>
              <input className="input" value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="Ej.: Nuestro primer viaje" />
            </div>
            <div className="field" style={{ margin: "6px 0" }}>
              <label>Fecha</label>
              <input className="input" type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ margin: "6px 0" }}>
            <label>Descripción</label>
            <input className="input" value={mText} onChange={(e) => setMText(e.target.value)} placeholder="Un detalle para no olvidar nunca" />
          </div>
          <div className="field" style={{ margin: "6px 0" }}>
            <label>Foto (opcional)</label>
            <input className="file-input" type="file" accept="image/*" onChange={(e) => setMFile(e.target.files?.[0] || null)} />
          </div>
          <button className="btn" type="submit" style={{ marginTop: 8 }}>Guardar recuerdo 💛</button>
        </form>
      </div>

      {/* Cápsulas del tiempo */}
      <div className="section-title">Cápsulas del tiempo ⏳</div>
      {mounted && capsules.length === 0 && (
        <p className="hint">Todavía no hay ninguna cápsula. Graba un mensaje que se abra en el futuro 👇</p>
      )}
      {mounted && capsules.map((c) => {
        const restam = daysUntil(c.unlockAt);
        const abierta = restam <= 0;
        return (
          <div className={`capsule ${abierta ? "opened" : ""}`} key={c.id} style={{ marginBottom: 14 }}>
            <div className="lock">{abierta ? "💛" : "🔒"}</div>
            <h3>{abierta ? "¡Cápsula abierta!" : "Cápsula sellada"}</h3>
            {abierta ? (
              <div className="msg">{c.message}</div>
            ) : (
              <>
                <div className="count">{restam} {restam === 1 ? "día" : "días"}</div>
                <small>se abre el {fmt(c.unlockAt)}</small>
              </>
            )}
            <div style={{ marginTop: 10 }}>
              <button className="del" onClick={() => delCapsule(c.id)}>eliminar</button>
            </div>
          </div>
        );
      })}

      {/* Crear cápsula */}
      <div className="card" style={{ marginTop: 6 }}>
        <div className="section-title" style={{ margin: "0 0 10px" }}>Crear una cápsula</div>
        <form onSubmit={addCapsule}>
          <div className="field" style={{ margin: "6px 0" }}>
            <label>Mensaje para el futuro</label>
            <input className="input" value={cMsg} onChange={(e) => setCMsg(e.target.value)} placeholder="Ej.: ¿Te acuerdas de este día?" />
          </div>
          <div className="field" style={{ margin: "6px 0" }}>
            <label>Abrir el</label>
            <input className="input" type="date" value={cDate} onChange={(e) => setCDate(e.target.value)} />
          </div>
          <button className="btn" type="submit" style={{ marginTop: 8 }}>Sellar cápsula ⏳</button>
        </form>
        <p className="hint" style={{ textAlign: "left", marginTop: 10 }}>
          Tip: para ver una cápsula “abrirse”, pon la fecha de <b>hoy o de ayer</b>.
        </p>
      </div>

      <hr className="hr" />
      <p className="disclaimer" style={{ textAlign: "center" }}>
        Modo demo: sus recuerdos quedan guardados solo en este navegador. En la app final, quedan en su cuenta, con respaldo y sincronización entre {voce} y {amor}.
      </p>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <Link className="btn btn-ghost" href="/">Volver al inicio</Link>
      </div>
      <footer>Forja del Amor · prototipo — suscripción transparente, cancelable cuando quieras.</footer>
    </main>
  );
}

export default function Timeline() {
  return (
    <Suspense fallback={<main className="wrap"><p className="muted">Cargando...</p></main>}>
      <TimelineInner />
    </Suspense>
  );
}
