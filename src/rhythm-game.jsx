// RhythmGame.jsx — Jeu de rythme PianoTiles style
import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

// Global styles Ko-fi button
if (typeof document !== 'undefined' && !document.getElementById('kofi-style')) {
  const s = document.createElement('style');
  s.id = 'kofi-style';
  s.innerHTML = `.kofi-mobile-button{position:fixed;bottom:0.5rem;right:1rem;width:100px;height:100px;background:url('https://cdn.ko-fi.com/cdn/kofi5.png?v=3') center/contain no-repeat;opacity:0.7;transition:opacity .2s;z-index:1000;} .kofi-mobile-button:hover{opacity:1;}`;
  document.head.appendChild(s);
}

// Constantes de jeu
const SOUNDFONT = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/";
const INSTRS = ["acoustic_grand_piano", "electric_piano_1", "vibraphone", "celesta"];
const PRESETS = {
  Easy:   { lanes:3, speed: 1.2, spawnInterval: 1200 },
  Normal: { lanes:4, speed: 1.0, spawnInterval: 1000 },
  Hard:   { lanes:5, speed: 0.8, spawnInterval: 800 }
};

export default function RhythmGame() {
  const [phase, setPhase] = useState('menu'); // menu | play | over
  const [diff, setDiff] = useState('Normal');
  const [lanes, setLanes] = useState(PRESETS['Normal'].lanes);
  const [blocks, setBlocks] = useState([]); // {id, lane, y}
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const blockId = useRef(0);
  const animRef = useRef(null);
  const toneSampler = useRef(null);

  // Charger sampler
  useEffect(() => {
    Tone.start();
    const instr = INSTRS[Math.floor(Math.random() * INSTRS.length)];
    toneSampler.current = new Tone.Sampler({ urls: { C4: "C4.mp3" }, baseUrl: `${SOUNDFONT}${instr}-mp3/` }).toDestination();
  }, []);

  // Ajuste lanes selon difficulté
  useEffect(() => {
    setLanes(PRESETS[diff].lanes);
  }, [diff]);

  // Spawn des blocs
  useEffect(() => {
    if (phase !== 'play') return;
    const { spawnInterval } = PRESETS[diff];
    const spawn = () => {
      const id = blockId.current++;
      const lane = Math.floor(Math.random() * lanes);
      setBlocks(b => [...b, { id, lane, y: 0 }]);
    };
    const interval = setInterval(spawn, spawnInterval);
    return () => clearInterval(interval);
  }, [phase, diff, lanes]);

  // Animation descente
  useEffect(() => {
    if (phase !== 'play') return;
    const speed = PRESETS[diff].speed;
    const update = () => {
      setBlocks(b => b.map(block => ({ ...block, y: block.y + speed })))
                 .filter(block => {
                   if (block.y < 100) return true;
                   // si bloc dépassé sans appui
                   setLives(l => l - 1);
                   return false;
                 });
      animRef.current = requestAnimationFrame(update);
    };
    animRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, diff]);

  // Gestion input clavier
  useEffect(() => {
    if (phase !== 'play') return;
    const onKey = e => {
      const key = e.key;
      const idx = '12345'.indexOf(key);
      if (idx >= 0 && idx < lanes) {
        toneSampler.current.triggerAttackRelease('C4', '8n');
        // check bloc proche de la zone d'impact (y > 80)
        setBlocks(b => {
          let hit = false;
          const rest = b.filter(block => {
            if (!hit && block.lane === idx && block.y > 80 && block.y < 95) {
              hit = true;
              setScore(s => s + 10);
              return false;
            }
            return true;
          });
          if (!hit) setLives(l => l - 1);
          return rest;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, lanes, diff]);

  // Vérifie fin de partie
  useEffect(() => {
    if (lives <= 0) setPhase('over');
  }, [lives]);

  const startGame = () => {
    setScore(0); setLives(3); setBlocks([]);
    setPhase('play');
  };

  const quitToMenu = () => {
    setPhase('menu'); setBlocks([]);
  };

  // Composants UI
  const Screen = ({ children }) => (
    <div style={{ position:'fixed', inset:0, background:'#111', color:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
      {children}
    </div>
  );
  const btn = { padding:'0.9rem 2.1rem', fontSize:'1.25rem', border:'none', borderRadius:10, background:'#55efc4', color:'#111', cursor:'pointer', margin:8 };

  if (phase === 'menu') return (
    <Screen>
      <button onClick={() => window.location.href='https://pianovisual.com'} style={btn}>↩ Back to PianoVisual</button>
      <h2 style={{ fontSize:'4rem' }}>Rhythm Tiles</h2>
      <label style={{ margin:'1rem' }}>
        Difficulty&nbsp;
        <select value={diff} onChange={e => setDiff(e.target.value)}>{Object.keys(PRESETS).map(d => <option key={d}>{d}</option>)}</select>
      </label>
      <button style={btn} onClick={startGame}>START</button>
      <a href="https://ko-fi.com/pianovisual" className="kofi-mobile-button" />
    </Screen>
  );

  if (phase === 'over') return (
    <Screen>
      <h2>Game Over</h2>
      <p>Score: {score}</p>
      <button style={btn} onClick={startGame}>Retry</button>
      <button style={btn} onClick={quitToMenu}>Menu</button>
    </Screen>
  );

  // Zone de jeu
  return (
    <div style={{ position:'fixed', inset:0, background:'#111' }}>
      <button onClick={quitToMenu} style={{ ...btn, position:'fixed', top:16, left:16 }}>↩ Menu</button>
      <div style={{ position:'relative', width:'80vw', height:'100vh', margin:'0 auto', overflow:'hidden', display:'flex' }}>
        {[...Array(lanes)].map((_, i) => (
          <div key={i} style={{ flex:1, borderLeft: i>0?'1px solid #333':0, position:'relative' }}>
            {blocks.filter(b => b.lane===i).map(b => (
              <div key={b.id} style={{ position:'absolute', top: `${b.y}%`, left:0, right:0, height: '5%', background: '#55efc4', borderRadius:4, margin:'0 4px' }} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ position:'fixed', bottom:16, left:'50%', transform:'translateX(-50%)', color:'#fff' }}>
        <span style={{ margin:'0 1rem' }}>Lives: {'♥︎'.repeat(lives)}</span>
        <span style={{ margin:'0 1rem' }}>Score: {score}</span>
      </div>
    </div>
  );
}
