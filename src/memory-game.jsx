// RhythmGame.jsx — Piano Memory v8 (timer‑click & quit fix)
// --------------------------------------------------
// ✔ Clics bloqués en modes chronométrés : TimerBar passe z‑index −1 (sous les pads).
// ✔ Gestion sûre des timeouts de séquence → collection + nettoyage.
// ✔ Bouton Menu stoppe TOUT : annule timeouts, relâche les notes et repasse au menu.
// (Changements minimes, logique intacte.)

import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

// Inject Ko‑fi button style globally once
if (typeof document !== 'undefined' && !document.getElementById('kofi-style')) {
  const kofiStyle = document.createElement('style');
  kofiStyle.id = 'kofi-style';
  kofiStyle.innerHTML = `.kofi-mobile-button{position:fixed;bottom:0.5rem;right:1rem;width:100px;height:100px;background:url('https://cdn.ko-fi.com/cdn/kofi5.png?v=3') center center/contain no-repeat;opacity:0.7;transition:opacity .2s;z-index:1000;} .kofi-mobile-button:hover{opacity:1;}`;
  document.head.appendChild(kofiStyle);
}


/* ===== CONSTANTES ===== */
const SOUNDFONT = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/";
const INSTRS = [
  "acoustic_grand_piano", "bright_acoustic_piano", "electric_grand_piano",
  "electric_piano_1", "electric_piano_2", "honkytonk_piano",
  "harpsichord", "music_box", "celesta", "vibraphone",
  "marimba", "glockenspiel"
];
const BASE_COL = ["#ff7675","#ffeaa7","#55efc4","#74b9ff"];
const colorAt = i => i < BASE_COL.length ? BASE_COL[i] : `hsl(${(i*23)%360} 80% 55%)`;
const rand = max => Math.floor(Math.random()*max);
// Couleur de lueur avec alpha, compatible HEX ou HSL
const shadowColor = i => i < BASE_COL.length ? colorAt(i)+"ee" : `hsla(${(i*23)%360} 80% 55% / 0.9)`;

/* ===== DIFFICULTÉS ===== */
const PRESETS = {
  Easy:   { lanes:3,  demoDelay:900,  hasTimer:false },
  Normal: { lanes:5,  demoDelay:650,  hasTimer:false },
  Hard:   { lanes:10, demoDelay:480,  hasTimer:true,  inputFactor:3.0 },
  Harder: { lanes:20, demoDelay:420,  hasTimer:true,  inputFactor:2.5 },
  Insane: { lanes:50, demoDelay:360,  hasTimer:true,  inputFactor:2.0 }
};

// Multiplicateur de score par difficulté (plus impressionnant)
const DIFF_MULT = {
  Easy:   1,
  Normal: 3,
  Hard:   7,
  Harder: 11,
  Insane: 15
};

/* ===== Audio global ===== */
Tone.setContext(new Tone.Context({ latencyHint:"interactive" }));
const samplerRef = { current: null };
const successFx = new Tone.Synth({ oscillator:{type:"triangle"}, envelope:{attack:0.01,decay:0.2,sustain:0.2,release:0.6}, volume:-6 }).toDestination();
const failFx    = new Tone.MembraneSynth({ volume:0 }).toDestination();

export default function PianoMemory(){
  const isPhone = typeof window !== 'undefined' && window.innerWidth <= 600; // ≤600px = mobile view
  const isMobile = false; // mobile restriction removed
  const lang = typeof navigator !== 'undefined' ? (navigator.language || navigator.userLanguage) : 'en';
  if(isMobile){
    const msg = lang && lang.startsWith('fr')
      ? "Oups ! Ce jeu est incompatible avec les appareils mobiles. Merci d'utiliser un ordinateur pour jouer 😊"
      : "Oops! This game isn’t compatible with mobile devices. Please switch to a desktop computer to play :)";
    return (
      <div style={{position:'fixed', inset:0, background:'#111', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'2rem'}}>
        <p style={{fontSize:'1.2rem', lineHeight:1.5}}>{msg}</p>
      </div>
    );
  }
  /* --- État principal --- */
  const [diff,setDiff]   = useState("Normal");
  const [phase,setPhase] = useState("menu");           // menu | show | input | pause | over
  const [seq,setSeq]     = useState([]);
  const [idx,setIdx]     = useState(0);
  const [lives,setLives] = useState(3);
  const [score,setScore] = useState(0);
  const [lit,setLit]     = useState(null);
  const [flash,setFlash] = useState(null);
  const [tProg,setTProg] = useState(1);
  // ---- Animated background squares (menu) ----
  const BG_COLS = 16, BG_ROWS = 9;
  const totalBg = BG_COLS*BG_ROWS;
  const [bgActive, setBgActive] = useState(-1);
  const [bgColor, setBgColor] = useState('#ffffff');                // barre timer 1 → 0

  const timerRef = useRef(null);
  const rafRef   = useRef(null);
  const startRef = useRef(0);
  const durRef   = useRef(0);
  const seqTimeouts = useRef([]);                      // timeouts de playNext

  const { lanes, demoDelay, hasTimer, inputFactor=2 } = PRESETS[diff];
  // total lanes considering mobile extra squares for Insane
  const totalLanes = isPhone && diff==="Insane" ? 56 : lanes;

  /* --- Utilitaires --- */
  const clearAll = ()=>{
    if(timerRef.current){ clearTimeout(timerRef.current); timerRef.current=null; }
    if(rafRef.current){ cancelAnimationFrame(rafRef.current); rafRef.current=null; }
    seqTimeouts.current.forEach(clearTimeout); seqTimeouts.current = [];
  };
  const highlight = (lane,dur=550)=>{ setLit(lane); setTimeout(()=>setLit(null),dur); };
  const resetGame = ()=>{ clearAll(); setSeq([]); setLives(3); setScore(0); setFlash(null); };
  const addNote   = ()=> setSeq(s=>[...s, rand(totalLanes)]);
  const noteMap   = ["C4","E4","G4","C5"];

  /* --- Sélection instrument & lancement --- */
  const createSampler = slug => new Tone.Sampler({ urls:{C4:"C4.mp3",E4:"E4.mp3",G4:"G4.mp3"}, baseUrl:`${SOUNDFONT}${slug}-mp3/`, release:1, volume:6 }).toDestination();

  const start = async ()=>{
    await Tone.start();
    const slug = INSTRS[rand(INSTRS.length)];
    if(samplerRef.current) samplerRef.current.dispose();
    samplerRef.current = createSampler(slug);
    resetGame();
    setPhase("pause");
  };  








  /* --- Lecture de la séquence --- */
  useEffect(()=>{
    if(phase!=="show" || !seq.length) return;
    clearAll();
    let i = 0;
    const playNext = ()=>{
      const lane = seq[i];
      highlight(lane, demoDelay-100);
      samplerRef.current?.triggerAttackRelease(noteMap[lane % noteMap.length], 1.5);
      i++;
      if(i < seq.length){ seqTimeouts.current.push(setTimeout(playNext, demoDelay)); }
      else seqTimeouts.current.push(setTimeout(()=>{ setIdx(0);
        setPhase("input");
        startInputTimer(); }, demoDelay+200));
    };
    playNext();
  },[phase,seq,demoDelay]);

  /* --- Timer d'entrée --- */
  const startInputTimer = ()=>{
    clearAll();
    if(!hasTimer){ setTProg(1); return; }
    const total = seq.length * demoDelay * inputFactor;
    durRef.current = total; startRef.current = performance.now(); setTProg(1);
    const tick = now =>{ const rem = Math.max(total - (now - startRef.current), 0); setTProg(rem/total); if(rem>0) rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = setTimeout(()=>fail("time"), total);
  };

  /* --- Interaction pads --- */
  const onPadTap = lane =>{
    if(phase!=="input") return;
    highlight(lane,300);
    samplerRef.current?.triggerAttackRelease(noteMap[lane % noteMap.length], 1.5);
    if(lane===seq[idx]){
      // Add score increment on each correct press
      setScore(s => s + DIFF_MULT[diff] * Math.pow(2, idx + 1));
      if(idx + 1 === seq.length){
        successFx.triggerAttackRelease("C5","8n");
        succeed();
      }else{
        setIdx(idx + 1);
      }
    }else fail();
  };
  const succeed = ()=>{ clearAll(); setFlash("good"); setPhase("pause"); };
  const fail    = ()=>{ clearAll(); failFx.triggerAttackRelease("C2","8n"); setLives(l=>l-1); setFlash("bad"); if(lives-1<=0) setPhase("over"); else setPhase("pause"); };

  /* --- Background squares effect (menu only) --- */
  useEffect(()=>{
    if(phase!=="menu") return;
    let timeoutId;
    const cycle=()=>{
      const idx = rand(totalBg);
      setBgActive(idx);
      setBgColor(colorAt(rand(20)));
      setTimeout(()=>setBgActive(-1),1500);
      timeoutId = setTimeout(cycle, 1750);
    };
    cycle();
    return ()=>clearTimeout(timeoutId);
  },[phase]);

  /* --- Pause → manche suivante --- */
  useEffect(()=>{ if(phase!=="pause") return; const t=setTimeout(()=>{ setFlash(null); addNote(); setPhase("show"); },700); return ()=>clearTimeout(t); },[phase]);

  /* --- Menu Immediate Quit --- */
  const quitToMenu = ()=>{
    clearAll();
    samplerRef.current?.releaseAll(0.05);
    failFx.triggerRelease();
    successFx.triggerRelease();
    resetGame();
    setPhase("menu");
  };

  const downloadScore = () => {
    // square canvas 600×600
    const w = 600, h = 600;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');

    // background
    // background with rounded corners
    const cornerR = 40;
    const roundRect = () => {
      ctx.beginPath();
      ctx.moveTo(cornerR,0);
      ctx.lineTo(w-cornerR,0);
      ctx.quadraticCurveTo(w,0,w,cornerR);
      ctx.lineTo(w,h-cornerR);
      ctx.quadraticCurveTo(w,h,w-cornerR,h);
      ctx.lineTo(cornerR,h);
      ctx.quadraticCurveTo(0,h,0,h-cornerR);
      ctx.lineTo(0,cornerR);
      ctx.quadraticCurveTo(0,0,cornerR,0);
      ctx.closePath();
    };
    roundRect();
    ctx.clip();
    ctx.fillStyle = '#111';
    ctx.fillRect(0,0,w,h);

    // helper to draw rounded square with glow
    const drawRounded = (x, y, size, r, color) => {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + size - r, y);
      ctx.quadraticCurveTo(x + size, y, x + size, y + r);
      ctx.lineTo(x + size, y + size - r);
      ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
      ctx.lineTo(x + r, y + size);
      ctx.quadraticCurveTo(x, y + size, x, y + size - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    // stylised logo : 5 pads inline (top‑left)
    const logoSize = 32;
    const gap = 12;
    const radius = 8;
    const palette = [colorAt(0), colorAt(1), colorAt(2), colorAt(3), colorAt(4)];
    const logoY = 40;
    const logoX = 40;
    for(let i=0;i<5;i++){
      drawRounded(logoX + i*(logoSize+gap), logoY, logoSize, radius, palette[i]);
    }

    // Title & data
    ctx.textAlign = 'center';

    ctx.fillStyle = '#55efc4';
    ctx.font = 'bold 70px sans-serif';
    ctx.fillText('Piano Memory', w / 2, 210);

    ctx.fillStyle = '#ffffff';
    ctx.font = '36px monospace';
    ctx.fillText('Score: ' + score, w / 2, 310);
    ctx.fillText('Longest combo: ' + (seq.length - 1), w / 2, 370);
    ctx.fillText('Difficulty: ' + diff, w / 2, 430);

    // footer / promo
    ctx.fillStyle = '#ffeaa7';
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('pianovisual.com  |  Piano Memory', w - 20, h - 20);

    // export
    const link = document.createElement('a');
    link.download = 'piano_memory_score.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

/* --- Composants --- */
  const Pad = ({i})=>{
    const active = lit===i;
    const global = flash; // "good" | "bad" | null
    const glowColor = shadowColor(i);
    const bg = global ? (global==="good"?"#2ecc71":"#e74c3c") : (active?colorAt(i):"#1c1c1c");
    const glow = global ? (global==='good'
        ? `0 0 ${lanes>8?18:24}px ${lanes>8?6:12}px #2ecc7188`
        : `0 0 ${lanes>8?18:24}px ${lanes>8?6:12}px #e74c3c99`) :
        (active ? (lanes>8?`0 0 12px 4px ${glowColor}`:`0 0 34px 14px ${glowColor}`) : "none");

    // Wrapper ensures glow layer is under every square
    return (
      <div style={{position:"relative", width:"100%", aspectRatio:"1", margin:isPhone?"0.5vw":(lanes>10?4:lanes>8?8:20)}}>
        {/* Glow layer behind all */}
        <div style={{position:"absolute", inset:0, borderRadius:12, boxShadow:glow, zIndex:2, pointerEvents:"none"}} />

        {/* Interactive square */}
        <div onPointerDown={()=>onPadTap(i)}
             style={{position:"relative", zIndex:1, width:"100%", height:"100%", borderRadius:12, cursor:phase==="input"?"pointer":"default",
                    WebkitTapHighlightColor:"transparent", touchAction:"manipulation", outline:"none", background:bg,
                    transition:"background .22s, transform .22s cubic-bezier(.22,1,.36,1)", transform:active?"scale(1.06)":"scale(1)"}} />
      </div>
    );
  };


  const TimerBar = ()=>{
    if(!hasTimer || phase!=="input") return null;
    return (
      <div style={{ position:"fixed", top:isPhone?"10vh":"3.5vh", left:"50%", transform:"translateX(-50%)", width:"88vw", maxWidth:580, height:10, borderRadius:5,
                    overflow:"hidden", background:"rgba(255,255,255,0.08)", boxShadow:"0 0 10px rgba(255,255,255,0.25)", pointerEvents:"none" }}>
        <div style={{ width:"100%", height:"100%", background:"#fff", transformOrigin:"center", transform:`scaleX(${tProg})`, transition:"transform .11s linear",
                      boxShadow:"0 0 8px 2px rgba(255,255,255,0.9)", pointerEvents:"none" }} />
      </div>
    );
  };

  /* --- Grille de pads --- */
  const renderPadGrid = ()=>{
    // Mobile: auto-fit grid, Insane gets 56 real pads for full 7×8 grid
    if(isPhone){
      const phoneLanes = diff === "Insane" ? 56 : lanes;
      const minSize = phoneLanes > 20 ? 40 : 60;
      return (
        <div style={{
          display:"grid",
          gridTemplateColumns:`repeat(auto-fit,minmax(${minSize}px,1fr))`,
          gap:4,
          width:"95vw",
          margin:"0 auto"
        }}>
          {[...Array(phoneLanes)].map((_, i) => <Pad key={i} i={i} />)}
        </div>
      );
    }

    // Desktop small grids (≤8 pads)
    if(lanes <= 8){
      return (
        <div style={{
          display:"flex",
          width:"95vw",
          maxWidth:560,
          margin:"0 auto"
        }}>
          {[...Array(lanes)].map((_, i) => <Pad key={i} i={i} />)}
        </div>
      );
    }

    // Desktop large grids
    const cols = (lanes === 10 || lanes === 20) ? 5 : 10;
    const gap = lanes === 20 ? 12 : 20;
    const width = lanes === 20 ? "min(85vw,540px)" : "90vw";

    return (
      <div style={{
        display:"grid",
        gridTemplateColumns:`repeat(${cols}, 1fr)`,
        gap,
        width,
        margin:"0 auto",
        maxWidth:620
      }}>
        {[...Array(lanes)].map((_, i) => <Pad key={i} i={i} />)}
      </div>
    );
  };


  /* --- Screens / UI --- */
  if(phase==="menu") return (
    <Screen>
      {/* Background animated squares */}
      <div style={{position:"fixed", inset:0, display:"grid", gridTemplateColumns:`repeat(${BG_COLS},1fr)`, gridTemplateRows:`repeat(${BG_ROWS},1fr)`, gap:"0.8vw", padding:"2vw", pointerEvents:"none", zIndex:-1}}>
        {[...Array(totalBg)].map((_,i)=><div key={i} style={{background:bgActive===i?bgColor:"transparent", boxShadow:bgActive===i?`0 0 24px 10px ${bgColor}`:"none", borderRadius:12, transition:"background .4s, box-shadow .4s"}} />)}
      </div>
      {/* Bouton Home vers pianovisual.com */}
      <button onClick={()=>window.location.href='https://pianovisual.com'}
        style={{ position:"fixed", top:"2vh", left:"2vw", zIndex:3, padding:"0.4rem 0.8rem", fontSize:"1rem", borderRadius:8,
          background:"#fff", color:"#111", border:"none", cursor:"pointer", boxShadow:"0 2px 4px rgba(0,0,0,0.45)", transition:"transform .18s" }}>
        ↩ Back to PianoVisual
      </button>

      <h2 style={{animation:"fadeIn .6s", fontSize:isPhone?"2.6rem":"4rem", marginTop:isPhone?"-10vh":"-20vh"}}>Piano Memory</h2>
      <label style={{margin:"1rem 0"}}>Difficulty&nbsp;
        <select value={diff} onChange={e=>setDiff(e.target.value)}>{Object.keys(PRESETS).map(d=><option key={d}>{d}</option>)}</select>
      </label>
      <button style={btn} onClick={start}>START</button>
    <a href="https://ko-fi.com/pianovisual" target="_blank" rel="noopener" title="Support me on Ko‑fi" className="kofi-mobile-button"></a>
    </Screen>
  );

  if(phase==="over") return (
    <Screen>
      <h2 style={{animation:"fadeIn .6s"}}>Game Over</h2>
      <p>Longest combo : {seq.length-1}</p>
      <p>Score : {score}</p>
      <button style={{...btn, marginBottom:12}} onClick={downloadScore}>Download your score</button>
      <button style={btn} onClick={()=>setPhase("menu")}>Menu</button>
    </Screen>
  );

  /* --- Gameplay UI --- */
  return (
    <div style={wrapper}>
      {/* Bouton menu in‑game */}
      <button onClick={quitToMenu} style={{ position:"fixed", top:"2vh", left:"2vw", zIndex:3, padding:"0.4rem 0.8rem", fontSize:"1rem", borderRadius:8,
        background:"#fff", color:"#111", border:"none", cursor:"pointer", boxShadow:"0 2px 4px rgba(0,0,0,0.45)", transition:"transform .18s" }}>↩ Menu</button>
      <TimerBar />
      {renderPadGrid()}
      <div style={{...hud, marginTop: isPhone ? (lanes>8?60:40) : 24}}>
        <p style={{margin:4}}>Lives : {"♥︎".repeat(lives)}</p>
        <p style={{margin:4}}>Score : {score}</p>
        <p style={{margin:4,opacity:.65,height:24}}>{phase==="input"?"Repeat!":phase==="show"?"Listen…":""}</p>
      </div>
    </div>
  );
}

/* --- Styles globaux --- */
const Screen = ({children})=> <div style={{ position:"fixed", inset:0, background:"#111", color:"#fff", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", animation:"fadeIn .6s" }}>{children}</div>;

const btn = { padding:"0.9rem 2.1rem", fontSize:"1.25rem", border:"none", borderRadius:10, cursor:"pointer", background:"#55efc4", color:"#111", fontWeight:600,
              transition:"transform .18s cubic-bezier(.22,1,.36,1)", boxShadow:"0 2px 6px rgba(0,0,0,0.45)", outline:"none" };

const wrapper = { position:"fixed", inset:0, background:"#111", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" };
const hud = { color:"#fff", textAlign:"center", minHeight:74 };

/* --- Keyframes --- */
const style = document.create
