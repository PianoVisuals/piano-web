// RhythmTap.jsx — Nouveau jeu de rythme (menu visuel Piano Memory)
// -------------------------------------------------------------
// Menu : même style, titre, bouton retour PianoVisual, Ko‑fi, fond animé.
// Gameplay : des cercles colorés descendent en colonne, tap sur cadence (D, F, J, K).

import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

// Background animated grid settings
const BG_COLS = 12, BG_ROWS = 8;
const BASE_COL = ['#ff7675','#ffeaa7','#55efc4','#74b9ff'];
const colorAt = i => BASE_COL[i % BASE_COL.length];
const rand = max => Math.floor(Math.random()*max);

// Levels
const SETTINGS = {
  Easy:   { bpm: 80, lanes:4 },
  Medium: { bpm: 100, lanes:4 },
  Hard:   { bpm: 120, lanes:4 }
};

// Hit zone Y
const HIT_Y = 500;
// Sound
const synth = new Tone.MembraneSynth().toDestination();

export default function RhythmTap(){
  const isPhone = typeof window!=='undefined' && window.innerWidth<=600;
  const [phase, setPhase] = useState('menu');
  const [level, setLevel] = useState('Easy');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  // menu background anim
  const totalBG = BG_COLS*BG_ROWS;
  const [bgActive, setBgActive] = useState(-1);
  const [bgColor, setBgColor] = useState('#fff');
  useEffect(()=>{
    if(phase!=='menu') return;
    let tid;
    const cycle=()=>{
      const idx = rand(totalBG);
      setBgActive(idx);
      setBgColor(colorAt(rand(BASE_COL.length)));
      setTimeout(()=>setBgActive(-1),800);
      tid = setTimeout(cycle,600+Math.random()*1100);
    };
    cycle();
    return ()=>clearTimeout(tid);
  },[phase]);

  // Game state
  const notesRef = useRef([]);
  const startTime = useRef(0);
  const raf = useRef(null);
  const canvasRef = useRef(null);

  // Generate falling notes
  const genNotes = ()=>{
    const { bpm, lanes } = SETTINGS[level];
    const interval = 60/bpm; // sec
    const duration = 30; // total seconds
    const arr = [];
    for(let t=1; t<duration; t+=interval){
      arr.push({
        lane: rand(lanes),
        time: t,
        hit: false
      });
    }
    return arr;
  };

  // Draw loop
  const draw = ()=>{
    const ctx = canvasRef.current.getContext('2d');
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    ctx.clearRect(0,0,w,h);
    // lanes background
    const { lanes } = SETTINGS[level];
    const laneW = w/lanes;
    for(let i=0;i<lanes;i++){
      ctx.fillStyle = '#222';
      ctx.fillRect(i*laneW,0,laneW,h);
    }
    // draw notes
    const now = Tone.now() - startTime.current;
    arrLoop: for(const n of notesRef.current){
      if(n.hit) continue;
      const y = (n.time-now)*200 + HIT_Y;
      if(y< -20 || y>h+20) continue;
      ctx.fillStyle = colorAt(n.lane);
      ctx.beginPath(); ctx.arc((n.lane+0.5)*laneW, y, 16,0,2*Math.PI); ctx.fill();
    }
    raf.current = requestAnimationFrame(draw);
  };

  // Start game
  const startGame = async ()=>{
    await Tone.start();
    setScore(0); setCombo(0);
    notesRef.current = genNotes();
    startTime.current = Tone.now();
    setPhase('play');
    raf.current = requestAnimationFrame(draw);
  };
  useEffect(()=>()=>cancelAnimationFrame(raf.current),[]);

  // handle input
  const handleHit = lane=>{
    const now = Tone.now() - startTime.current;
    for(const n of notesRef.current){
      if(n.hit) continue;
      if(n.lane===lane && Math.abs(n.time-now)<0.2){
        n.hit = true; setScore(s=>s+100+combo*10); setCombo(c=>c+1);
        synth.triggerAttackRelease('C2','8n');
        return;
      }
    }
    setCombo(0);
  };
  useEffect(()=>{
    const down = e=>{
      const map={KeyD:0,KeyF:1,KeyJ:2,KeyK:3};
      if(map[e.code]!=null) handleHit(map[e.code]);
    };
    window.addEventListener('keydown',down);
    return ()=>window.removeEventListener('keydown',down);
  });

  // UI
  if(phase==='menu') return (
    <Screen>
      {/* background grid */}
      <div style={{position:'fixed',inset:0,display:'grid',gridTemplateColumns:`repeat(${BG_COLS},1fr)`,gridTemplateRows:`repeat(${BG_ROWS},1fr)`,gap:'0.5vw',padding:'2vw',pointerEvents:'none',zIndex:-1}}>
        {[...Array(totalBG)].map((_,i)=><div key={i} style={{background:bgActive===i?bgColor:'transparent',boxShadow:bgActive===i?`0 0 12px 6px ${bgColor}`:'none',borderRadius:8}} />)}
      </div>
      {/* navigation */}
      <button onClick={()=>window.location.href='https://pianovisual.com'} style={navBtn}>↩ Back to PianoVisual</button>
      <h2 style={titleStyle}>Rhythm Tap</h2>
      <label style={labelStyle}>Level <select value={level} onChange={e=>setLevel(e.target.value)}>{Object.keys(SETTINGS).map(l=><option key={l}>{l}</option>)}</select></label>
      <button style={btn} onClick={startGame}>PLAY</button>
      <a href='https://ko-fi.com/pianovisual' target='_blank' rel='noopener' className='kofi-mobile-button'></a>
    </Screen>
  );

  if(phase==='play') return (
    <div style={wrapper}>
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} />
      <div style={hudStyle}>Score: {score}  Combo: {combo}</div>
      <button onClick={()=>{cancelAnimationFrame(raf.current); setPhase('menu');}} style={navBtn}>↩ Menu</button>
    </div>
  );

  return null;
}

// --- Styles ---
const Screen = ({children})=> (
  <div style={{position:'fixed',inset:0,background:'#111',color:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>{children}</div>
);
const navBtn = {position:'fixed',top:20,left:20,padding:'0.4rem .8rem',background:'#fff',color:'#111',border:'none',borderRadius:6,cursor:'pointer',zIndex:3};
const titleStyle = {animation:'fadeIn .6s',fontSize:'3.5rem',margin:'-10vh 0 1rem'};
const labelStyle = {margin:'1rem',color:'#fff'};
const btn = {padding:'0.8rem 1.8rem',fontSize:'1.2rem',background:'#55efc4',color:'#111',border:'none',borderRadius:8,cursor:'pointer'};
const wrapper = {position:'fixed',inset:0,background:'#111'};
const hudStyle = {position:'fixed',top:10,left:10,color:'#fff',fontSize:'1rem'};