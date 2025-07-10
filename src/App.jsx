// @ts-nocheck
import React, { useEffect, useRef, useState, useMemo } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";


// nom des fichiers .mid que tu as mis dans public/demos/
const DEMOS = [
  "Winter - Vivaldi.mid",
  "Lacrimosa - Mozart.mid",
  "Clair de Lune - Debussy.mid",
  "Moonlight Sonata - Beethoven.mid",
  "Prelude n15 op28 \"Raindrop\" - Chopin.mid",
  "Serenade - Schubert.mid",
  "Gravity Falls Opening Theme Song.mid",
  "Vogel im Käfig - Attack on Titan.mid",
  "Rush E.mid",
  "Lilium - Elfen Lied.mid",
  "Alone - SOMA.mid",
  "Harmonious - Ender Lilies.mid",
  "Secunda - The Elder Scrolls V.mid",
  "Lumière - Clair Obscur Expedition 33.mid"

];


// === AdSense -------------------------------------------------------------
const ADSENSE_ID = "ca-pub-1502213318168443"; // ← remplace par ton ID si différent

// ========================================================================

/*
  Piano Web – + Import MIDI, barre de progression et barres qui tombent
  --------------------------------------------------------------------
  …
*/

// ===== Thèmes ===========================================================
const THEMES = {
  "Classic":   {bg:"#111", barW:"rgba(0,150,255,0.6)", barB:"rgba(0,200,150,0.6)", actW:"#f9c74f", actB:"#f8961e"},
  "Night":     {bg:"#000", barW:"rgba(120,120,255,0.7)", barB:"rgba(180,0,255,0.7)", actW:"#b799f9", actB:"#ca84e0"},
  "Candy":     {bg:"#222", barW:"rgba(255,105,180,0.7)", barB:"rgba(255,182,193,0.7)", actW:"#f9acf5", actB:"#f988e6"},
  "Retro":     {bg:"#282828", barW:"rgba(255,165,0,0.7)", barB:"rgba(0,255,170,0.7)", actW:"#ffd166", actB:"#06d6a0"},
  "Neon":      {bg:"#050912", barW:"rgba(57,255,20,0.8)", barB:"rgba(0,255,255,0.8)", actW:"#39ff14", actB:"#00e5ff"},
};

// ===== Constantes clavier ================================================= =================================================
const NOTE_MIN = 21;
const NOTE_MAX = 108;
const WHITE = [0, 2, 4, 5, 7, 9, 11];
const KEYS     = Array.from({length:NOTE_MAX-NOTE_MIN+1},(_,i)=>NOTE_MIN+i);
// Pré‑calcul index des touches blanches pour un alignement parfait
const WHITE_INDEX = {};
let wIdx = 0;
for (let m = NOTE_MIN; m <= NOTE_MAX; m++) {
  if (WHITE.includes(m % 12)) {
    WHITE_INDEX[m] = wIdx;
    wIdx++;
  } else {
    WHITE_INDEX[m] = wIdx - 1; // noire posée après la blanche précédente
  }
}
const PC_MAP = {
  KeyA: "C4", KeyW: "C#4", KeyS: "D4", KeyE: "D#4", KeyD: "E4", KeyF: "F4", KeyT: "F#4", KeyG: "G4", KeyY: "G#4", KeyH: "A4", KeyU: "A#4", KeyJ: "B4", KeyK: "C5", KeyO: "C#5", KeyL: "D5", KeyP: "D#5", Semicolon: "E5"
};
const n2m = n => Tone.Frequency(n).toMidi();
const m2n = m => Tone.Frequency(m, "midi").toNote();

// ===== Responsiveness (CSS vars) =========================================
const setCSSVars = () => {
  const vw = window.innerWidth;
  const safeLeft = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-left,0px)")) || 0;
  const safeRight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-right,0px)")) || 0;
  const usable = vw - safeLeft - safeRight;
  const whiteW = Math.floor(usable / 52);
  const whiteH = whiteW * 4;
  const vars = {
    "--white-w": `${whiteW}px`,
    "--white-h": `${whiteH}px`,
    "--black-w": `${Math.round(whiteW * 0.6)}px`,
    "--black-h": `${Math.round(whiteH * 0.6)}px`,
    "--black-shift": `-${Math.round(whiteW * 0.3)}px`
  };
  for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);
};
window.addEventListener("resize", setCSSVars);
setCSSVars();

// ===== Instruments SoundFont =============================================
const BASE = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/";
const INSTR = {
  "Grand Piano": "acoustic_grand_piano",
  "Harpsichord": "harpsichord",
  "Harp": "orchestral_harp",
  "Banjo": "banjo",
  "Violin": "violin",
  "Cello": "cello",
  "Flute": "flute",
  "Trumpet": "trumpet",
  "Guitar": "acoustic_guitar_steel",
  "Organ": "church_organ",
};
const URLS = { C3: "C3.mp3", G3: "G3.mp3", C4: "C4.mp3", G4: "G4.mp3", C5: "C5.mp3", G5: "G5.mp3" };
const LONG_REL = 30; // sustain release seconds
const makeSampler = name => new Tone.Sampler({ urls: URLS, release: 1, baseUrl: `${BASE}${INSTR[name]}-mp3/` });


/**
 * Charge un fichier MIDI de la bibliothèque et le joue
 * @param {string} name  Nom du fichier dans public/demos/
 */
async function loadDemo(name) {
  try {
    const res = await fetch(`/demos/${encodeURIComponent(name)}`);
    const arr = await res.arrayBuffer();
    const midi = new Midi(arr);
    setMidiData(midi);              // met à jour l’état midiData
    setDuration(midi.duration + LEAD);
    preparePart(midi);              // ta fonction existante
    closeLibrary();                 // ferme la fenêtre
  }
  catch(err) {
    console.error("Erreur loadDemo:", err);
    alert("Impossible de charger le MIDI : " + name);
  }
}



export default function App(){
  // refs & state ----------------------------------------------------
  const pianoRef=useRef(null); const canvasRef=useRef(null);
  const synthRef=useRef(null); const partRef=useRef(null);
  const pointerMap=useRef(new Map()); const kbdSet=useRef(new Set());

  const [instrument,setInstrument]=useState("Grand Piano");
  const [theme,setTheme]=useState("Classic");
  const [volume,setVolume]=useState(100);
  const [sustain,setSustain]=useState(false);
  const [midiData,setMidiData]=useState(null); // Midi object
  const [duration,setDuration]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [progress,setProgress]=useState(0);
  // état connexion MIDI
  const [midiConnected,setMidiConnected]=useState(false); // 0‑1

  const fileInputRef = useRef(null);
  // pour afficher/masquer la pop-up de choix
  const [showLibrary, setShowLibrary] = useState(false);


  const loadDemo = async (name) => {
    try {
      const res = await fetch(`/demos/${encodeURIComponent(name)}`);
      const arr = await res.arrayBuffer();
      const midi = new Midi(arr);
      setMidiData(midi);
      setDuration(midi.duration + LEAD);
      preparePart(midi);
      closeLibrary();
    } catch (err) {
      console.error("Erreur loadDemo:", err);
      alert("Impossible de charger le MIDI : " + name);
    }
  };


  // ouvrir la pop-up
  const openLibrary = () => setShowLibrary(true);
  // fermer la pop-up
  const closeLibrary = () => setShowLibrary(false);

  // quand l’onglet devient invisible, on coupe tout
  useEffect(() => {
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') {
        // uniquement relâcher toutes les notes
        clearAllActive();
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, []);

  useEffect(() => {
    const clearOnVisChange = () => {
      clearAllActive();
    };
    document.addEventListener("visibilitychange", clearOnVisChange);
    return () =>
      document.removeEventListener("visibilitychange", clearOnVisChange);
  }, []);



  useEffect(() => {
    const onBlur = () => {
      // pareil : release toutes les notes en cours
      kbdSet.current.forEach(midi => {
        synthRef.current.triggerRelease(m2n(midi));
        highlight(midi, false);
      });
      kbdSet.current.clear();
    };

    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("blur", onBlur);
    };
  }, []);


  // appliquer thème -------------------------------------------------
  useEffect(()=>{
    const c = THEMES[theme];
    Object.entries({bg:c.bg,"bar-w":c.barW,"bar-b":c.barB,"act-w":c.actW,"act-b":c.actB}).forEach(([k,v])=>document.documentElement.style.setProperty(`--${k}`,v));
  },[theme]);

  // inject AdSense auto‑ads once -----------------------------------
  useEffect(()=>{
    if(!window.adsbygoogle && !document.querySelector(`script[data-ad-client='${ADSENSE_ID}']`)){
      const s=document.createElement('script');
      s.src=`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`;
      s.async=true; s.crossOrigin="anonymous"; s.dataset.adClient=ADSENSE_ID; document.head.appendChild(s);
    }
  },[]);

  // create synth ---------------------------------------------------
  useEffect(()=>{Tone.start();synthRef.current?.dispose();synthRef.current=makeSampler(instrument).toDestination();synthRef.current.volume.value=Tone.gainToDb(volume/100);
    synthRef.current.release = sustain ? LONG_REL : 1;return()=>synthRef.current?.dispose();},[instrument]);
  useEffect(()=>{if(synthRef.current){synthRef.current.volume.value=Tone.gainToDb(volume/100);synthRef.current.release = sustain ? LONG_REL : 1;}},[volume,sustain]);

  // MIDI import ----------------------------------------------------
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const arr = await file.arrayBuffer();
    const midi = new Midi(arr);
    setMidiData(midi);
    setDuration(midi.duration + LEAD); // include lead silence
    preparePart(midi);
  };


  const clearAllActive = () => {
    // désactive visuellement + soniquement chaque note “allumée”
    document.querySelectorAll('.active').forEach(el => {
      const midi = +el.getAttribute('data-midi');
      // son
      synthRef.current.triggerRelease(m2n(midi));
      // visuel
      el.classList.remove('active');
    });
    // reset du set clavier (pc)
    kbdSet.current.clear();
  };


  const preparePart = (midi) => {
    partRef.current?.dispose();
    const events = [];
    midi.tracks.forEach(track => track.notes.forEach(n => events.push(n)));

    // décale de LEAD pour que le son démarre quand les barres touchent le clavier
    partRef.current = new Tone.Part((time, note) => {
      synthRef.current.triggerAttackRelease(note.name, note.duration, time, note.velocity);
      Tone.Draw.schedule(()=>highlight(n2m(note.name),true),time);
      Tone.Draw.schedule(()=>highlight(n2m(note.name),false),time+note.duration);
    }, events.map(n => ({ time: n.time + LEAD, name: n.name, duration: n.duration, velocity: n.velocity })));

    partRef.current.start(0);
    Tone.Transport.seconds = 0;
    setProgress(0);
    Tone.Transport.schedule(() => {
        clearAllActive();
        Tone.Transport.stop();
        setPlaying(false);
      }, midi.duration + LEAD + 0.05)
  };





  // play / pause --------------------------------------------------- ---------------------------------------------------
  const togglePlay=()=>{if(!midiData)return;if(!playing){Tone.Transport.start("+0.1");setPlaying(true);}else{Tone.Transport.pause();setPlaying(false);} };

  // progress tracking ---------------------------------------------
  useEffect(()=>{
    let id;
    const loop=()=>{if(playing&&duration){const t=Tone.Transport.seconds;setProgress(Math.min(t/duration,1));}drawBars();id=requestAnimationFrame(loop);};
    loop();return()=>cancelAnimationFrame(id);
  },[playing,duration,midiData]);

  // scrub ----------------------------------------------------------
  const onScrub=(val)=>{if(!midiData) return;const newT=val*duration;Tone.Transport.seconds=newT;setProgress(val);drawBars();};

  // ==== Falling bars =============================================
  const LEAD = 8; // seconds it takes for a bar to fall from top to keys

  const drawBars = () => {
    if (!canvasRef.current || !midiData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, W, H);

    // Position dynamique du haut du clavier (portrait vs paysage)
    const pianoRect = pianoRef.current?.getBoundingClientRect();
    const keysY = pianoRect ? pianoRect.top : (H - parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--white-h")));
    const path = keysY;              // distance totale que les barres doivent parcourir

    const t = Tone.Transport.seconds;

    ctx.save();
    ctx.beginPath();              // masque : on ne dessine pas sous le clavier
    ctx.rect(0, 0, W, keysY);
    ctx.clip();

    midiData.tracks.forEach(tr => {
      tr.notes.forEach(n => {
        const impact = n.time + LEAD;
        const remaining = impact - t;
        if (remaining < -n.duration || remaining > LEAD) return;

        const keyEl = document.querySelector(`[data-midi='${n.midi}']`);
        if (!keyEl) return;
        const rect = keyEl.getBoundingClientRect();
        const barWidth = rect.width;
        const x = rect.left;

        const yBottom = (1 - remaining / LEAD) * path;
        const barHeight = n.duration * (path / LEAD);
        const yTop = yBottom - barHeight;

        ctx.fillStyle = WHITE.includes(n.midi % 12) ? getComputedStyle(document.documentElement).getPropertyValue("--bar-w") : getComputedStyle(document.documentElement).getPropertyValue("--bar-b");
        ctx.fillRect(x, yTop, barWidth, barHeight);
      });
    });
    ctx.restore();
  };

  // --- PC keyboard -------------------------------------------------
  useEffect(() => {
    const down = (e) => {
      if(e.code === 'Space') { // Espace = Play/Pause si un fichier est chargé
        if(midiData){ e.preventDefault(); togglePlay(); }
        return;
      }
      if (e.repeat) return;
      const note = PC_MAP[e.code];
      if (!note) return;
      const midi = n2m(note);
      if (kbdSet.current.has(midi)) return;
      kbdSet.current.add(midi);
      synthRef.current.triggerAttack(note);
      highlight(midi, true);
    };
    const up = (e) => {
      const note = PC_MAP[e.code];
      if (!note) return;
      const midi = n2m(note);
      kbdSet.current.delete(midi);
      synthRef.current.triggerRelease(note);
      highlight(midi, false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // --- Web MIDI ----------------------------------------------------
  useEffect(()=>{
    if(!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess().then(acc=>{
      // connexion initiale
      setMidiConnected(acc.inputs.size > 0);
      // écoute des changements (connect / disconnect)
      acc.onstatechange = ()=> setMidiConnected(acc.inputs.size > 0);
      // mapping des messages
      acc.inputs.forEach(inp=>{
        inp.onmidimessage = ({data})=>{
          const [st,note,vel]=data;
          const cmd=st&0xf0;
          if(cmd===0x90&&vel){
            synthRef.current.triggerAttack(m2n(note),undefined,vel/127);
            highlight(note,true);
          } else if(cmd===0x80||(cmd===0x90&&!vel)){
            synthRef.current.triggerRelease(m2n(note));
            highlight(note,false);
          }
        };
      });
    });
  },[]);

  // pointer events (unchanged) ------------------------------------
  const midiAt=(x,y)=>{const a=document.elementFromPoint(x,y)?.getAttribute("data-midi");return a?+a:null;};
  const highlight=(m,on)=>document.querySelector(`[data-midi='${m}']`)?.classList.toggle("active",on);
  const pDown=e=>{const m=midiAt(e.clientX,e.clientY);if(m==null)return;pointerMap.current.set(e.pointerId,m);synthRef.current.triggerAttack(m2n(m));highlight(m,true);pianoRef.current.setPointerCapture(e.pointerId);} ;
  const pMove=e=>{if(!pointerMap.current.has(e.pointerId))return;const cur=pointerMap.current.get(e.pointerId);const n=midiAt(e.clientX,e.clientY);if(n===cur)return;pointerMap.current.delete(e.pointerId);synthRef.current.triggerRelease(m2n(cur));highlight(cur,false);if(n!=null){pointerMap.current.set(e.pointerId,n);synthRef.current.triggerAttack(m2n(n));highlight(n,true);} };
  const pUp=e=>{const m=pointerMap.current.get(e.pointerId);pointerMap.current.delete(e.pointerId);if(m!=null){synthRef.current.triggerRelease(m2n(m));highlight(m,false);} };

  // Détection QWERTY vs AZERTY --------------------------------------------
const isAzerty = navigator.language.startsWith("fr");

// Tableaux code physique → caractère
const QWERTY_LABELS = {}; for (const code of Object.keys(PC_MAP)) {
  QWERTY_LABELS[code] = code === "Semicolon" ? ";" : code.slice(3).toLowerCase();
}
const AZERTY_LABELS = { ...QWERTY_LABELS, KeyA: "q", KeyQ: "a", KeyZ: "w", KeyW: "z", KeyM: ";", Semicolon: "m" };

// map midi → lettre affichée selon la disposition détectée
const labelByMidi = useMemo(() => {
  const map = {};
  const labels = isAzerty ? AZERTY_LABELS : QWERTY_LABELS;
  for (const [code, note] of Object.entries(PC_MAP)) {
    const midi = n2m(note);
    map[midi] = labels[code] || '';
  }
  return map;
}, [isAzerty]);
  useEffect(()=>{const mq=matchMedia('(hover: hover) and (pointer: fine)');const f=()=>document.documentElement.classList.toggle('pc',mq.matches);f();mq.addEventListener('change',f);},[]);

  // keys render ----------------------------------------------------
  const keys=KEYS.map(m=><div key={m} data-midi={m} className={WHITE.includes(m%12)?"white key":"black key"}>{labelByMidi[m]&&<span className="label">{labelByMidi[m]}</span>}</div>);

  return(<>
 <style>{`
  html,body{margin:0;background:var(--bg,#111);color:#fff;overflow:hidden;touch-action:none;font-family:system-ui;-webkit-user-select:none;user-select:none;}
  .top{display:flex;justify-content:center;align-items:center;gap:0.5rem;padding:0.25rem;flex-wrap:wrap;position:fixed;left:0;right:0;top:0;background:#111;z-index:3;box-shadow:0 2px 4px rgba(0,0,0,0.6);}
  select,input[type=range]{background:#222;color:#fff;border:1px solid #444;}
  input[type=range].prog{width:180px;}
  .piano{display:flex;justify-content:center;position:fixed;left:0;right:0;height:var(--white-h);bottom:0;overflow:hidden;}
  @media(orientation:portrait) and (pointer:coarse){
    .piano{top:66vh;bottom:auto;}
    .top{top:calc(66vh + var(--white-h));bottom:auto;}
  }
  .white{width:var(--white-w);height:var(--white-h);background:#fff;border-left:1px solid #000;border-bottom:1px solid #000;display:flex;align-items:flex-end;justify-content:center;box-sizing:border-box;}
  .white:first-child{border-left:none;}
  .black{width:var(--black-w);height:var(--black-h);background:#000;margin-left:var(--black-shift);margin-right:var(--black-shift);border-radius:0 0 4px 4px;z-index:2;display:flex;align-items:flex-end;justify-content:center;}
  .active.white{background:var(--act-w,#f9c74f);}
  .active.black{background:var(--act-b,#f8961e);}
  .label{display:none;}html.pc .label{display:block;font-size:clamp(12px,calc(var(--white-w)*0.4),22px);pointer-events:none;color:#333;padding-bottom:2px;}html.pc .black .label{color:#ddd;}
  canvas{position:fixed;left:0;top:0;pointer-events:none;}


   /* widget About intégré dans .top */
  .details.about {
    /* rien à fixer en position : il héritera du flow dans .top */
  }
  .about {
    display: flex;
    align-items: center;
    margin-left: 0.5rem;        /* espace à gauche si besoin */
  }
  .about summary {
    list-style: none;
    cursor: pointer;
    font-size: 1.2rem;
  }
  .about summary::-webkit-details-marker {
    display: none;
  }
  .about-content {
    position: absolute;         /* superpose le contenu */
    top: 2.5rem;                /* juste en dessous de la barre */
    right: 1rem;                /* aligné à droite de la barre */
    background: #222;
    color: #ddd;
    padding: 0.75rem;
    border-radius: 6px;
    max-width: 250px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.8);
    display: none;
    z-index: 20;
  }
  .about[open] .about-content {
    display: block;
  }
  .about-content h4 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  .about-content p {
    margin: 0.25rem 0;
    font-size: 0.85rem;
  }
  .about-content a {
    color: #4da6ff;
    text-decoration: none;
    font-size: 0.85rem;
  }



  /* ——— Styles pour la fenêtre Import/Librairie ——— */
  .library-overlay {
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.5);
    display:flex;
    justify-content:center;
    align-items:center;
    z-index:10;
  }
  .library-menu {
    position: relative;   /* <-- impératif ! */
    background:#222;
    padding:1rem;
    border-radius:6px;
    display:flex;
    flex-direction:column;
    gap:0.5rem;
    width:90%;
    max-width:320px;
  }
  .library-menu h3 {
    margin:0 0 0.5rem;
    color:#fff;
    text-align:center;
  }
  .library-menu button,
  .library-menu select {
    width:100%;
    font-size:1rem;
    padding:0.5rem;
    background:#333;
    border:1px solid #555;
    color:#fff;
  }


`}</style>
  {showLibrary && (
    <div className="library-overlay" onClick={closeLibrary}>
      <div className="library-menu" onClick={e => e.stopPropagation()}>

        {/* 2) Titre */}
        <h3>Upload or Select</h3>

        {/* 3) Upload file */}
        <button onClick={() => fileInputRef.current.click()}>
          Upload MIDI File
        </button>

        {/* 4) Sélecteur de la bibliothèque */}
        <select
          defaultValue=""
          onChange={e => {
            loadDemo(e.target.value);
            closeLibrary();
          }}
        >
          <option value="" disabled>Select a Song...</option>
          {DEMOS.map(name => (
            <option key={name} value={name}>
              {name.replace(/\.mid$/, "")}
            </option>
          ))}
        </select>
      </div>
    </div>
  )}
  <div className="top">
    {/* indicateur MIDI */}
    <div className="midi-status" title={midiConnected ? "MIDI piano connected" : "No MIDI piano detected (not supported in Firefox)"}>
      <img src={midiConnected?"/midi_on.png":"/midi_off.png"} alt="MIDI status" draggable="false" width={24} height={24}/>
    </div>
    <label>Theme <select value={theme} onChange={e=>setTheme(e.target.value)}>{Object.keys(THEMES).map(t=><option key={t}>{t}</option>)}</select></label>
    <label>Instrument <select value={instrument} onChange={e=>setInstrument(e.target.value)}>{Object.keys(INSTR).map(i=><option key={i}>{i}</option>)}</select></label>
      <label style={{display:'flex',alignItems:'center',gap:'4px'}}><input type="checkbox" checked={sustain} onChange={e=>setSustain(e.target.checked)} />Sustain</label>
    <label>Vol <input type="range" min="0" max="200" value={volume} onChange={e=>setVolume(+e.target.value)} /></label>
    <button onClick={togglePlay} disabled={!midiData}>{playing?"Pause":"Play"}</button>
    {/* Bouton principal : Charger (importer ou choisir) */}
    <button onClick={openLibrary}>
      Load…
    </button>

    {/* input caché pour import manuel */}
    <input
      type="file"
      accept=".mid"
      hidden
      ref={fileInputRef}
      onChange={e => {
        handleFile(e.target.files[0]);
        closeLibrary();
      }}
    />

    <input className="prog" type="range" min="0" max="1" step="0.001" value={progress} onChange={e=>onScrub(e.target.valueAsNumber)} disabled={!midiData} />

    <details className="about">
      <summary>ℹ️</summary>
      <div className="about-content">
        <h4>About Piano Visuals</h4>
        <p>
          Piano Visuals is a browser-based piano built with React & Tone.js.<br/>
          Upload or select a MIDI, customize theme & instrument,<br/>
          and play directly from your browser.
        </p>
      
      </div>
    </details>
  </div>

  <canvas ref={canvasRef}></canvas>

  <div className="piano" ref={pianoRef} onPointerDown={pDown} onPointerMove={pMove} onPointerUp={pUp} onPointerCancel={pUp}>{keys}</div>
  
  </>);
}
