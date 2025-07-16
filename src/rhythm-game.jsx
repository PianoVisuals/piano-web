// RhythmGame.jsx — Piano Tiles Rhythm Game with Difficulty, Combo & Enhanced HP Bar Flash and Combo Duration
// Updated: softer red flash, stronger glow, combo duration tracking at game over

import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

// Disable mobile zoom
if (typeof document !== 'undefined' && !document.querySelector('meta[name=viewport]')) {
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
  document.head.appendChild(meta);
}

/* ===== CONSTANTES ET PRÉSETS ===== */
const SOUNDFONT = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/";
const NOTE_KEYS = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];
const NOTE_SOUNDS = { C4: "C4.mp3", D4: "D4.mp3", E4: "E4.mp3", F4: "F4.mp3", G4: "G4.mp3", A4: "A4.mp3", B4: "B4.mp3" };

const PRESETS = {
  Easy:   { lanes: 4,  interval: 800,  maxHp: 100, multiplier: 1 },
  Normal: { lanes: 6,  interval: 700,  maxHp: 100, multiplier: 1.5 },
  Hard:   { lanes: 8,  interval: 600,  maxHp: 80,  multiplier: 2 },
  Insane: { lanes: 20, interval: 400,  maxHp: 60,  multiplier: 3 }
};
const BASE_COL = ["#ff7675","#ffeaa7","#55efc4","#74b9ff","#a29bfe","#81ecec","#fab1a0"];
const DAMAGE = 20;
const HEAL_PER_HIT = 2;
const FLASH_ALPHA = 0.25; // softer red flash opacity
const FLASH_GLOW = '0 0 20px 10px rgba(255,0,0,0.25)';
const NORMAL_GLOW = '0 0 12px 4px rgba(255,255,255,0.8)';
const colorAt = i => BASE_COL[i % BASE_COL.length];

export default function RhythmGame() {
  const [phase, setPhase] = useState("menu");
  const [difficulty, setDifficulty] = useState("Easy");
  const [score, setScore] = useState(0);
  const [notes, setNotes] = useState([]);
  const [hp, setHp] = useState(PRESETS[difficulty].maxHp);
  const [flashRed, setFlashRed] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [comboStart, setComboStart] = useState(null);
  const [bestComboTime, setBestComboTime] = useState(0);

  const nextId = useRef(0);
  const spawnTimer = useRef(null);
  const audioSampler = useRef(null);
  const damageFx = useRef(null);

  // Audio setup
  useEffect(() => {
    Tone.setContext(new Tone.Context({ latencyHint: "interactive" }));
    audioSampler.current = new Tone.Sampler({ urls: NOTE_SOUNDS, baseUrl: SOUNDFONT + "acoustic_grand_piano-mp3/", release: 1, volume: 0 }).toDestination();
    damageFx.current = new Tone.MembraneSynth({ volume: -6 }).toDestination();
  }, []);

  // Start game
  const startGame = async () => {
    const p = PRESETS[difficulty];
    await Tone.start();
    setScore(0);
    setHp(p.maxHp);
    setNotes([]);
    setFlashRed(false);
    setCombo(0);
    setBestCombo(0);
    setComboStart(null);
    setBestComboTime(0);
    setPhase("play");
    nextId.current = 0;
    spawnTimer.current = setInterval(() => {
      const now = Date.now();
      const lane = Math.floor(Math.random() * p.lanes);
      setNotes(n => [...n, { id: nextId.current++, lane, t0: now }]);
    }, p.interval);
  };

  // End game
  const stopGame = () => {
    clearInterval(spawnTimer.current);
    setPhase("over");
  };

  // Flash HP bar & play damage SFX
  const flashDamage = () => {
    setFlashRed(true);
    damageFx.current.triggerAttackRelease("C2", "8n");
    setTimeout(() => setFlashRed(false), 200);
  };

  // Successful hit
  const onHit = (note, e) => {
    e.stopPropagation();
    const p = PRESETS[difficulty];
    audioSampler.current.triggerAttackRelease(NOTE_KEYS[note.lane], "8n");
    const pts = Math.ceil(p.multiplier * (combo + 1));
    setScore(s => s + pts);
    setHp(h => Math.min(p.maxHp, h + HEAL_PER_HIT));
    setNotes(n => n.filter(x => x.id !== note.id));

    // Combo tracking
    if (combo === 0) {
      setComboStart(Date.now());
    }
    const newCombo = combo + 1;
    setCombo(newCombo);
    setBestCombo(b => Math.max(b, newCombo));
    if (newCombo === bestCombo + 1 && comboStart) {
      const duration = Date.now() - comboStart;
      setBestComboTime(bt => Math.max(bt, duration));
    }
  };

  // Missed note
  const onMissNote = (note) => {
    const p = PRESETS[difficulty];
    setNotes(n => n.filter(x => x.id !== note.id));
    flashDamage();
    setHp(h => {
      const nh = h - DAMAGE;
      if (nh <= 0) stopGame();
      return nh;
    });
    setCombo(0);
    setComboStart(null);
  };

  // Wrong click
  const onWrongClick = () => {
    const p = PRESETS[difficulty];
    flashDamage();
    setHp(h => {
      const nh = h - DAMAGE;
      if (nh <= 0) stopGame();
      return nh;
    });
    setCombo(0);
    setComboStart(null);
  };

  // Cleanup
  useEffect(() => { if (phase !== "play") clearInterval(spawnTimer.current); }, [phase]);

  // Menu
  if (phase === "menu") {
    return (
      <Screen>
        <h2>Piano Tiles Rhythm</h2>
        <label>Difficulty:&nbsp;
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            {Object.keys(PRESETS).map(d => <option key={d}>{d}</option>)}
          </select>
        </label>
        <button style={btn} onClick={startGame}>START</button>
        <button onClick={() => window.location.href='https://pianovisual.com'} style={backBtn}>↩ PianoVisual</button>
      </Screen>
    );
  }

  // Game Over
  if (phase === "over") {
    return (
      <Screen>
        <h2>Game Over</h2>
        <p>Your score: {score}</p>
        <p>Best combo: {bestCombo}</p>
        <p>Combo duration: {(bestComboTime/1000).toFixed(2)}s</p>
        <button style={btn} onClick={() => setPhase("menu")}>Menu</button>
      </Screen>
    );
  }

  // Gameplay
  const p = PRESETS[difficulty];
  return (
    <div style={gameWrapper} onMouseDown={onWrongClick}>
      <CentralHPBar hp={hp} maxHp={p.maxHp} flash={flashRed} />
      <div style={{...laneContainer, gridTemplateColumns: `repeat(${p.lanes}, 1fr)`}}>
        {notes.map(note => (
          <div
            key={note.id}
            onMouseDown={e => onHit(note, e)}
            onAnimationEnd={() => onMissNote(note)}
            style={noteStyle(note, p.lanes)}
          />
        ))}
      </div>
      <div style={hud}>
        <div>Score: {score}</div>
        <div>Combo: {combo}</div>
      </div>
      <style>{`@keyframes fall { from{transform:translateY(-100%);}to{transform:translateY(100vh);} }`}</style>
    </div>
  );
}

function CentralHPBar({ hp, maxHp, flash }) {
  const pct = Math.max(0, hp/maxHp);
  return (
    <div style={centralHpContainer}>
      <div
        style={{
          ...centralHpBar,
          transform: `scaleX(${pct})`,
          background: flash ? `rgba(255,0,0,${FLASH_ALPHA})` : '#fff',
          boxShadow: flash ? FLASH_GLOW : NORMAL_GLOW
        }}
      />
    </div>
  );
}

/* --- Styles --- */
const Screen = ({ children }) => (
  <div style={{position:'fixed',inset:0,background:'#111',color:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>{children}</div>
);
const btn = {margin:'1rem',padding:'0.8rem 1.6rem',fontSize:'1.25rem',border:'none',borderRadius:8,cursor:'pointer',background:'#55efc4',color:'#111',fontWeight:600};
const backBtn = {position:'fixed',top:'2vh',left:'2vw',padding:'0.4rem 0.8rem',fontSize:'1rem',borderRadius:6,background:'#fff',color:'#111',border:'none',cursor:'pointer',boxShadow:'0 2px 4px rgba(0,0,0,0.45)'};
const gameWrapper = {position:'fixed',inset:0,background:'#111',display:'grid',gridTemplateRows:'auto 1fr auto',overflow:'hidden'};
const laneContainer = {display:'grid',position:'relative',height:'100%',width:'100%'};
const hud = {position:'fixed',top:'1rem',right:'1rem',color:'#fff',fontSize:'1.1rem',textAlign:'right'};
const centralHpContainer = {position:'fixed',top:'1rem',left:'50%',transform:'translateX(-50%)',width:'80%',height:12,background:'rgba(255,255,255,0.2)',borderRadius:6,overflow:'hidden'};
const centralHpBar = {position:'absolute',top:0,height:'100%',width:'100%',transformOrigin:'center',transition:'transform 0.3s ease,background 0.2s ease,box-shadow 0.2s ease'};
const noteStyle = (note, lanes) => ({position:'absolute',left:`${(note.lane/lanes)*100}%`,width:`${100/lanes}%`,height:'10%',background:colorAt(note.lane),borderRadius:4,pointerEvents:'auto',animation:`fall ${PRESETS[difficulty].interval*5}ms linear forwards`,boxShadow:`0 0 12px 4px ${colorAt(note.lane)}`});
