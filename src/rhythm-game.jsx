// RhythmBeat.jsx — prototype d’un jeu de rythme (style Piano Memory)
// ---------------------------------------------------------------
// Principe : des notes (cercles) descendent depuis le haut ;
// le joueur appuie sur les 4 touches (DFJK ou tap) quand elles atteignent la zone‑hit.
// Menu / HUD / style cohérent avec Piano Memory.

import React, { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

// ===== Pré‑sets de niveau =====
const LEVELS = {
  Beginner: { bpm: 90, density: 0.7 },   // notes par seconde
  Medium:   { bpm: 110, density: 1.1 },
  Expert:   { bpm: 140, density: 1.6 }
};

const LANES = 4;                // D, F, J, K
const LANE_COLORS = ["#ff7675", "#ffeaa7", "#55efc4", "#74b9ff"];
const noteColor = idx => LANE_COLORS[idx % LANE_COLORS.length];

// ===== Audio (kit de percu court) =====
const kit = new Tone.MembraneSynth({ volume:-2 }).toDestination();

export default function RhythmBeat(){
  // phase : menu | play | end
  const [phase, setPhase] = useState("menu");
  const [level, setLevel] = useState("Beginner");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  // notes générées ; chaque note : { lane, time }
  const notesRef = useRef([]);
  const hitY = 480;           // position Y de la ligne de frappe
  const canvasRef = useRef(null);
  const raf = useRef(null);
  const startTime = useRef(0);

  // ============ Générateur de partition ============
  const generateNotes = (durationSec)=>{
    const { bpm, density } = LEVELS[level];
    const beatDur = 60/bpm;
    const notes = [];
    let t = 1; // commence après 1s
    while(t < durationSec){
      if(Math.random() < density*beatDur){
        notes.push({ lane: Math.floor(Math.random()*LANES), time: t });
      }
      t += beatDur/2; // grille double‑croche
    }
    return notes;
  };

  // ============ Contrôles ============
  const handleKey = (code)=>{
    const map = { KeyD:0, KeyF:1, KeyJ:2, KeyK:3 };
    if(!(code in map)) return;
    hit(map[code]);
  };
  const hit = (lane)=>{
    // trouver note la plus proche dans la fenêtre (±0.15s)
    const t = Tone.now() - startTime.current;
    const idx = notesRef.current.findIndex(n=> !n.hit && Math.abs(n.time - t) < 0.15 && n.lane===lane);
    if(idx !== -1){
      notesRef.current[idx].hit = true;
      setScore(s=>s+100+combo*10);
      setCombo(c=>c+1);
      kit.triggerAttackRelease("C2","8n");
    }else{
      setCombo(0);
    }
  };

  // ============ Boucle de rendu ============
  const render = ()=>{
    const ctx = canvasRef.current.getContext("2d");
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    ctx.clearRect(0,0,w,h);

    // dessin pistes
    const laneW = w/LANES;
    for(let i=0;i<LANES;i++){
      ctx.fillStyle = "#222";
      ctx.fillRect(i*laneW,0,laneW,h);
      ctx.fillStyle = LANE_COLORS[i]+"22";
      ctx.fillRect(i*laneW,h-100,laneW,100);
    }

    const t = Tone.now() - startTime.current;
    const speed = 200; // px par sec

    notesRef.current.forEach(n=>{
      if(n.hit || n.time < t-1) return; // skip
      const y = (n.time - t)*speed + hitY;
      ctx.fillStyle = noteColor(n.lane);
      ctx.beginPath();
      ctx.arc((n.lane+0.5)*laneW, y, 18, 0, Math.PI*2);
      ctx.fill();
    });

    raf.current = requestAnimationFrame(render);
  };

  // ============ Start game ============
  const startGame = async()=>{
    await Tone.start();
    setScore(0); setCombo(0);
    notesRef.current = generateNotes(35); // 35s de piste
    startTime.current = Tone.now();
    setPhase("play");
    raf.current = requestAnimationFrame(render);
  };

  // Clean raf
  useEffect(()=>()=>cancelAnimationFrame(raf.current),[]);
  useEffect(()=>{
    const keyDown=(e)=>handleKey(e.code);
    window.addEventListener("keydown",keyDown);
    return ()=>window.removeEventListener("keydown",keyDown);
  });

  // ============ UI ============
  if(phase==="menu") return (
    <div style={{position:"fixed",inset:0,background:"#111",color:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <h1 style={{fontSize:"3rem",marginBottom:"1rem"}}>Rhythm Beat</h1>
      <label>Level&nbsp;
        <select value={level} onChange={e=>setLevel(e.target.value)}>
          {Object.keys(LEVELS).map(l=><option key={l}>{l}</option>)}
        </select>
      </label>
      <button style={{marginTop:"1rem",padding:"0.6rem 1.5rem",fontSize:"1.2rem"}} onClick={startGame}>PLAY</button>
    </div>
  );

  if(phase==="play") return (
    <div style={{position:"fixed",inset:0,background:"#111"}}>
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />
      <div style={{position:"fixed",top:10,left:10,color:"#fff"}}>Score: {score}  Combo: {combo}</div>
      <button onClick={()=>{cancelAnimationFrame(raf.current);setPhase("menu");}} style={{position:"fixed",top:10,right:10}}>Menu</button>
    </div>
  );

  return null;
}
