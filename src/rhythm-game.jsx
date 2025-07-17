// RhythmGame.jsx — Piano Tiles Rhythm Game with Difficulty Modes, Combo System, HP Bar Flash + Sound

import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

if (typeof document !== 'undefined' && !document.querySelector('meta[name=viewport]')) {
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
  document.head.appendChild(meta);
}

// Ko-fi button style (menu only)
if (typeof document !== 'undefined' && !document.getElementById('kofi-style')) {
  const kofiStyle = document.createElement('style');
  kofiStyle.id = 'kofi-style';
  kofiStyle.innerHTML = `.kofi-mobile-button{position:fixed;bottom:0.5rem;right:1rem;width:100px;height:100px;background:url('https://cdn.ko-fi.com/cdn/kofi5.png?v=3') center center/contain no-repeat;opacity:0.7;transition:opacity .2s;z-index:1000;} .kofi-mobile-button:hover{opacity:1;}`;
  document.head.appendChild(kofiStyle);
}

/* ===== CONFIG ===== */
const SOUNDFONT = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/";
const NOTE_SOUNDS = { C4: "C4.mp3", D4: "D4.mp3", E4: "E4.mp3", F4: "F4.mp3" };
// Instruments à choisir aléatoirement à chaque partie
const INSTRS = [
  "acoustic_grand_piano", "bright_acoustic_piano", "electric_grand_piano",
  "electric_piano_1", "electric_piano_2", "honkytonk_piano",
  "harpsichord", "music_box", "celesta", "vibraphone",
  "marimba", "glockenspiel"
];
const BASE_COL = ["#ff7675","#ffeaa7","#55efc4","#74b9ff"];
const colorAt = i => BASE_COL[i % BASE_COL.length];
const FLASH_ALPHA = 0.9;
const DAMAGE = 20;
const HEAL_PER_HIT = 2;
const MAX_HP = 100;
const DIFFICULTIES = {
  Easy:    { lanes: 4, speed: 2400, interval: 650, hp: 100, multiplier: 1 },
  Normal:  { lanes: 6, speed: 2000, interval: 500, hp: 100, multiplier: 2 },
  Hard:    { lanes: 8, speed: 1500, interval: 400, hp: 100, multiplier: 4 },
  Harder:  { lanes: 10, speed: 1200, interval: 300, hp: 100, multiplier: 6 },
  Insane:  { lanes: 12, speed: 1200, interval: 300, hp: 100, multiplier: 8 }
};
const DIFF_NAMES = Object.keys(DIFFICULTIES);

export default function RhythmGame() {
  const [phase, setPhase] = useState("menu");
  const [diff, setDiff] = useState("Easy");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [notes, setNotes] = useState([]);
  const [hp, setHp] = useState(MAX_HP);
  const [flashRed, setFlashRed] = useState(false);
  const [comboEffects, setComboEffects] = useState([]);

  // Background notes in menu
  const [bgNotes, setBgNotes] = useState([]);
  const bgId = useRef(0);
  const bgTimer = useRef(null);

  const nextId = useRef(0);
  const spawnTimer = useRef(null);
  const audioSampler = useRef(null);
  const damageFx = useRef(null);
  const startTimeRef = useRef(null);

  const settings = DIFFICULTIES[diff];

  useEffect(() => {
    Tone.setContext(new Tone.Context({ latencyHint: "interactive" }));
    audioSampler.current = new Tone.Sampler({
      urls: NOTE_SOUNDS,
      baseUrl: SOUNDFONT + "acoustic_grand_piano-mp3/",
      release: 1,
      volume: 0
    }).toDestination();
    damageFx.current = new Tone.MembraneSynth({ volume: -6 }).toDestination();
  }, []);

  // Spawn background notes when in menu
  useEffect(() => {
    let visibilityHandler = null;
    const startBg = () => {
      const intervalTime = settings.interval * 2;
      bgTimer.current = setInterval(() => {
        const cols = window.innerWidth <= 600 ? 6 : 10;
        const lane = Math.floor(Math.random() * cols);
        setBgNotes(arr => [...arr, { id: bgId.current++, lane, cols }]);
      }, intervalTime);
    };
    const stopBg = () => {
      clearInterval(bgTimer.current);
      setBgNotes([]);
    };
    if (phase === 'menu') {
      startBg();
      visibilityHandler = () => {
        if (document.hidden) stopBg();
        else startBg();
      };
      document.addEventListener('visibilitychange', visibilityHandler);
    }
    return () => {
      stopBg();
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [phase, settings.interval]);

  const startGame = async () => {
    // Sélection aléatoire de l'instrument
    const slug = INSTRS[Math.floor(Math.random() * INSTRS.length)];
    // Recrée le sampler avec l'instrument choisi
    if (audioSampler.current) audioSampler.current.dispose();
    audioSampler.current = new Tone.Sampler({
      urls: NOTE_SOUNDS,
      baseUrl: SOUNDFONT + slug + "-mp3/",
      release: 1,
      volume: 0
    }).toDestination();
    await Tone.start();
    const { lanes, interval, hp } = settings;
    setScore(0);
    setHp(hp);
    setCombo(0);
    setMaxCombo(0);
    setNotes([]);
    setFlashRed(false);
    setComboEffects([]);
    setPhase("play");
    startTimeRef.current = Date.now();
    spawnTimer.current = setInterval(() => {
      const now = Date.now();
      const lane = Math.floor(Math.random() * lanes);
      setNotes(n => [...n, { id: nextId.current++, lane, t0: now }]);
    }, interval);
  };

  const stopGame = () => {
    clearInterval(spawnTimer.current);
    setPhase("over");
  };

  const flashDamage = () => {
    setFlashRed(true);
    damageFx.current.triggerAttackRelease("C2", "8n");
    setTimeout(() => setFlashRed(false), 200);
  };

  const downloadScore = () => {
    const w = 600, h = 600;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h);
    const noteWidth = 16, noteHeight = 40;
    const notePos = [
      { x: 30,  y: 50, lane: 0 },
      { x: 60, y: 30, lane: 1 },
      { x: 90, y: 70, lane: 2 }
    ];
    notePos.forEach(({ x, y, lane }) => {
      ctx.fillStyle = colorAt(lane);
      ctx.shadowColor = colorAt(lane);
      ctx.shadowBlur = 12;
      ctx.fillRect(x, y, noteWidth, noteHeight);
      ctx.shadowBlur = 0;
    });
    ctx.fillStyle = '#55efc4'; ctx.font = 'bold 70px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Piano Rhythm', w / 2, 210);
    ctx.fillStyle = '#ffffff'; ctx.font = '36px monospace';
    ctx.fillText('Score: ' + score, w / 2, 320);
    ctx.fillText('Longest combo: ' + maxCombo, w / 2, 380);
    ctx.fillText('Difficulty: ' + diff, w / 2, 440);
    ctx.fillStyle = '#ffeaa7'; ctx.font = '22px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('pianovisual.com  |  Piano Rhythm', w - 20, h - 20);
    const link = document.createElement('a'); link.download = 'piano_rhythm_score.png';
    link.href = canvas.toDataURL('image/png'); link.click();
  };

  const onHit = (note, e) => {
    e.stopPropagation();
    const NOTE_KEYS = Object.keys(NOTE_SOUNDS);
    const key = NOTE_KEYS[note.lane % NOTE_KEYS.length];
    audioSampler.current.triggerAttackRelease(key, "8n");
    setCombo(c => {
      const newCombo = c + 1;
      setMaxCombo(m => Math.max(m, newCombo));
      const points = settings.multiplier * newCombo;
      setScore(s => s + points);
      const effectId = Date.now() + Math.random();
      setComboEffects(arr => [...arr, { id: effectId, text: `+${points}`, x: e.clientX, y: e.clientY }]);
      setTimeout(() => setComboEffects(arr => arr.filter(fe => fe.id !== effectId)), 1000);
      return newCombo;
    });
    setHp(h => Math.min(settings.hp, h + HEAL_PER_HIT));
    setNotes(n => n.filter(x => x.id !== note.id));
  };

  const onMissNote = note => {
    setNotes(n => n.filter(x => x.id !== note.id));
    flashDamage();
    setHp(h => {
      const nh = h - DAMAGE;
      if (nh <= 0) stopGame();
      return nh;
    });
    setCombo(0);
  };

  const onWrongClick = () => {
    flashDamage();
    setHp(h => {
      const nh = h - DAMAGE;
      if (nh <= 0) stopGame();
      return nh;
    });
    setCombo(0);
  };

  useEffect(() => { if (phase !== "play") clearInterval(spawnTimer.current); }, [phase]);

  if (phase === "menu") return (
    <Screen>
      <style>{`  
        @keyframes fall { from { top: -10%; } to { top: 100%; } }  
      `}</style>
      {/* Background falling notes */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50px', right: '50px', overflow: 'visible', zIndex: 0 }}>
        {bgNotes.map(note => (
          <div key={note.id} style={{
            position: 'absolute',
            top: '-10%',
            left: `${(note.lane / note.cols) * 100}%`,
            width: `${100 / note.cols}%`,
            height: '8%',
            background: colorAt(note.lane),
            borderRadius: 4,
            boxShadow: `0 0 12px 4px ${colorAt(note.lane)}`,
            animation: `fall ${settings.speed}ms linear forwards`
          }} onAnimationEnd={() => setBgNotes(arr => arr.filter(n => n.id !== note.id))} />
        ))}
      </div>
      <h2 style={{ fontSize: '3.5rem', marginTop: '-18vh', position: 'relative', zIndex: 1 }}>Piano Rhythm</h2>
      <label style={{ position: 'relative', zIndex: 1 }}>Difficulty:
        <select value={diff} onChange={e => setDiff(e.target.value)}>
          {DIFF_NAMES.map(d => <option key={d}>{d}</option>)}
        </select>
      </label>
      <button style={{ ...btn, position: 'relative', zIndex: 1 }} onClick={startGame}>START</button>
      <button onClick={() => window.location.href='https://pianovisual.com'} style={{ ...backBtn, zIndex: 1 }}>↩ PianoVisual</button>
      <a href="https://ko-fi.com/pianovisual" target="_blank" rel="noopener" className="kofi-mobile-button"></a>
    </Screen>
  );

  if (phase === "over") return (
    <Screen>
      <h2>Game Over</h2>
      <p>Your score: {score}</p>
      <p>Max combo: {maxCombo}</p>
      <button style={btn} onClick={downloadScore}>Download Score</button>
      <button style={btn} onClick={() => setPhase("menu")}>Menu</button>
    </Screen>
  );

  return (
    <div style={gameWrapper} onMouseDown={onWrongClick}>
      <button onClick={() => setPhase("menu")} style={backBtn}>↩ Menu</button>
      <CentralHPBar hp={hp} maxHp={settings.hp} flash={flashRed} />
      {comboEffects.map(fe => (
        <div key={fe.id} style={{ position: 'absolute', left: fe.x, top: fe.y, pointerEvents: 'none', fontSize: '2rem', fontWeight: 'bold', color: '#ffeaa7', animation: 'fadeUp 1s ease-out forwards' }}>
          {fe.text}
        </div>
      ))}
      <div style={laneContainer}>
        {notes.map(note => (
          <div key={note.id} onMouseDown={e => onHit(note, e)} onAnimationEnd={() => onMissNote(note)} style={noteStyle(note, settings.lanes, settings.speed)} />
        ))}
      </div>
      <div style={hud}>Score: {score} — Combo: {combo}</div>
      <style>{`  
        @keyframes fall { from { top: -10%; } to { top: 100%; } }  
        @keyframes fadeUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-50px); } }  
      `}</style>
    </div>
  );
}

function CentralHPBar({ hp, maxHp, flash }) {
  const pct = Math.max(0, hp / maxHp);
  return (
    <div style={centralHpContainer}>
      <div style={{ ...centralHpBar, transform: `scaleX(${pct})`, background: flash ? `rgba(255,80,80,${FLASH_ALPHA})` : '#fff', boxShadow: flash ? `0 0 30px 10px rgba(255,60,60,${FLASH_ALPHA})` : '0 0 12px 4px rgba(255,255,255,0.9)' }} />
    </div>
  );
}

const Screen = ({ children }) => <div style={{ position: 'fixed', inset: 0, background: '#111', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', overflow: 'hidden' }}>{children}</div>;
const btn = { margin: '0.5rem', padding: '0.9rem 2.1rem', fontSize: '1.25rem', border: 'none', borderRadius: 10, cursor: 'pointer', background: '#55efc4', color: '#111', fontWeight: 600 };
const backBtn = { position: 'fixed', top: '2vh', left: '2vw', zIndex: 3, padding: '0.4rem 0.8rem', fontSize: '1rem', borderRadius: 8, background: '#fff', color: '#111', border: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.45)', transition: 'transform .18s' };
const gameWrapper = { position: 'fixed', inset: 0, background: '#111', overflow: 'hidden' };
const laneContainer = { position: 'absolute', top: 0, bottom: 0, left: '50px', right: '50px' };
const hud = { position: 'fixed', bottom: '1rem', right: '1rem', color: '#fff', fontSize: '1.2rem' };
const centralHpContainer = { position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', width: '80%', height: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 6, overflow: 'hidden', zIndex: 5 };
const centralHpBar = { position: 'absolute', top: 0, height: '100%', width: '100%', transformOrigin: 'center', transition: 'transform 0.3s ease, background 0.2s ease, box-shadow 0.2s ease' };
const noteStyle = (note, totalLanes, fallDuration) => ({ position: 'absolute', left: `${(note.lane / totalLanes) * 100}%`, width: `${100 / totalLanes}%`, height: '10%', background: colorAt(note.lane), borderRadius: 4, boxShadow: `0 0 12px 4px ${colorAt(note.lane)}`, pointerEvents: 'auto', animation: `fall ${fallDuration}ms linear forwards` });
