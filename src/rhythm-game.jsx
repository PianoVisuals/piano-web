// RhythmGame.jsx — Piano Tiles Style Rhythm Game
// Updated: tap anywhere, per-lane sounds, glow effect, disable mobile zoom

import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

// Inject Ko‑fi button style globally once
if (typeof document !== 'undefined' && !document.getElementById('kofi-style')) {
  const kofiStyle = document.createElement('style');
  kofiStyle.id = 'kofi-style';
  kofiStyle.innerHTML = `.kofi-mobile-button{position:fixed;bottom:0.5rem;right:1rem;width:100px;height:100px;background:url('https://cdn.ko-fi.com/cdn/kofi5.png?v=3') center center/contain no-repeat;opacity:0.7;transition:opacity .2s;z-index:1000;} .kofi-mobile-button:hover{opacity:1;}`;
  document.head.appendChild(kofiStyle);
}

// Disable mobile double-tap zoom
if (typeof document !== 'undefined' && !document.querySelector('meta[name=viewport]')) {
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
  document.head.appendChild(meta);
}

/* ===== CONSTANTES ===== */
const SOUNDFONT = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/";
const NOTE_KEYS = ["C4", "D4", "E4", "F4"]; // one per lane
const NOTE_SOUNDS = { C4: "C4.mp3", D4: "D4.mp3", E4: "E4.mp3", F4: "F4.mp3" };
const LANES = NOTE_KEYS.length;
const SPAWN_INTERVAL = 800;
const FALL_DURATION = 3000;
const BASE_COL = ["#ff7675","#ffeaa7","#55efc4","#74b9ff"];
const colorAt = i => BASE_COL[i % BASE_COL.length];

export default function RhythmGame() {
  const [phase, setPhase] = useState("menu");
  const [score, setScore] = useState(0);
  const [notes, setNotes] = useState([]); // {id, lane, t0}
  const nextId = useRef(0);
  const spawnTimer = useRef(null);
  const audioSampler = useRef(null);

  // Initialisation audio
  useEffect(() => {
    Tone.setContext(new Tone.Context({ latencyHint: "interactive" }));
    audioSampler.current = new Tone.Sampler({
      urls: NOTE_SOUNDS,
      baseUrl: SOUNDFONT + "acoustic_grand_piano-mp3/",
      release: 1,
      volume: 0
    }).toDestination();
  }, []);

  // Démarre le jeu
  const startGame = async () => {
    await Tone.start();
    setScore(0);
    setNotes([]);
    setPhase("play");
    spawnTimer.current = setInterval(() => {
      const now = Date.now();
      const lane = Math.floor(Math.random() * LANES);
      setNotes(n => [...n, { id: nextId.current++, lane, t0: now }]);
    }, SPAWN_INTERVAL);
  };

  // Arrêt du jeu
  const stopGame = () => {
    clearInterval(spawnTimer.current);
    setPhase("over");
  };

  // Gère le tap sur note, n'importe où
  const onTap = (lane) => {
    // prend la première note tombante de la colonne
    const hit = notes.find(n => n.lane === lane);
    if (hit) {
      // jouer note correspondant à la colonne
      const key = NOTE_KEYS[lane % NOTE_KEYS.length];
      audioSampler.current.triggerAttackRelease(key, "8n");
      setScore(s => s + 1);
      setNotes(n => n.filter(x => x.id !== hit.id));
    }
  };

  // Nettoyage
  useEffect(() => {
    if (phase !== "play") clearInterval(spawnTimer.current);
  }, [phase]);

  // Menu
  if (phase === "menu") {
    return (
      <Screen>
        <h2>Piano Tiles Rhythm</h2>
        <button style={btn} onClick={startGame}>START</button>
        <button onClick={()=>window.location.href='https://pianovisual.com'}
          style={backBtn}>
          ↩ PianoVisual
        </button>
        <a href="https://ko-fi.com/pianovisual" target="_blank" rel="noopener" className="kofi-mobile-button" title="Support me on Ko‑fi"></a>
      </Screen>
    );
  }

  // Game Over
  if (phase === "over") {
    return (
      <Screen>
        <h2>Game Over</h2>
        <p>Your score: {score}</p>
        <button style={btn} onClick={() => setPhase("menu")}>Menu</button>
      </Screen>
    );
  }

  // Partie en cours
  return (
    <div style={gameWrapper}>
      <div style={laneContainer}>
        {Array.from({ length: LANES }).map((_, i) => (
          <div key={i} style={columnStyle(i)} onMouseDown={() => onTap(i)} />
        ))}
        {notes.map(n => (
          <div key={n.id}
            onMouseDown={() => onTap(n.lane)}
            style={noteStyle(n)}
          />
        ))}
      </div>
      <div style={hud}>Score: {score}</div>
      <style>{`
        @keyframes fall { from{transform:translateY(-100%);} to{transform:translateY(100vh);} }
      `}</style>
    </div>
  );
}

/* --- Styles --- */
const Screen = ({ children }) => (
  <div style={{ position: 'fixed', inset: 0, background: '#111', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
    {children}
  </div>
);
const btn = { margin: '0.5rem', padding: '0.9rem 2.1rem', fontSize: '1.25rem', border: 'none', borderRadius: 10, cursor: 'pointer', background: '#55efc4', color: '#111', fontWeight: 600 };
const backBtn = { position:"fixed", top:"2vh", left:"2vw", zIndex:3, padding:"0.4rem 0.8rem", fontSize:"1rem", borderRadius:8, background:"#fff", color:"#111", border:"none", cursor:"pointer", boxShadow:"0 2px 4px rgba(0,0,0,0.45)", transition:"transform .18s" };
const gameWrapper = { position: 'fixed', inset: 0, background: '#111', overflow: 'hidden' };
const laneContainer = { position: 'relative', height: '100%', display: 'flex' };
const columnStyle = i => ({ flex: 1, border: '1px solid #222', background: '#1c1c1c', cursor: 'pointer', overflow: 'hidden' });
const noteStyle = (n) => ({
  position: 'absolute',
  left: `${(n.lane / LANES) * 100}%`,
  width: `${100 / LANES}%`,
  height: '10%',
  background: colorAt(n.lane),
  borderRadius: 4,
  boxShadow: `0 0 12px 4px ${colorAt(n.lane)}`,
  pointerEvents: 'auto',
  animation: `fall ${FALL_DURATION}ms linear forwards`
});
const hud = { position: 'fixed', top: '1rem', right: '1rem', color: '#fff', fontSize: '1.2rem' };
