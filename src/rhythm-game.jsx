// RhythmTap.jsx — Jeu de rythme « Piano Memory » V2
// -------------------------------------------------
import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

// Constantes
const BG_COLUMNS = 12, BG_ROWS = 8;
const BASE_COL = ['#ff7675','#ffeaa7','#55efc4','#74b9ff'];
const colorAt = i => BASE_COL[i % BASE_COL.length];
const rand = max => Math.floor(Math.random()*max);

const SETTINGS = {
  Easy:   { bpm: 80, lanes:4 },
  Medium: { bpm:100, lanes:4 },
  Hard:   { bpm:120, lanes:4 }
};
const HIT_Y = 500;

// UI Styles
const navBtn = {position:'fixed',top:20,left:20,padding:'0.4rem 0.8rem',background:'#fff',color:'#111',border:'none',borderRadius:6,cursor:'pointer',zIndex:3};
const titleStyle = isPhone=>({animation:'fadeIn .6s',fontSize:isPhone?'2.6rem':'4rem',margin:isPhone?'-10vh':'-20vh'});
const labelStyle = {margin:'1rem',color:'#fff'};
const btnStyle = {padding:'0.8rem 1.8rem',fontSize:'1.2rem',background:'#55efc4',color:'#111',border:'none',borderRadius:8,cursor:'pointer'};
const wrapper = {position:'fixed',inset:0,background:'#111'};
const hudStyle = {position:'fixed',right:20,top:80,color:'#fff',fontSize:'1rem',zIndex:3};

export default function RhythmTap(){
  const isPhone = window.innerWidth<=600;
  // Phases
  const [phase,setPhase] = useState('menu');
  const [level,setLevel] = useState('Easy');
  const [score,setScore] = useState(0);
  const [combo,setCombo] = useState(0);
  const [hp,setHp] = useState(1);

  // Menu background falling notes
  const bgNotes = useRef([]);
  const canvasBG = useRef(null);
  useEffect(()=>{
    const ctx = canvasBG.current.getContext('2d');
    const w = window.innerWidth, h = window.innerHeight;
    canvasBG.current.width = w;
    canvasBG.current.height = h;
    // init notes
    bgNotes.current = Array(100).fill().map(()=>({
      lane: rand(SETTINGS[level].lanes), y: rand(h), speed:2+Math.random()*3
    }));
    const drawBG = ()=>{
      ctx.clearRect(0,0,w,h);
      const lw = w/SETTINGS[level].lanes;
      // draw falling bars
      bgNotes.current.forEach(n=>{
        ctx.fillStyle = colorAt(n.lane);
        ctx.fillRect(n.lane*lw+lw*0.1, n.y, lw*0.8, 40);
        n.y += n.speed;
        if(n.y>h) n.y = -40;
      });
      requestAnimationFrame(drawBG);
    };
    drawBG();
  },[phase,level]);

  // Game notes
  const notesRef = useRef([]);
  const startTime = useRef(0);
  const raf = useRef(null);
  const canvasGame = useRef(null);
  const synth = new Tone.MembraneSynth().toDestination();

  const genNotes = ()=>{
    const { bpm, lanes } = SETTINGS[level];
    const interval = 60/bpm;
    const arr=[];
    for(let t=1;t<30;t+=interval) arr.push({lane:rand(lanes),time:t,hit:false});
    return arr;
  };

  const drawGame = ()=>{
    const ctx = canvasGame.current.getContext('2d');
    const w=canvasGame.current.width, h=canvasGame.current.height;
    ctx.clearRect(0,0,w,h);
    const { lanes } = SETTINGS[level];
    const lw = w/lanes;
    // hit zone
    ctx.fillStyle='rgba(255,255,255,0.2)';
    ctx.fillRect(0,HIT_Y-10,w,20);
    // draw notes as bars
    const now = Tone.now()-startTime.current;
    notesRef.current.forEach(n=>{
      if(n.hit) return;
      const y=(n.time-now)*200+HIT_Y;
      if(y<-50||y>h+50) return;
      ctx.shadowColor=colorAt(n.lane);
      ctx.shadowBlur=16;
      ctx.fillStyle=colorAt(n.lane);
      ctx.fillRect(n.lane*lw+lw*0.2, y-30, lw*0.6, 60);
      ctx.shadowBlur=0;
    });
    raf.current=requestAnimationFrame(drawGame);
  };

  const startGame = async()=>{
    await Tone.start();
    setScore(0); setCombo(0); setHp(1);
    notesRef.current=genNotes();
    startTime.current=Tone.now();
    setPhase('play');
    canvasGame.current.width=window.innerWidth;
    canvasGame.current.height=window.innerHeight;
    raf.current=requestAnimationFrame(drawGame);
  };
  useEffect(()=>()=>cancelAnimationFrame(raf.current),[]);

  // input handlers
  const hitKey=lane=>{
    const now=Tone.now()-startTime.current;
    const note=notesRef.current.find(n=>!n.hit&&n.lane===lane&&Math.abs(n.time-now)<0.25);
    if(note){ note.hit=true; setScore(s=>s+100+combo*10); setCombo(c=>c+1); setHp(h=>Math.min(1,h+0.05)); synth.triggerAttackRelease('C4','8n'); }
    else { setCombo(0); setHp(h=>Math.max(0,h-0.1)); }
  };
  useEffect(()=>{
    const onDown=e=>{
      const map={KeyQ:0,KeyS:1,KeyD:2,KeyF:3};
      if(map[e.code]!=null) hitKey(map[e.code]);
    };
    window.addEventListener('keydown',onDown);
    return ()=>window.removeEventListener('keydown',onDown);
  });

  // health bar
  const HealthBar=()=>{
    return (
      <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',width:'80vw',maxWidth:600,height:12,background:'rgba(255,255,255,0.1)',borderRadius:6,overflow:'hidden',pointerEvents:'none'}}>
        <div style={{width:`${hp*100}%`,height:'100%',background:'#ff7675',transformOrigin:'center',transition:'width .3s'}} />
      </div>
    );
  };

  // UI
  if(phase==='menu') return (
    <div style={{position:'fixed',inset:0,background:'#111',color:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
      <canvas ref={canvasBG} style={{position:'absolute',inset:0,zIndex:-2}} />
      <button onClick={()=>window.location.href='https://pianovisual.com'} style={navBtn}>↩ Back to PianoVisual</button>
      <h2 style={titleStyle(isPhone)}>Rhythm Tap</h2>
      <label style={labelStyle}>Level&nbsp;<select value={level} onChange={e=>setLevel(e.target.value)}>{Object.keys(SETTINGS).map(l=><option key={l}>{l}</option>)}</select></label>
      <button style={btnStyle} onClick={startGame}>PLAY</button>
      <a href='https://ko-fi.com/pianovisual' target='_blank' rel='noopener' className='kofi-mobile-button'></a>
    </div>
  );

  if(phase==='play') return (
    <div style={wrapper}>
      <canvas ref={canvasGame} style={{position:'absolute',inset:0}} />
      {/* Touch / click overlay */}
      <div style={{position:'absolute',inset:0,display:'grid',gridTemplateColumns:`repeat(${SETTINGS[level].lanes},1fr)`,zIndex:2}}>
        {[...Array(SETTINGS[level].lanes)].map((_,i)=>(
          <div key={i}
            onPointerDown={()=>hitKey(i)}
            style={{width:'100%',height:'100%'}}
          />
        ))}
      </div>
      <HealthBar />
      <div style={hudStyle}>Score: {score}  Combo: {combo}</div>
      <button onClick={()=>{cancelAnimationFrame(raf.current); setPhase('menu');}} style={navBtn}>↩ Menu</button>
    </div>
  );

  return null;
}
