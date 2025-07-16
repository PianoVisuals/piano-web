// RhythmTap.jsx — Jeu de rythme « Piano Memory » V2
// -------------------------------------------------------
// Menu stylé PianoMemory + fond animé de notes tombantes
// Gameplay : barres verticales descendant, appui QSDF/toucher,
// zone de hit mise en valeur, éclair + son, barre de PV.

import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

// Constantes visuelles
const BG_COLS = 12, BG_ROWS = 8;
const BASE_COL = ['#ff7675','#ffeaa7','#55efc4','#74b9ff'];
const colorAt = i => BASE_COL[i % BASE_COL.length];
const rand = max => Math.floor(Math.random()*max);

// Niveaux de difficulté
const SETTINGS = {
  Easy:   { bpm: 80, lanes: 4 },
  Medium: { bpm:100, lanes: 4 },
  Hard:   { bpm:120, lanes: 4 }
};
// Position de la zone de hit
const HIT_Y = 500;

// Styles UI
const navBtn = { position:'fixed', top:20, left:20, padding:'0.4rem 0.8rem', background:'#fff', color:'#111', border:'none', borderRadius:6, cursor:'pointer', zIndex:3 };
const titleStyle = isPhone => ({ animation:'fadeIn .6s', fontSize:isPhone?'2.6rem':'4rem', margin:isPhone?'-10vh':'-20vh', zIndex:2 });
const labelStyle = { margin:'1rem', color:'#fff', zIndex:2 };
const btnStyle = { padding:'0.8rem 1.8rem', fontSize:'1.2rem', background:'#55efc4', color:'#111', border:'none', borderRadius:8, cursor:'pointer', zIndex:2 };
const wrapper = { position:'fixed', inset:0, background:'#111' };
const hudStyle = { position:'fixed', right:20, top:100, color:'#fff', fontSize:'1rem', zIndex:3 };

export default function RhythmTap(){
  const isPhone = window.innerWidth<=600;
  const [phase,setPhase] = useState('menu');
  const [level,setLevel] = useState('Easy');
  const [score,setScore] = useState(0);
  const [combo,setCombo] = useState(0);
  const [hp,setHp] = useState(1);

  // ------------ Fond animé (menu) ------------
  const canvasBG = useRef(null);
  useEffect(()=>{
    if(phase!=='menu') return;
    const ctx = canvasBG.current.getContext('2d');
    const w = window.innerWidth, h = window.innerHeight;
    canvasBG.current.width = w; canvasBG.current.height = h;
    // Génération initiale
    const bg = Array.from({length:BG_COLS*BG_ROWS}, ()=>({ x:rand(BG_COLS), y:rand(h), speed:2+Math.random()*3 }));
    let tid;
    const loop = ()=>{
      ctx.clearRect(0,0,w,h);
      const lw = w/BG_COLS;
      // dessiner barres
      bg.forEach(b=>{
        ctx.shadowColor = colorAt(b.x);
        ctx.shadowBlur = 12;
        ctx.fillStyle = colorAt(b.x);
        ctx.fillRect(b.x*lw + lw*0.25, b.y, lw*0.5, 40);
        ctx.shadowBlur = 0;
        b.y += b.speed;
        if(b.y > h) b.y = -40;
      });
      tid = requestAnimationFrame(loop);
    };
    loop();
    return ()=>cancelAnimationFrame(tid);
  },[phase]);

  // ------------ Gameplay ------------
  const canvasGame = useRef(null);
  const notesRef = useRef([]);
  const startTime = useRef(0);
  const raf = useRef(null);
  const synth = new Tone.MembraneSynth().toDestination();

  const genNotes = ()=>{
    const { bpm, lanes } = SETTINGS[level];
    const interval = 60/bpm;
    const notes=[];
    for(let t=1;t<30;t+=interval) notes.push({ lane:rand(lanes), time:t, hit:false });
    return notes;
  };

  const drawGame = ()=>{
    const ctx = canvasGame.current.getContext('2d');
    const w=canvasGame.current.width, h=canvasGame.current.height;
    ctx.clearRect(0,0,w,h);
    const { lanes } = SETTINGS[level];
    const lw = w/lanes;
    // zone de hit
    ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(0,HIT_Y-20,w,40);
    ctx.strokeStyle='#55efc4'; ctx.lineWidth=3; ctx.strokeRect(0,HIT_Y-20,w,40);
    // notes tombantes
    const now = Tone.now()-startTime.current;
    notesRef.current.forEach(n=>{
      if(n.hit) return;
      const y = (n.time-now)*200 + HIT_Y;
      if(y<-50||y>h+50) return;
      ctx.shadowColor = colorAt(n.lane);
      ctx.shadowBlur = 12;
      ctx.fillStyle = colorAt(n.lane);
      ctx.fillRect(n.lane*lw + lw*0.3, y-30, lw*0.4, 60);
      ctx.shadowBlur = 0;
    });
    raf.current = requestAnimationFrame(drawGame);
  };

  const startGame = async()=>{
    await Tone.start();
    setScore(0); setCombo(0); setHp(1);
    notesRef.current = genNotes();
    startTime.current = Tone.now();
    setPhase('play');
    canvasGame.current.width = window.innerWidth;
    canvasGame.current.height = window.innerHeight;
    raf.current = requestAnimationFrame(drawGame);
  };
  useEffect(()=>()=>cancelAnimationFrame(raf.current),[]);

  // ------------ Input (clavier & tactile) ------------
  const hit = lane=>{
    const now = Tone.now()-startTime.current;
    const note = notesRef.current.find(n=>!n.hit && n.lane===lane && Math.abs(n.time-now)<0.2);
    if(note){
      note.hit = true;
      setScore(s=>s+100+combo*10);
      setCombo(c=>c+1);
      setHp(h=>Math.min(1,h+0.05));
      synth.triggerAttackRelease('C4','8n');
    } else {
      setCombo(0);
      setHp(h=>Math.max(0,h-0.1));
    }
  };
  useEffect(()=>{
    const onKey = e=>{
      const map = { KeyQ:0, KeyS:1, KeyD:2, KeyF:3 };
      if(map[e.code]!=null) hit(map[e.code]);
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  });

  // ------------ Barre de PV (style Timer) ------------
  const HealthBar = ()=>{
    const lw = hp*50;
    return (
      <div style={{position:'fixed',top:'7vh',left:0,right:0,height:8,background:'rgba(255,255,255,0.08)',overflow:'hidden',pointerEvents:'none',zIndex:3}}>
        <div style={{position:'absolute',left:0,width:`${lw}%`,height:'100%',background:'#fff',transformOrigin:'left',transition:'width .3s'}} />
        <div style={{position:'absolute',right:0,width:`${lw}%`,height:'100%',background:'#fff',transformOrigin:'right',transition:'width .3s'}} />
      </div>
    );
  };

  // ------------ Interface ------------
  if(phase==='menu') return (
    <div style={{position:'fixed',inset:0,background:'#111',color:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
      <canvas ref={canvasBG} style={{position:'absolute',inset:0,zIndex:-1}} />
      <button onClick={()=>window.location.href='https://pianovisual.com'} style={navBtn}>↩ Back to PianoVisual</button>
      <h2 style={titleStyle(isPhone)}>Rhythm Tap</h2>
      <label style={labelStyle}>Level&nbsp;
        <select value={level} onChange={e=>setLevel(e.target.value)}>
          {Object.keys(SETTINGS).map(l=><option key={l}>{l}</option>)}
        </select>
      </label>
      <button style={btnStyle} onClick={startGame}>PLAY</button>
      <a href='https://ko-fi.com/pianovisual' target='_blank' rel='noopener' className='kofi-mobile-button'></a>
    </div>
  );

  if(phase==='play') return (
    <div style={wrapper}>
      <canvas ref={canvasGame} style={{position:'absolute',inset:0}} />
      {/* zones tactiles/clic */}
      <div style={{position:'absolute',inset:0,display:'grid',gridTemplateColumns:`repeat(${SETTINGS[level].lanes},1fr)`,zIndex:2}}>
        {[...Array(SETTINGS[level].lanes)].map((_,i)=>(
          <div key={i} onPointerDown={()=>hit(i)} style={{width:'100%',height:'100%'}} />
        ))}
      </div>
      <HealthBar />
      <div style={hudStyle}>Score: {score}  Combo: {combo}</div>
      <button onClick={()=>{cancelAnimationFrame(raf.current); setPhase('menu');}} style={navBtn}>↩ Menu</button>
    </div>
  );

  return null;
}
