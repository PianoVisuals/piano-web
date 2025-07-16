// RhythmGame.jsx — Piano Tiles Rhythm Game with Centralized White HP Bar and Click Damage
// Updated: clicking outside notes deals HP damage

import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

// Disable mobile zoom
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
const MAX_HP = 100;
const DAMAGE = 20;      // lose HP on miss or wrong click
const HEAL_PER_HIT = 2;  // reduced HP on successful hit
const colorAt = i => BASE_COL[i % BASE_COL.length];

export default function RhythmGame() {
  const [phase, setPhase] = useState("menu");
  const [score, setScore] = useState(0);
  const [notes, setNotes] = useState([]); // {id, lane, t0}
  const [hp, setHp] = useState(MAX_HP);
  const nextId = useRef(0);
  const spawnTimer = useRef(null);
  const audioSampler = useRef(null);

  // Audio setup
  useEffect(() => {
    Tone.setContext(new Tone.Context({ latencyHint: "interactive" }));
    audioSampler.current = new Tone.Sampler({
      urls: NOTE_SOUNDS,
      baseUrl: SOUNDFONT + "acoustic_grand_piano-mp3/",
      release: 1,
      volume: 0
    }).toDestination();
  }, []);

  // Start game
  const startGame = async () => {
    await Tone.start();
    setScore(0);
    setHp(MAX_HP);
    setNotes([]);
    setPhase("play");
    spawnTimer.current = setInterval(() => {
      const now = Date.now();
      const lane = Math.floor(Math.random() * LANES);
      setNotes(n => [...n, { id: nextId.current++, lane, t0: now }]);
    }, SPAWN_INTERVAL);
  };

  // End game
  const stopGame = () => {
    clearInterval(spawnTimer.current);
    setPhase("over");
  };

  // Handle successful hit
  const onHit = (note, e) => {
    e.stopPropagation(); // prevent click damage
    const key = NOTE_KEYS[note.lane];
    audioSampler.current.triggerAttackRelease(key, "8n");
    setScore(s => s + 1);
    setHp(h => Math.min(MAX_HP, h + HEAL_PER_HIT));
    setNotes(n => n.filter(x => x.id !== note.id));
  };

  // Handle missed note (animation end)
  const onMissNote = (note) => {
    setNotes(n => n.filter(x => x.id !== note.id));
    setHp(h => {
      const nh = h - DAMAGE;
      if (nh <= 0) stopGame();
      return nh;
    });
  };

  // Handle wrong click
  const onWrongClick = () => {
    setHp(h => {
      const nh = h - DAMAGE;
      if (nh <= 0) stopGame();
      return nh;
    });
  };

  // Cleanup on phase change
  useEffect(() => {
    if (phase !== "play") clearInterval(spawnTimer.current);
  }, [phase]);

  // Menu screen
  if (phase === "menu") {
    return (
      <Screen>
        <h2>Piano Tiles Rhythm</h2>
        <button style={btn} onClick={startGame}>START</button>
        <button onClick={() => window.location.href='https://pianovisual.com'} style={backBtn}>
          ↩ PianoVisual
        </button>
      </Screen>
    );
  }

  // Game over screen
  if (phase === "over") {
    return (
      <Screen>
        <h2>Game Over</h2>
        <p>Your score: {score}</p>
        <button style={btn} onClick={() => setPhase("menu")}>Menu</button>
      </Screen>
    );
  }

  // Gameplay
  return (
    <div style={gameWrapper}>
      <CentralHPBar hp={hp} maxHp={MAX_HP} />
      <div style={laneContainer} onMouseDown={onWrongClick}>
        {notes.map(note => (
          <div
            key={note.id}
            onMouseDown={(e) => onHit(note, e)}
            onAnimationEnd={() => onMissNote(note)}
            style={noteStyle(note)}
          />
        ))}
      </div>
      <div style={hud}>Score: {score}</div>
      <style>{`
        @keyframes fall { from { transform: translateY(-100%); } to { transform: translateY(100vh); } }
      `}</style>
    </div>
  );
}

function CentralHPBar({ hp, maxHp }) {
  const pct = Math.max(0, hp / maxHp);
  return (
    <div style={centralHpContainer}>
      <div style={{ ...centralHpBar, transform: `scaleX(${pct})` }} />
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
const backBtn = { position: 'fixed', top: '2vh', left: '2vw', zIndex: 3, padding: '0.4rem 0.8rem', fontSize: '1rem', borderRadius: 8, background: '#fff', color: '#111', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.45)', transition: 'transform .18s' };
const gameWrapper = { position: 'fixed', inset: 0, background: '#111', overflow: 'hidden' };
const laneContainer = { position: 'relative', height: '100%', width: '100%', display: 'block' };
const hud = { position: 'fixed', top: '1rem', right: '1rem', color: '#fff', fontSize: '1.2rem' };
const centralHpContainer = { position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', width: '80%', height: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 6, overflow: 'hidden' };
const centralHpBar = { position: 'absolute', top: 0, height: '100%', width: '100%', background: '#fff', transformOrigin: 'center', boxShadow: '0 0 12px 4px rgba(255,255,255,0.8)', transition: 'transform 0.3s ease' };
const noteStyle = (note) => ({
  position: 'absolute',
  left: `${(note.lane / LANES) * 100}%`,
  width: `${100 / LANES}%`,
  height: '10%',
  background: colorAt(note.lane),
  borderRadius: 4,
  boxShadow: `0 0 12px 4px ${colorAt(note.lane)}`,
  pointerEvents: 'auto',
  animation: `fall ${FALL_DURATION}ms linear forwards`
});