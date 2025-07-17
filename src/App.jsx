// @ts-nocheck
import React, { useEffect, useRef, useState, useMemo } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";


// nom des fichiers .mid que tu as mis dans public/demos/
const DEMOS = [
  "Fur Elise - Beethoven.mid",
  "Nocturne op.9 No.2 - Chopin.mid",
  "Winter - Vivaldi.mid",
  "Lacrimosa - Mozart.mid",
  "Clair de Lune - Debussy.mid",
  "Arabesque - Debussy.mid",
  "Moonlight Sonata - Beethoven.mid",
  "Serenade - Schubert.mid",
  "Canon in D - Pachelbel.mid",
  "Gravity Falls Opening Theme Song.mid",
  "Guren no Yumiya - Attack on Titan.mid",
  "Vogel im Käfig - Attack on Titan.mid",
  "Interstellar Main Theme - Hans Zimmer.mid",
  "Bad Apple!!.mid",
  "Rush E.mid",
  "Lilium - Elfen Lied.mid",
  "Overture - Halo Reach.mid",
  "Main Theme - Halo CE.mid",
  "Peril - Halo 2.mid",
  "Remembrance - Halo 2.mid",
  "Megalovania - Undertale.mid",
  "Oakvale - Fable The Lost Chapters.mid",
  "Main Theme - Zelda.mid",
  "Fairy Fountain - Zelda.mid",
  "Alone - SOMA.mid",
  "Harmonious - Ender Lilies.mid",
  "Secunda - The Elder Scrolls V.mid"

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
  "Classic":      { bg: "#111",     barW: "rgba(0,150,255,0.6)",   barB: "rgba(0,200,150,0.6)",   actW: "#3faff9", actB: "#3b89bc" },
  "PianoVisual": { 
    bg: "#2e004f", 
    barW: "rgba(200,50,200,0.6)", 
    barB: "rgba(255,0,128,0.6)", 
    actW: "#d346ff", 
    actB: "#ff1fb5" 
  },
  "Night":        { bg: "#000",     barW: "rgba(120,120,255,0.7)", barB: "rgba(180,0,255,0.7)",   actW: "#b799f9", actB: "#ca84e0" },
  "Candy":        { bg: "#222",     barW: "rgba(255,105,180,0.7)", barB: "rgba(255,182,193,0.7)", actW: "#f9acf5", actB: "#f988e6" },
  "Retro":        { bg: "#282828",  barW: "rgba(255,165,0,0.7)",   barB: "rgba(0,255,170,0.7)",   actW: "#ffd166", actB: "#06d6a0" },
  "Neon":         { bg: "#050912",  barW: "rgba(57,255,20,0.8)",   barB: "rgba(0,255,255,0.8)",   actW: "#39ff14", actB: "#00e5ff" },
  "Hell":         { bg: "#4d2525",  barW: "rgba(40,15,15,0.8)",    barB: "rgba(0,0,0,0.8)",       actW: "#871414", actB: "#5e1d1d" },
  "Heaven":       { bg: "#aba693",  barW: "rgba(214,191,96,0.8)",  barB: "rgba(133,120,68,0.8)",  actW: "#b89918", actB: "#87731f" },

  "Ocean":        { bg: "#002b36",  barW: "rgba(38,139,210,0.7)",  barB: "rgba(7,54,66,0.7)",     actW: "#268bd2", actB: "#073642" },
  "Forest":       { bg: "#1b2f24",  barW: "rgba(133,193,85,0.7)",  barB: "rgba(42,92,47,0.7)",    actW: "#85c155", actB: "#2a5c2f" },
  "Sunset":       { bg: "#3e1f47",  barW: "rgba(255,94,77,0.7)",   barB: "rgba(255,188,117,0.7)", actW: "#ff5e4d", actB: "#ffbc75" },
  "PastelDream":  { bg: "#f2e9e4",  barW: "rgba(255,179,186,0.6)", barB: "rgba(255,223,186,0.6)", actW: "#ffb3ba", actB: "#ffdfba" },
  "Monochrome":   { bg: "#1c1c1c",  barW: "rgba(200,200,200,0.6)", barB: "rgba(100,100,100,0.6)", actW: "#c8c8c8", actB: "#646464" },
  "Desert":       { bg: "#3f2b1f",  barW: "rgba(232,170,95,0.7)",  barB: "rgba(194,123,40,0.7)",  actW: "#e8aa5f", actB: "#c27b28" },
  "Cyberpunk":    { bg: "#0f0f1a",  barW: "rgba(255,0,220,0.8)",   barB: "rgba(0,255,240,0.8)",   actW: "#ff00dc", actB: "#00fff0" },
  "Aurora":       { bg: "#08133b",  barW: "rgba(106,255,237,0.7)", barB: "rgba(68,130,255,0.7)",  actW: "#6affed", actB: "#4482ff" }






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
  "Grand Piano":            "acoustic_grand_piano",
  "Bright Piano":           "bright_acoustic_piano",
  "Electric Piano 1":       "electric_piano_1",
  "Electric Piano 2":       "electric_piano_2",
  "Honky Tonk":             "honkytonk_piano",
  "EPiano Rhodes":          "electric_piano_1",
  "Harpsichord":            "harpsichord",
  "Clavinet":               "clavinet",

  "Celesta":                "celesta",
  "Glockenspiel":           "glockenspiel",
  "Music Box":              "music_box",
  "Vibraphone":             "vibraphone",
  "Marimba":                "marimba",
  "Xylophone":              "xylophone",

  "Tubular Bells":          "tubular_bells",
  "Dulcimer":               "dulcimer",

  "Drawbar Organ":          "drawbar_organ",
  "Percussive Organ":       "percussive_organ",
  "Rock Organ":             "rock_organ",
  "Church Organ":           "church_organ",

  "Accordion":              "accordion",
  "Harmonica":              "harmonica",

  "Acoustic Guitar (nylon)":    "acoustic_guitar_nylon",
  "Acoustic Guitar (steel)":    "acoustic_guitar_steel",
  "Electric Guitar (jazz)":     "electric_guitar_jazz",
  "Electric Guitar (clean)":    "electric_guitar_clean",
  "Electric Guitar (muted)":    "electric_guitar_muted",
  "Overdriven Guitar":          "overdriven_guitar",
  "Distortion Guitar":          "distortion_guitar",
  "Guitar Harmonics":           "guitar_harmonics",

  "Acoustic Bass":              "acoustic_bass",
  "Electric Bass (finger)":     "electric_bass_finger",
  "Electric Bass (pick)":       "electric_bass_pick",
  "Fretless Bass":              "fretless_bass",
  "Slap Bass 1":                "slap_bass_1",
  "Slap Bass 2":                "slap_bass_2",
  "Synth Bass 1":               "synth_bass_1",
  "Synth Bass 2":               "synth_bass_2",

  "Violin":                     "violin",
  "Viola":                      "viola",
  "Cello":                      "cello",
  "Contrabass":                 "contrabass",
  "Tremolo Strings":            "tremolo_strings",
  "Pizzicato Strings":          "pizzicato_strings",

  "Orchestral Harp":            "orchestral_harp",
  "Timpani":                    "timpani",

  "String Ensemble 1":          "string_ensemble_1",
  "String Ensemble 2":          "string_ensemble_2",

  "Synth Strings 1":            "synth_strings_1",
  "Synth Strings 2":            "synth_strings_2",

  "Choir Aahs":                 "choir_aahs",
  "Voice Oohs":                 "voice_oohs",
  "Synth Choir":                "synth_choir",

  "Trumpet":                    "trumpet",
  "Trombone":                   "trombone",
  "Tuba":                       "tuba",
  "Muted Trumpet":              "muted_trumpet",
  "French Horn":                "french_horn",

  "Soprano Sax":                "soprano_sax",
  "Alto Sax":                   "alto_sax",
  "Tenor Sax":                  "tenor_sax",
  "Baritone Sax":               "baritone_sax",

  "Oboe":                       "oboe",
  "English Horn":               "english_horn",
  "Bassoon":                    "bassoon",
  "Clarinet":                   "clarinet",

  "Piccolo":                    "piccolo",
  "Flute":                      "flute",
  "Recorder":                   "recorder",
  "Pan Flute":                  "pan_flute",
  "Blown Bottle":               "blown_bottle",

  "Shakuhachi":                 "shakuhachi",
  "Whistle":                    "whistle",
  "Ocarina":                     "ocarina",

  "Lead 1 (square)":           "lead_1_square",
  "Lead 2 (sawtooth)":         "lead_2_sawtooth",
  "Pad 1 (new age)":           "pad_1_new_age",
  "Pad 2 (warm)":              "pad_2_warm",
  "FX 1 (rain)":               "fx_1_rain",
  "FX 2 (soundtrack)":         "fx_2_soundtrack"
};

const URLS = { C3: "C3.mp3", G3: "G3.mp3", C4: "C4.mp3", G4: "G4.mp3", C5: "C5.mp3", G5: "G5.mp3" };
const LONG_REL = 50; // sustain release seconds
const makeSampler = name => new Tone.Sampler({ urls: URLS, release: 1, baseUrl: `${BASE}${INSTR[name]}-mp3/` });


const texts = {
  en: {
    summary: "ⓘ",
    title: "Help & Info",
    paragraphs: [
      `Use the side menu (toggle with the arrow) to switch between the interactive piano and various mini‑games. You can explore different challenges or return to the main keyboard at any time.`,

      `In the top bar, a small piano icon lights up when you connect a USB‑MIDI keyboard (not supported in Firefox). The “Theme” menu changes the look (dark, neon, retro, etc.), and “Instrument” lets you pick from dozens of sounds. Tick “Sustain” to hold notes, adjust volume with the slider, then click “Play” to start or pause. Click the info icon (ⓘ) to open this panel.`,

      `Click “Load…” to import a .mid file from your computer or choose one of the built‑in demos. A progress bar appears—drag it to seek forward or back. As the song plays, each key lights up and a colored bar drops in time with the notes, giving you a fun visual guide.`,

      `For more songs, visit BitMidi.com or FreeMIDI.org to download free .mid files, then import them here to play and visualize instantly. Whether you’re practicing, learning new tunes, or just having fun, this site puts an interactive piano and mini‑games right in your browser. If you enjoy it, you’re welcome to buy me a coffee via the button in the top bar.`
    ]
  },

  fr: {
    summary: "ⓘ",
    title: "Aide & Infos",
    paragraphs: [
      `Utilisez le menu latéral (à ouvrir avec la flèche) pour passer du piano interactif à différents mini‑jeux. Explorez de nouveaux défis ou revenez au clavier principal à tout moment.`,

      `Dans la barre du haut, une petite icône de piano s’allume dès que vous connectez un clavier USB‑MIDI (non pris en charge par Firefox). Le menu « Thème » modifie l’apparence (sombre, néon, rétro, etc.), et « Instrument » propose des dizaines de sons. Cochez « Sustain » pour prolonger les notes, réglez le volume avec le curseur, puis cliquez sur « Play » pour lancer ou mettre en pause. Cliquez sur l’icône d’info (ⓘ) pour ouvrir ce panneau.`,

      `Cliquez sur « Load… » pour importer un fichier .mid depuis votre ordinateur ou choisir un de nos démos intégrés. Une barre de progression apparaît : glissez‑la pour avancer ou reculer dans le morceau. Pendant la lecture, chaque touche s’illumine et une barre colorée défile en rythme, offrant un guide visuel ludique.`,

      `Pour trouver d’autres morceaux, allez sur BitMidi.com ou FreeMIDI.org pour télécharger des fichiers .mid gratuits, puis importez‑les ici pour jouer et visualiser instantanément. Que vous pratiquiez, appreniez de nouvelles mélodies ou vous amusiez, ce site met un piano interactif et des mini‑jeux à portée de clic. Si vous appréciez l’outil, vous pouvez m’offrir un café en cliquant sur le bouton dans la barre du haut.`
    ]
  }
};



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
  const [isBarCollapsed, setIsBarCollapsed] = useState(false);
  const [instrument,setInstrument]=useState("Grand Piano");
  const [theme,setTheme]=useState("Classic");
  const [volume,setVolume]=useState(250);
  const [sustain,setSustain]=useState(false);
  const [midiData,setMidiData]=useState(null); // Midi object
  const [duration,setDuration]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [progress,setProgress]=useState(0);
  // état connexion MIDI
  const [midiConnected,setMidiConnected]=useState(false); // 0‑1



  const [navOpen, setNavOpen] = useState(false);

  const toggleNav = () => setNavOpen(o => !o);


  const isFr = navigator.language.startsWith("fr");
  const { summary, title, paragraphs } = texts[isFr ? "fr" : "en"];;

    
  
  

  const borderColor = "#000";   // contour noir, ou une couleur de ton thème
  const borderWidth = 1.5;      // épaisseur en pixels


  // pour gérer le thème temporaire de Bad Apple
  const prevThemeRef = useRef(null);

  // définition du thème « spécial »
  const BAD_APPLE_THEME = {
    bg: "#f0f0f0",
    barW: "rgba(0,0,0,1)",
    barB: "rgba(0,0,0,1)",
    actW: "#000000",
    actB: "#d2d2d2"
  };


  const TEMP_THEME_KEY = "Bad Apple";

  const toggleFullScreenBar = () => {
    // si on va cacher la barre, on entre en plein écran
    if (!isBarCollapsed) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen(); // Safari
      }
    } else {
      // sinon on sort du plein écran
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
      }
    }
    setIsBarCollapsed(b => !b);
  };

  const fileInputRef = useRef(null);
  // pour afficher/masquer la pop-up de choix
  const [showLibrary, setShowLibrary] = useState(false);
  const aboutRef = useRef(null);

  // réinitialise l'état pour revenir à l'écran vide
  const unloadMidi = () => {
    // 1) Stoppe la lecture
    Tone.Transport.stop();
    setPlaying(false);

    // 2) Si on venait de Bad Apple, restaure l’ancien thème et nettoie
    if (prevThemeRef.current !== null) {
      setTheme(prevThemeRef.current);
      prevThemeRef.current = null;
      delete THEMES[TEMP_THEME_KEY];
    }

    // 3) Réinitialise les données
    setMidiData(null);
    setProgress(0);

    // 4) Relâche toutes les touches actives
    clearAllActive();
  };


  // À placer DANS ton composant App(), à l’endroit où tu as défini loadDemo
  const loadDemo = async (name) => {
    try {
      // 1) Charger le fichier depuis /demos/
      const res = await fetch(`/demos/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.arrayBuffer();
      const midi = new Midi(arr);

      // 2) Mettre à jour l’état et préparer la lecture
      setMidiData(midi);
      setDuration(midi.duration + LEAD);
      preparePart(midi);

      // 3) Gestion du thème spécial Bad Apple
      if (name === "Bad Apple!!.mid") {
        // injecte le thème temporaire dans l’objet THEMES
        THEMES[TEMP_THEME_KEY] = BAD_APPLE_THEME;
        // mémorise le thème courant
        prevThemeRef.current = theme;
        // active le thème Bad Apple
        setTheme(TEMP_THEME_KEY);
      } else {
        // si on venait de Bad Apple, restaure l’ancien thème et nettoie
        if (prevThemeRef.current !== null) {
          setTheme(prevThemeRef.current);
          prevThemeRef.current = null;
          delete THEMES[TEMP_THEME_KEY];
        }
      }

      // 4) Fermer la pop-up
      closeLibrary();
    } catch (err) {
      console.error("Erreur loadDemo :", err);
      alert("Impossible de charger le morceau : " + name);
      closeLibrary();
    }
  };



  useEffect(() => {
    const onClickOutside = e => {
      if (aboutRef.current && !aboutRef.current.contains(e.target)) {
        aboutRef.current.open = false;
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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
  const handleFile = async (eOrFile) => {
    try {
      const file = eOrFile instanceof File
        ? eOrFile
        : (eOrFile.target && eOrFile.target.files[0]);
      if (!file) {
        console.warn("handleFile : pas de fichier trouvé");
        return;
      }
      console.log("handleFile – lecture du fichier :", file);
  
      const arr = await file.arrayBuffer();
      console.log("handleFile – arrayBuffer reçu, longueur :", arr.byteLength);
  
      const midi = new Midi(arr);
      console.log("handleFile – objet Midi créé, duration :", midi.duration);
  
      setMidiData(midi);
      setDuration(midi.duration + LEAD);
      preparePart(midi);
    }
    catch (err) {
      console.error("Erreur dans handleFile :", err);
      alert("Erreur lors de la lecture du MIDI : " + err.message);
    }
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
    if (!canvasRef.current) return;       // on ne bloque plus sur midiData
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, W, H);

    // position du haut du piano
    const pianoRect = pianoRef.current?.getBoundingClientRect();
    const keysY = pianoRect
      ? pianoRect.top
      : (H - parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--white-h")));
    const path = keysY;

    const t = Tone.Transport.seconds;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, keysY);
    ctx.clip();

    // ─── GESTION DES BARRES MONTANTES ───
    // on récupère toutes les notes enfoncées (clavier + tactile)
    const pressedMidis = [
      ...kbdSet.current,
      ...Array.from(pointerMap.current.values())
    ];

    // si aucune musique n'est chargée ET qu'on a des touches pressées
    if (!midiData && pressedMidis.length > 0) {
      pressedMidis.forEach(midi => {
        const keyEl = document.querySelector(`[data-midi="${midi}"]`);
        if (!keyEl) return;
        const rect = keyEl.getBoundingClientRect();

        // ajustements de largeur et position X
        const barWidth = rect.width * 0.9;
        const x = rect.left + (rect.width - barWidth) / 2;

        // hauteur : du bas du clavier (rect.top) jusqu'en haut de l'écran
        const yBottom = rect.top;
        const barHeight = yBottom;
        const yTop = 0;

        // couleur selon note blanche ou noire
        const baseColor = WHITE.includes(midi % 12)
          ? getComputedStyle(document.documentElement).getPropertyValue("--bar-w")
          : getComputedStyle(document.documentElement).getPropertyValue("--bar-b");

        // dégradé opaque
        const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(1, "rgba(255,255,255,0)");

        // ombre portée
        ctx.shadowColor = baseColor;
        ctx.shadowBlur  = 8;
        ctx.globalAlpha = 0.8;

        // dessin
        ctx.fillStyle = grad;
        ctx.fillRect(x, yTop, barWidth, barHeight);

        // reset
        ctx.shadowBlur  = 0;
        ctx.globalAlpha = 1;
      });

      ctx.restore();
      return;  // on sort avant de dessiner les barres MIDI
    }

    // ─── GESTION DES BARRES QUI TOMBENT (MIDI) ───
    if (midiData) {
      midiData.tracks.forEach(tr => {
        tr.notes.forEach(n => {
          const impact = n.time + LEAD;
          const remaining = impact - t;
          if (remaining < -n.duration || remaining > LEAD) return;

          const keyEl = document.querySelector(`[data-midi='${n.midi}']`);
          if (!keyEl) return;
          const rect = keyEl.getBoundingClientRect();

          // ajustement largeur comme précédemment
          const barWidth = rect.width * 0.9;
          const x = rect.left + (rect.width - barWidth) / 2;

          const yBottom = (1 - remaining / LEAD) * path;
          const barHeight = n.duration * (path / LEAD);
          const yTop = yBottom - barHeight;

          // couleur et dégradé
          const baseColor = WHITE.includes(n.midi % 12)
            ? getComputedStyle(document.documentElement).getPropertyValue("--bar-w")
            : getComputedStyle(document.documentElement).getPropertyValue("--bar-b");
          const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
          grad.addColorStop(0, baseColor);
          grad.addColorStop(1, "rgba(255,255,255,0.2)");

          // ombre et alpha
          ctx.shadowColor = "rgba(0,0,0,0.4)";
          ctx.shadowBlur  = 6;
          ctx.globalAlpha = 0.9;

          // coins arrondis
          const radius = Math.min(barWidth / 2, barHeight / 2, 8);
          ctx.beginPath();
          ctx.moveTo(x + radius, yTop);
          ctx.lineTo(x + barWidth - radius, yTop);
          ctx.quadraticCurveTo(x + barWidth, yTop, x + barWidth, yTop + radius);
          ctx.lineTo(x + barWidth, yBottom - radius);
          ctx.quadraticCurveTo(x + barWidth, yBottom, x + barWidth - radius, yBottom);
          ctx.lineTo(x + radius, yBottom);
          ctx.quadraticCurveTo(x, yBottom, x, yBottom - radius);
          ctx.lineTo(x, yTop + radius);
          ctx.quadraticCurveTo(x, yTop, x + radius, yTop);
          ctx.closePath();

          ctx.fillStyle = grad;
          ctx.fill();
  
          ctx.lineWidth   = borderWidth;
          ctx.strokeStyle = borderColor;
          ctx.stroke();

          // reset
          ctx.shadowBlur  = 0;
          ctx.globalAlpha = 1;
        });
      });
    }

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
      setMidiConnected(acc.inputs.size > 0);
      acc.onstatechange = ()=> setMidiConnected(acc.inputs.size > 0);
  
      acc.inputs.forEach(inp=>{
        inp.onmidimessage = ({data})=>{
          const [st, note, vel] = data;
          const cmd = st & 0xf0;
  
          if ((cmd === 0x90 && vel) || (cmd === 0x80 && vel > 0 && false)) {
            // NOTE ON
            synthRef.current.triggerAttack(m2n(note), undefined, vel/127);
            highlight(note, true);
  
            // **Ajout** au set pour les barres montantes
            kbdSet.current.add(note);
          }
          else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
            // NOTE OFF
            synthRef.current.triggerRelease(m2n(note));
            highlight(note, false);
  
            // **Suppression** du set
            kbdSet.current.delete(note);
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

  :root {
    /* décompose --act-w et --act-b en canaux R, G, B pour le rgba() */
    --act-w-r: 249;
    --act-w-g: 199;
    --act-w-b: 79;

    --act-b-r: 248;
    --act-b-g: 150;
    --act-b-b: 30;
  }

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
  /* Active White Keys */
  .active.white {
    /* du thème en bas → blanc mélangé à 40% en haut */
    background: linear-gradient(
      to top,
      var(--act-w) 0%,
      color-mix(in srgb, white 40%, var(--act-w)) 100%
    ) !important;

    /* lueur dynamique comme avant */
    box-shadow:
      0 0 12px var(--act-w),
      inset 0 0 4px rgba(255,255,255,0.3) !important;
  }

  /* Active Black Keys */
  .active.black {
    background: linear-gradient(
      to top,
      var(--act-b) 0%,
      color-mix(in srgb, white 20%, var(--act-b)) 100%
    ) !important;

    box-shadow:
      0 0 12px var(--act-b),
      inset 0 0 4px rgba(255,255,255,0.2) !important;
  }
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
    font-size: 0.9rem;        /* taille de police 90 % de la normale */
    line-height: 1.4;         /* pour compacter un peu l’interligne */
    max-height: 70vh;         /* hauteur maxi pour ne pas dépasser */
    overflow-y: auto;         /* scroll si trop long */
    padding-right: 0.5rem;    /* pour le scroll */
  }
  .about-content h4 {
    font-size: 0.5rem;        /* titre un peu plus petit aussi */
    margin-bottom: 1rem;
  }
  .about-content p {
    margin: 1rem 0;        /* espacement vertical réduit */
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

  .about-content {
    position: absolute;
    top: 2.5rem;
    left: 50%;                      /* partir du milieu */
    transform: translateX(-50%);    /* et reculer de la moitié de sa largeur */
    /* on garde margin et padding existants */
    max-width: calc(35vw - 2rem);  /* jamais plus large que l’écran moins un peu de marge */
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

  /* 1) Bouton toggle, masqué par défaut */
  .toggle-bar {
    display: none;
    position: fixed;
    top: 0.25rem;
    left: 0.25rem;
    background: var(--bg);
    border: none;
    color: #fff;
    font-size: 1.5rem;
    z-index: 4;
    padding: 0.25rem;
    border-radius: 4px;
  }

  /* 2) En paysage mobile, on affiche le toggle */
  @media (orientation: landscape) and (pointer: coarse) {
    .toggle-bar {
      display: block;
    }
    /* par défaut on cache la barre si isBarCollapsed = true */
    .top.collapsed {
      transform: translateY(-100%);
      transition: transform 0.3s ease;
    }
    .top {
      transition: transform 0.3s ease;
    }
    /* pour que la flèche soit toujours visible */
    .top.collapsed + .toggle-bar,
    .toggle-bar {
      z-index: 5;
    }
  }



  @media (pointer: coarse) and (orientation: portrait) {
    /* On cible les boutons, selects et inputs de la barre en mode portrait tactile */
    :root[data-mode="piano"] .top button,
    :root[data-mode="piano"] .top select,
    :root[data-mode="piano"] .top input[type="range"],
    :root[data-mode="piano"] .top label {
      font-size: 0.75rem !important;     /* réduire la taille du texte */
      padding: 0.25rem 0.5rem !important; /* réduire les paddings */
      margin: 0 !important;              /* enlever marges superflues */
    }

    /* Pour les icons / summary du about */
    :root[data-mode="piano"] .top details summary {
      font-size: 1rem !important;
    }
  }



  .top {
    display: flex;
    align-items: center;        /* tous les items centrés verticalement */
    padding: 0.5rem 1rem;
    background: #1a1a1a;
    gap: 1rem;                   /* espacement uniforme */
    position: fixed;
    top: 0; width: 100%; z-index: 10;
  }
  
  .toolbar-item {
    display: flex;
    align-items: center;        /* icône et label alignés */
    gap: 0.5rem;
    height: 2.5rem;              /* même hauteur pour tous */
  }
  
  .toolbar-item label,
  .toolbar-item select,
  .toolbar-item input[type="checkbox"] {
    vertical-align: middle;
  }
  
  .toolbar-item select,
  .toolbar-item input[type="range"] {
    height: 1.5rem;              /* rend la track du slider plus grande */
  }
  
  .toolbar-item img {
    display: block;              /* retire le petit décalage baseline */
    height: 1.5rem;
    width: auto;
  }
  
  /* Styles de bouton */
  .top button {
    height: 2.5rem;
    background: #333;
    color: #fff;
    border: none;
    padding: 0 0.75rem;
    border-radius: 4px;
    cursor: pointer;
  }
  .top button:hover {
    background: #444;
  }
  
  @media (orientation: portrait) and (pointer: coarse) {
    .top {
      position: fixed !important;
      top: calc(66vh + var(--white-h)) !important; /* même calcul que dans ton code JS initial */
      bottom: auto !important;
    }
  }

  @media (max-width: 480px) {
    .top {
      padding: 0.25rem 0.5rem;
      gap: 0.5rem;
    }
    .toolbar-item {
      height: 2rem;
      font-size: 0.75rem;
      gap: 0.25rem;
      min-width: auto;        /* évite que chaque item soit trop large */
      }
    .toolbar-item select,
    .toolbar-item input[type="range"] {
      height: 1.2rem;
    }
    .toolbar-item img {
      height: 1.2rem;
    }
    /* 3) On peut cacher les labels pour gagner de la place */
    .toolbar-item label {
      display: none;
    }
    /* Nouvel icone pour sustain si on veut (optionnel) */
    .toolbar-item input[type="checkbox"] + span {
      display: none;
    }
  }

  .toggle-bar {
    display: none;               /* par défaut masqué */
    position: fixed;
    top: 0.25rem;
    left: 0.25rem;
    background: #333;
    color: #fff;
    border: none;
    padding: 0.4rem;
    border-radius: 4px;
    font-size: 1.2rem;
    z-index: 20;
    cursor: pointer;
  }
  
  /* en paysage mobile tactile, on le montre */
  @media (orientation: landscape) and (pointer: coarse) {
    .toggle-bar {
      display: block !important;
    }
  }



  @media (max-width: 600px) {
    .about-content {
      position: fixed !important;            /* passe en fixed pour sortir du flow */
      top: 50% !important;                   /* centre verticalement */
      left: 50% !important;                  /* centre horizontalement */
      transform: translate(-50%, -50%) !important;
      width: calc(100% - 2rem) !important;   /* prend presque toute la largeur */
      max-width: none !important;            
      height: auto !important;              
      max-height: 90vh !important;           /* limite la hauteur pour le scroll */
      overflow-y: auto !important;           /* scroll interne si besoin */
      padding: 1.5rem !important;            /* plus d’aération à l’intérieur */
    }
    /* On baisse un peu le titre pour laisser de l’espace */
    .about-content h4 {
      font-size: 1.2rem;
      margin-bottom: 1rem;
    }
  }


  body {
    transition: background 0.5s ease, color 0.5s ease;
  }

  /* Appliquer une transition sur les barres et les éléments actifs */
  .bar, .active-note, .top {
    transition: background 0.5s ease, color 0.5s ease, border-color 0.5s ease;
  }



  
  .kofi-link {
    position: relative !important;  /* annule le absolute précédent */
    top: 0 !important;              /* remet à zéro l’offset vertical */
    right: 0 !important;            /* idem horizontal */
    margin-left: auto;              /* pousse à l’extrémité droite */
    align-self: center;             /* centre verticalement dans le flex */
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  


  .kofi-link:hover {
    opacity: 1;
  }




  .kofi-mobile-button {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    width: 48px;
    height: 48px;
    background: url('https://cdn.ko-fi.com/cdn/kofi5.png?v=3') 
                center center / contain no-repeat;
    opacity: 0.7;
    transition: opacity 0.2s;
    z-index: 1000;
  }

  /* Hover un peu plus visible */
  .kofi-mobile-button:hover {
    opacity: 1;
  }
  
  /* Par défaut on cache en paysage */
  @media (orientation: landscape) {
    .kofi-mobile-button {
      display: none;
    }
  }
  
  /* On n’affiche que sur petits écrans en portrait */
  @media (orientation: portrait) and (max-width: 768px) {
    .kofi-mobile-button {
      display: block;
    }
  }
  
  /* Optionnel : masquer sur desktop */
  @media (min-width: 769px) {
    .kofi-mobile-button {
      display: none;
    }
  }
  
  
  @media (orientation: portrait) and (max-width: 768px) {
    .kofi-link {
      display: none;
    }
  }


  @media (orientation: landscape) and (max-width: 768px) {
    .kofi-link {
      display: none;
    }
  }




  /* ─── NAV TOGGLE ───────────────────────── */
  .nav-toggle{
    position:fixed;
    top:50%; left:0;
    transform:translateY(-50%) rotate(180deg);   /* fermé : pointe vers la droite */
    width:24px; height:40px;                    /* ▶︎ → plus fin et moins haut   */
    background:#333; border:none; color:#fff;
    border-radius:0 4px 4px 0;
    cursor:pointer; z-index:30;
    transition:transform .25s;
    display:flex; align-items:center; justify-content:center; /* centrage du span */
    padding:0;                                         /* plus de padding   */
  }
  
  .nav-toggle.open{
    transform:translateY(-50%) rotate(0deg);           /* ouvert : vers la gauche */
  }
  
  .chevron{
    font-size:1rem;        /* taille du ‘>’ */
    line-height:1;         /* retire espace vertical superflu */
    pointer-events:none;   /* évite le survol du span seulement */
  }
  
  /* ────── BARRE LATERALE ────── */
  .side-nav{
    position:fixed; top:0; left:0; height:100vh;
    width:220px; max-width:70vw;
    background:#1a1a1a; color:#fff; z-index:25;
    transform:translateX(-100%); transition:transform .25s ease;
    box-shadow:2px 0 6px rgba(0,0,0,.6);
    display:flex; flex-direction:column; padding:1rem 1.2rem;
  }
  .side-nav.show{ transform:translateX(0); }
    
  .side-nav h3{ margin:0 0 1rem; font-size:1.1rem; }
  .side-nav ul{ list-style:none; padding:0; margin:0; }
  .side-nav li{ margin:.8rem 0; }
  
  .side-nav a{
    color:#ddd; text-decoration:none; font-size:.95rem;
  }
  .side-nav a:hover{ color:#fff; text-decoration:underline; }
  
  .soon{ color:#777; font-size:.9rem; }
  
  
  



  /* 1) Assure-toi que la sidebar est un flex vertical plein écran */
  .side-nav {
    display: flex;
    flex-direction: column;
    height: 100vh;           /* occupe toute la hauteur */
    padding-bottom: 1rem;    /* espace sous le footer */
    overflow-y: auto;        /* scroll si le contenu dépasse */
  }
  
  /* 2) Rends le footer “collant” en bas de son conteneur flex */
  .side-nav-footer {
    margin-top: auto;        /* pousse vers le bas */
    position: sticky;
    bottom: 0;               /* reste collé au bas de .side-nav */
    background: #1a1a1a;     /* même fond que la sidebar */
    padding: 1rem 1.2rem 0;   /* espace autour */
    border-top: 1px solid rgba(255,255,255,0.2);
  }
  
  /* 3) Ajuste la taille et l’espacement des liens */
  .side-nav-footer a,
  .side-nav-footer button {
    font-size: 0.80rem;
    padding: 0.25rem 0;
    text-decoration: none;
    color: #ddd;
    }
  .side-nav-footer a:hover,
  .side-nav-footer button:hover {
    color: #fff;
    text-decoration: underline;
  }
  
  
  
  
  
`}</style>


  {/* ───────── BOUTON FLÈCHE ───────── */}
  <button
    className={`nav-toggle ${navOpen ? "open" : ""}`}
    onClick={toggleNav}
    aria-label="Menu"
    >
    <span className="chevron">&gt;</span>
  </button>

  {/* ───────── BARRE LATÉRALE ───────── */}
  <nav className={`side-nav ${navOpen ? "show" : ""}`}>
    <h3>Mini‑games</h3>
    <ul>
      <li><a href="/pianorhythm">🎹 Piano Rhythm</a></li>
      <li><a href="/pianomemory">🟥 Piano Memory</a></li>
      <li><span className="soon">More Coming Soon…</span></li>
    </ul>

    <div className="side-nav-footer">
  
      {/* Liens Privacy et Contact */}
      <a href={privacyHref} target="_blank" rel="noopener">
        {privacyText}
      </a>
      <a href={contactHref}>
        Contact : pianovisualmidi@gmail.com
      </a>
    </div>


  </nav>


  {showLibrary && (
    <div className="library-overlay" onClick={closeLibrary}>
      <div className="library-menu" onClick={e => e.stopPropagation()}>

        {/* 2) Titre */}
        <h3>Upload or Select</h3>

        {/* 3) Upload file */}
        <button onClick={() => fileInputRef.current.click()}>
          Upload MIDI File
        </button>
        <input
          type="file"
          accept=".mid"
          hidden
          ref={fileInputRef}
          onChange={e => {
            const file = e.target.files[0];
            if (!file) return;
            console.log("Fichier sélectionné :", file.name);
            handleFile(file);
            closeLibrary();
          }}
        />

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

  <button
    className="toggle-bar"
    onClick={() => setIsBarCollapsed(b => !b)}
    onClick={toggleFullScreenBar}
    aria-label={isBarCollapsed ? "Show options" : "Hide options"}
  >
    {isBarCollapsed ? ">" : "<"}
  </button>

  <div className={`top${isBarCollapsed ? " collapsed" : ""}`}>






    <div className="toolbar-item">
      <img src={midiConnected ? "/midi_on.png" : "/midi_off.png"} width={24} height={24} />
    </div>

    <div className="toolbar-item">
      <label>Theme</label>
      <select value={theme} onChange={e => setTheme(e.target.value)}>
        {Object.keys(THEMES).map(t => <option key={t}>{t}</option>)}
      </select>
    </div>
  
    <div className="toolbar-item">
      <label>Instrument</label>
      <select value={instrument} onChange={e => setInstrument(e.target.value)}>
        {Object.keys(INSTR).map(i => <option key={i}>{i}</option>)}
      </select>
    </div>
  
    <div className="toolbar-item">
      <label>
        <input type="checkbox" checked={sustain} onChange={e => setSustain(e.target.checked)} />
        Sustain
      </label>
    </div>
  
    <div className="toolbar-item">
      <label>Vol</label>
      <input
        type="range"
        min="0"
        max="500"
        value={volume}
        onChange={e => setVolume(+e.target.value)}
        className="slider volume-slider"
      />
    </div>
  
    <button onClick={togglePlay} disabled={!midiData}>
      {playing ? "Pause" : "Play"}
    </button>
  
    <button onClick={openLibrary}>Load…</button>
    <button onClick={unloadMidi} disabled={!midiData}>Clear</button>
  
    <input
      type="range"
      min="0"
      max="1"
      step="0.001"
      value={progress}
      onChange={e => onScrub(e.target.valueAsNumber)}
      disabled={!midiData}
      className="slider progress-slider"
    />



  
    <details className="about" ref={aboutRef}>
      <summary>{summary}</summary>
      <div className="about-content">
        <h4>{title}</h4>
        {paragraphs.map((p,i) => <p key={i} dangerouslySetInnerHTML={{__html:p}} />)}
      </div>
    </details>


    <div className="toolbar-item">
      <a
        href="https://ko-fi.com/pianovisual"
        target="_blank"
        rel="noopener"
        className="kofi-link"
        title="Support me on Ko-fi"
      >
        <img src="https://cdn.ko-fi.com/cdn/kofi5.png?v=3" alt="Ko-fi" />
      </a>
    </div>

    <a
      href="https://ko-fi.com/pianovisual"
      target="_blank"
      rel="noopener"
      className="kofi-mobile-button"
      title="Support me on Ko-fi"
    />


  </div>
  
  <canvas ref={canvasRef}></canvas>

  <div className="piano" ref={pianoRef} onPointerDown={pDown} onPointerMove={pMove} onPointerUp={pUp} onPointerCancel={pUp}>{keys}</div>
  
  </>);
}