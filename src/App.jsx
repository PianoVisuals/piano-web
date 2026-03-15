// @ts-nocheck
import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
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
  "Night":        { bg: "#040814",  barW: "rgba(255,255,255,0.92)", barB: "rgba(156,188,255,0.84)", actW: "#ffffff", actB: "#bed5ff" },
  "Candy":        { bg: "#2a1021",  barW: "rgba(255,255,255,0.95)", barB: "rgba(255,104,162,0.95)", actW: "#fff7fb", actB: "#ff79b5" },
  "Neon":         { bg: "#060814",  barW: "rgba(0,245,255,0.88)",  barB: "rgba(255,72,214,0.86)",  actW: "#39fff4", actB: "#ff4fd8" },
  "Monochrome":   { bg: "#080808",  barW: "rgba(255,255,255,0.86)", barB: "rgba(92,92,92,0.94)",   actW: "#ffffff", actB: "#dddddd" },
  "Pixelated":    { bg: "#081820",  barW: "rgba(139,172,15,0.92)",  barB: "rgba(48,98,48,0.96)",   actW: "#8bac0f", actB: "#306230" }

};

const THEME_CLASSNAMES = {
  Classic: "theme-classic",
  Night: "theme-night",
  Candy: "theme-candy",
  Neon: "theme-neon",
  Monochrome: "theme-monochrome",
  Pixelated: "theme-pixelated"
};

const THEME_CLASS_LIST = Object.values(THEME_CLASSNAMES);

const applyThemeClass = (themeName) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  THEME_CLASS_LIST.forEach((className) => root.classList.remove(className));
  const nextClass = THEME_CLASSNAMES[themeName];
  if (nextClass) root.classList.add(nextClass);
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
  const whiteW = usable / 52;
  const whiteH = whiteW * 4;
  const vars = {
    "--white-w": `${whiteW}px`,
    "--white-h": `${whiteH}px`,
    "--black-w": `${whiteW * 0.6}px`,
    "--black-h": `${whiteH * 0.6}px`,
    "--black-shift": `-${whiteW * 0.3}px`
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

const getInitialSavedTheme = () => {
  try {
    const saved = localStorage.getItem("pv.theme");
    return saved && Object.prototype.hasOwnProperty.call(THEMES, saved)
      ? saved
      : "Classic";
  } catch {
    return "Classic";
  }
};

const INITIAL_THEME = getInitialSavedTheme();

if (typeof document !== "undefined") {
  const initialThemeDef = THEMES[INITIAL_THEME] ?? THEMES.Classic;
  Object.entries({
    bg: initialThemeDef.bg,
    "bar-w": initialThemeDef.barW,
    "bar-b": initialThemeDef.barB,
    "act-w": initialThemeDef.actW,
    "act-b": initialThemeDef.actB
  }).forEach(([k, v]) => document.documentElement.style.setProperty(`--${k}`, v));
  applyThemeClass(INITIAL_THEME);
}

const URLS = { C3: "C3.mp3", G3: "G3.mp3", C4: "C4.mp3", G4: "G4.mp3", C5: "C5.mp3", G5: "G5.mp3" };
const LONG_REL = 50; // sustain release seconds
const MIDI_SUSTAIN_EXTRA = 0.45; // extra hold for imported MIDI playback when sustain is enabled

const PIXEL_INSTRUMENTS = [
  "Pulse Lead",
  "Pulse Keys",
  "Triangle Bass",
  "Bit Organ"
];

const PIXEL_INSTRUMENT_PRESETS = {
  "Pulse Lead": {
    synthType: Tone.Synth,
    options: {
      oscillator: { type: "square" },
      envelope: { attack: 0.002, decay: 0.06, sustain: 0.16, release: 0.05 }
    },
    baseDb: -17
  },
  "Pulse Keys": {
    synthType: Tone.Synth,
    options: {
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.001, decay: 0.11, sustain: 0.05, release: 0.035 }
    },
    baseDb: -17
  },
  "Triangle Bass": {
    synthType: Tone.FMSynth,
    options: {
      harmonicity: 1.5,
      modulationIndex: 3,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.003, decay: 0.12, sustain: 0.42, release: 0.1 },
      modulation: { type: "square" },
      modulationEnvelope: { attack: 0.002, decay: 0.08, sustain: 0.28, release: 0.1 }
    },
    baseDb: -13
  },
  "Bit Organ": {
    synthType: Tone.AMSynth,
    options: {
      harmonicity: 1.01,
      oscillator: { type: "square" },
      envelope: { attack: 0.002, decay: 0.03, sustain: 1, release: 0.065 },
      modulation: { type: "triangle" },
      modulationEnvelope: { attack: 0.004, decay: 0.08, sustain: 0.75, release: 0.05 }
    },
    baseDb: -17
  }
};

const makeSampler = (name, themeName) => {
  if (themeName === "Pixelated") {
    const preset = PIXEL_INSTRUMENT_PRESETS[name] ?? PIXEL_INSTRUMENT_PRESETS["Pulse Lead"];
    const synth = new Tone.PolySynth(preset.synthType, preset.options);
    synth._pixelBaseDb = preset.baseDb ?? -20;
    synth.release = preset.options?.envelope?.release ?? 0.08;
    return synth;
  }

  return new Tone.Sampler({ urls: URLS, release: 1, baseUrl: `${BASE}${INSTR[name]}-mp3/` });
};

const disposeAudioNodes = (nodes = []) => {
  nodes.forEach((node) => {
    if (!node) return;
    try { node.disconnect?.(); } catch {}
    try { node.dispose?.(); } catch {}
  });
};

const buildThemeAudioChain = (themeName) => {
  if (themeName !== "Monochrome") {
    return { input: Tone.Destination, nodes: [] };
  }

  const highpass = new Tone.Filter({
    type: "highpass",
    frequency: 260,
    rolloff: -12,
    Q: 0.78
  });
  const lowpass = new Tone.Filter({
    type: "lowpass",
    frequency: 1780,
    rolloff: -12,
    Q: 0.95
  });
  const bitCrusher = new Tone.BitCrusher(7);
  const compressor = new Tone.Compressor({
    threshold: -26,
    ratio: 3.1,
    attack: 0.02,
    release: 0.22
  });
  const vibrato = new Tone.Vibrato({
    frequency: 5.6,
    depth: 0.06,
    type: "sine"
  });
  const output = new Tone.Gain(1.16);

  highpass.connect(lowpass);
  lowpass.connect(bitCrusher);
  bitCrusher.connect(compressor);
  compressor.connect(vibrato);
  vibrato.connect(output);
  output.toDestination();

  return {
    input: highpass,
    nodes: [highpass, lowpass, bitCrusher, compressor, vibrato, output]
  };
};

const drawRoundedRectPath = (ctx, x, y, width, height, radius) => {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, safeRadius);
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
};

const hexToRgba = (hex, alpha = 1) => {
  if (typeof hex !== "string") return `rgba(8, 6, 18, ${alpha})`;
  const clean = hex.replace("#", "").trim();
  if (![3, 6].includes(clean.length)) return `rgba(8, 6, 18, ${alpha})`;
  const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return `rgba(8, 6, 18, ${alpha})`;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const withAlpha = (color, alpha = 1) => {
  if (typeof color !== "string") return `rgba(255,255,255,${alpha})`;
  if (color.startsWith("#")) return hexToRgba(color, alpha);
  if (color.startsWith("rgba(")) {
    const parts = color.slice(5, -1).split(",").map(p => p.trim());
    return `rgba(${parts[0] || 255}, ${parts[1] || 255}, ${parts[2] || 255}, ${alpha})`;
  }
  if (color.startsWith("rgb(")) {
    const parts = color.slice(4, -1).split(",").map(p => p.trim());
    return `rgba(${parts[0] || 255}, ${parts[1] || 255}, ${parts[2] || 255}, ${alpha})`;
  }
  return color;
};

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
  const [instrument,setInstrument]=useState(() => {
    try {
      return localStorage.getItem("pv.instrument") || "Grand Piano";
    } catch {
      return "Grand Piano";
    }
  });
  const prevNonPixelInstrumentRef = useRef((() => {
    try {
      return localStorage.getItem("pv.instrument.normal") || "Grand Piano";
    } catch {
      return "Grand Piano";
    }
  })());
  const [theme,setTheme]=useState(INITIAL_THEME);
  const [volume,setVolume]=useState(250);
  const [sustain,setSustain]=useState(false);
  const sustainRef = useRef(false);
  const [midiData,setMidiData]=useState(null); // Midi object
  const [duration,setDuration]=useState(0);
  const [playing,setPlaying]=useState(false);
  const midiDataRef = useRef(null);
  const durationRef = useRef(0);
  const playingRef = useRef(false);
  // état connexion MIDI
  const [midiConnected,setMidiConnected]=useState(false); // 0‑1
  const [isMidiLoading, setIsMidiLoading] = useState(false);
  const [midiLoadingText, setMidiLoadingText] = useState("Chargement du MIDI…");
  const nightStars = useMemo(
    () => Array.from({ length: 56 }, (_, index) => {
      const densityBias = Math.pow(Math.random(), 0.6);
      return {
        id: index,
        left: `${2 + Math.random() * 96}%`,
        top: `${5 + densityBias * 67}%`,
        size: `${0.9 + Math.random() * 2.2}px`,
        duration: `${3.2 + Math.random() * 4.2}s`,
        delay: `${Math.random() * 4.8}s`,
        opacity: 0.36 + Math.random() * 0.52,
        hue: index % 6 === 0 ? "star-cold" : index % 9 === 0 ? "star-dim" : ""
      };
    }),
    []
  );

  const currentTheme = THEMES[theme] ?? THEMES.Classic;
  const isPixelated = theme === "Pixelated";
  const isNight = theme === "Night";
  const isCandy = theme === "Candy";
  const isNeon = theme === "Neon";
  const isMonochrome = theme === "Monochrome";
  const isBadApple = theme === "Bad Apple";
  const midiLoadingDisplay = (midiLoadingText || "MIDI")
    .replace(/^Chargement de\s*/i, "")
    .replace(/\s*[….]+$/u, "")
    .trim() || "MIDI";
  const loadingOverlayStyle = useMemo(() => ({
    "--loading-bg": withAlpha(currentTheme.bg, 0.62),
    "--loading-card-bg": isPixelated ? "#1a4d1a" : withAlpha(currentTheme.bg, 0.95),
    "--loading-card-border": isPixelated ? "#9bbc0f" : withAlpha(currentTheme.actW, 0.18),
    "--loading-accent-a": currentTheme.actW,
    "--loading-accent-b": currentTheme.actB,
    "--loading-spinner-track": isPixelated ? "rgba(15,56,15,0.55)" : "rgba(255,255,255,0.12)",
    "--loading-name-color": isPixelated ? "#c7d68d" : withAlpha("#ffffff", 0.94),
  }), [currentTheme, isPixelated]);

  const topBarThemeStyle = useMemo(() => ({
    "--top-shell-bg": isPixelated ? "#0f380f" : (isBadApple ? "rgba(255,255,255,0.94)" : withAlpha(currentTheme.bg, 0.96)),
    "--top-shell-border": isBadApple ? "rgba(0,0,0,0.16)" : withAlpha(currentTheme.actW, 0.16),
    "--top-shell-shadow": isBadApple ? "rgba(0,0,0,0.08)" : withAlpha(currentTheme.bg, 0.34),
    "--top-group-bg": isPixelated ? "#1a4d1a" : (isBadApple ? "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,248,248,0.94) 100%)" : `linear-gradient(180deg, ${withAlpha(currentTheme.bg, 0.88)} 0%, ${withAlpha(currentTheme.bg, 0.82)} 100%)`),
    "--top-group-border": isBadApple ? "rgba(0,0,0,0.14)" : withAlpha(currentTheme.actW, 0.18),
    "--top-status-bg": isBadApple ? "rgba(255,255,255,0.96)" : withAlpha(currentTheme.actW, 0.08),
    "--top-status-border": isBadApple ? "rgba(0,0,0,0.16)" : withAlpha(currentTheme.actW, 0.18),
    "--top-control-bg": isPixelated ? "#306230" : (isBadApple ? "#ffffff" : withAlpha(currentTheme.actW, 0.10)),
    "--top-control-hover": isPixelated ? "#3f6f3f" : (isBadApple ? "#f1f1f1" : withAlpha(currentTheme.actW, 0.14)),
    "--top-control-border": isBadApple ? "rgba(0,0,0,0.18)" : withAlpha(currentTheme.actW, 0.18),
    "--top-toggle-bg": withAlpha(currentTheme.actW, 0.08),
    "--top-toggle-hover": withAlpha(currentTheme.actW, 0.14),
    "--top-toggle-border": withAlpha(currentTheme.actW, 0.18),
    "--top-button-bg": isPixelated ? "#306230" : withAlpha(currentTheme.actW, 0.10),
    "--top-button-hover": isPixelated ? "#3f6f3f" : withAlpha(currentTheme.actW, 0.16),
    "--top-button-border": withAlpha(currentTheme.actW, 0.20),
    "--top-play-bg": isPixelated
      ? "linear-gradient(180deg, #9bbc0f 0%, #8bac0f 100%)"
      : isNight
        ? "linear-gradient(180deg, #ffffff 0%, #dbe9ff 100%)"
        : isMonochrome
          ? "linear-gradient(180deg, #ffffff 0%, #d5d5d5 100%)"
          : `linear-gradient(135deg, ${currentTheme.actW} 0%, ${currentTheme.actB} 100%)`,
    "--top-play-hover": isPixelated
      ? "linear-gradient(180deg, #a7c81b 0%, #90b10f 100%)"
      : isNight
        ? "linear-gradient(180deg, #ffffff 0%, #eaf2ff 100%)"
        : isMonochrome
          ? "linear-gradient(180deg, #ffffff 0%, #e8e8e8 100%)"
          : `linear-gradient(135deg, ${withAlpha(currentTheme.actW, 0.92)} 0%, ${withAlpha(currentTheme.actB, 0.92)} 100%)`,
    "--top-play-border": isBadApple ? "rgba(0,0,0,0.22)" : withAlpha(currentTheme.actW, 0.42),
    "--top-play-color": isBadApple ? "#000000" : ((isNight || isCandy || isNeon || isMonochrome) ? "#07101d" : (isPixelated ? "#0f380f" : "#ffffff")),
    "--top-focus-ring": isBadApple ? "rgba(0,0,0,0.12)" : withAlpha(currentTheme.actW, 0.24),
    "--top-select-option-bg": isBadApple ? "#ffffff" : withAlpha(currentTheme.bg, 0.98),
    "--top-select-option-text": isBadApple ? "#000000" : "#ffffff",
    "--top-value-bg": withAlpha(currentTheme.actW, 0.10),
    "--top-value-border": withAlpha(currentTheme.actW, 0.18),
    "--top-label-color": isBadApple ? "#000000" : (isPixelated ? "#9bbc0f" : withAlpha(currentTheme.actW, 0.82)),
    "--top-progress-text": isBadApple ? "#000000" : (isPixelated ? "#c7d68d" : withAlpha("#ffffff", 0.86)),
    "--top-range-accent": currentTheme.actW,
    "--top-range-track": isPixelated ? "rgba(15,56,15,0.82)" : withAlpha("#ffffff", 0.18),
    "--top-control-text": isBadApple ? "#000000" : "#ffffff",
    "--top-toggle-text": isBadApple ? "#000000" : "#ffffff",
    "--top-button-text": isBadApple ? "#000000" : "#ffffff",
    "--top-frame-toggle-text": isBadApple ? "#000000" : "#ffffff",
    "--top-play-active-color": isBadApple ? "#000000" : "rgba(255,255,255,0.96)",
    "--top-play-disabled-color": isBadApple ? "rgba(0,0,0,0.48)" : "rgba(255,255,255,0.52)",
    "--top-kofi-bg": isBadApple ? "linear-gradient(180deg, #101010 0%, #000000 100%)" : "linear-gradient(180deg, #67d2f7 0%, #45b9ea 100%)",
    "--top-kofi-border": isBadApple ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.2)",
  }), [currentTheme, isBadApple, isNight, isCandy, isNeon, isMonochrome, isPixelated]);

  const libraryThemeStyle = useMemo(() => ({
    "--library-overlay-bg": isBadApple ? "rgba(255,255,255,0.62)" : withAlpha(currentTheme.bg, 0.62),
    "--library-card-bg": isPixelated ? "#1a4d1a" : (isBadApple ? "rgba(255,255,255,0.90)" : withAlpha(currentTheme.bg, 0.95)),
    "--library-card-border": isPixelated ? "#9bbc0f" : (isBadApple ? "rgba(0,0,0,0.14)" : withAlpha(currentTheme.actW, 0.18)),
    "--library-title-color": isPixelated ? "#c7d68d" : (isBadApple ? "#000000" : withAlpha("#ffffff", 0.96)),
    "--library-text-color": isPixelated ? "#c7d68d" : (isBadApple ? "#000000" : withAlpha("#ffffff", 0.94)),
    "--library-muted": isBadApple ? "rgba(0,0,0,0.72)" : withAlpha("#ffffff", 0.72),
    "--library-control-bg": isPixelated ? "#306230" : (isBadApple ? "#ffffff" : withAlpha(currentTheme.actW, 0.10)),
    "--library-control-hover": isPixelated ? "#3f6f3f" : (isBadApple ? "#f1f1f1" : withAlpha(currentTheme.actW, 0.16)),
    "--library-control-border": isBadApple ? "rgba(0,0,0,0.18)" : withAlpha(currentTheme.actW, 0.20),
    "--library-accent-bg": isPixelated ? "linear-gradient(180deg, #9bbc0f 0%, #8bac0f 100%)" : isMonochrome ? "linear-gradient(180deg, #ffffff 0%, #d7d7d7 100%)" : `linear-gradient(135deg, ${currentTheme.actW} 0%, ${currentTheme.actB} 100%)`,
    "--library-accent-hover": isPixelated ? "linear-gradient(180deg, #a7c81b 0%, #90b10f 100%)" : isMonochrome ? "linear-gradient(180deg, #ffffff 0%, #e4e4e4 100%)" : `linear-gradient(135deg, ${withAlpha(currentTheme.actW, 0.92)} 0%, ${withAlpha(currentTheme.actB, 0.92)} 100%)`,
    "--library-accent-border": isBadApple ? "rgba(0,0,0,0.20)" : withAlpha(currentTheme.actW, 0.40),
    "--library-accent-text": isBadApple ? "#000000" : ((isNight || isCandy || isNeon || isMonochrome) ? "#07101d" : (isPixelated ? "#0f380f" : "#ffffff")),
    "--library-focus-ring": isBadApple ? "rgba(0,0,0,0.12)" : withAlpha(currentTheme.actW, 0.24),
    "--library-select-accent": isBadApple ? "#000000" : currentTheme.actW,
    "--library-select-option-bg": isBadApple ? "#ffffff" : withAlpha(currentTheme.bg, 0.98),
    "--library-select-option-text": isBadApple ? "#000000" : "#ffffff",
  }), [currentTheme, isBadApple, isNight, isCandy, isNeon, isMonochrome, isPixelated]);

  const getDisplayInstrumentName = (name) => name;

  const transposeRef = useRef(0);
  const [transpose, _setTranspose] = useState(0);
  const setTranspose = (val) => {
    transposeRef.current = val;
    _setTranspose(val);
  };

  midiDataRef.current = midiData;
  durationRef.current = duration;
  playingRef.current = playing;

  function playTransposedNote(note, velocity = 1) {
    const midi = n2m(note);
    if (typeof midi !== "number") return;
  
    const transposed = midi + transposeRef.current;
    if (transposed < NOTE_MIN || transposed > NOTE_MAX) return;

    const name = m2n(transposed);
    if (!name) return;

    synthRef.current.triggerAttack(name, undefined, velocity);
  }
  function releaseTransposedNote(note) {
    const midi = n2m(note);
    if (typeof midi !== "number") return;
  
    const transposed = midi + transposeRef.current;
    if (transposed < NOTE_MIN || transposed > NOTE_MAX) return;
  
    const name = m2n(transposed);
    if (!name) return;

    synthRef.current.triggerRelease(name);
  }
  

  const [navOpen, setNavOpen] = useState(false);

  const toggleNav = () => setNavOpen(o => !o);

  const isFr = navigator.language.startsWith("fr");
  const { summary, title, paragraphs } = texts[isFr ? "fr" : "en"];;

    
  useEffect(() => {
    if (!midiData || !partRef.current) return;

    // Sauve le temps actuel
    const currentTime = Tone.Transport.seconds;

    // Supprime la séquence en cours
    partRef.current.dispose();

    // Recrée une nouvelle part avec la transposition
    preparePart(midiData);

    // Replace le transport à l'ancien temps
    Tone.Transport.seconds = currentTime;

    // Relance la lecture si elle était en cours
    if (playing) {
      Tone.Transport.start("+0.05");
    }
    requestAnimationFrame(measureScene);
    queueVisualFrame();
  }, [transpose]);
  

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
  const keyMetaRef = useRef(new Map());
  const visualNotesRef = useRef([]);
  const visualMaxDurationRef = useRef(0);
  const pixelSongStepRef = useRef(8);
  const pixelSongStepTimeRef = useRef(0.1);
  const pixelSongTimingRef = useRef({ minDuration: Infinity, minGap: Infinity });
  const canvasCtxRef = useRef(null);
  const canvasMetricsRef = useRef({ width: 0, height: 0, dpr: 1, pianoTop: 0 });
  const visualRafRef = useRef(null);
  const progressRef = useRef(0);
  const progressInputRef = useRef(null);
  const isScrubbingRef = useRef(false);
  const scrubPointerIdRef = useRef(null);
  const wasPlayingBeforeScrubRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const visualFrameTimeRef = useRef(0);
  const visualDirtyRef = useRef(true);
  const audioNodesRef = useRef([]);
  const patternCacheRef = useRef({ ctx: null, patterns: new Map() });
  const themeVisualRef = useRef({
    barWhite: currentTheme.barW,
    barBlack: currentTheme.barB,
    activeWhite: currentTheme.actW,
    activeBlack: currentTheme.actB,
    pixelated: isPixelated,
    mode: theme,
  });
  const monochromeFilmRef = useRef({
    anchorRawT: 0,
    renderT: 0,
    nextFrameDuration: 0.098,
  });

  const VISUAL_FRAME_MS = 1000 / 40;
  const MONOCHROME_VISUAL_FRAME_MS = 1000 / 24;
  const MONOCHROME_FILM_FRAME_MIN = 0.082;
  const MONOCHROME_FILM_FRAME_MAX = 0.128;

  const commitProgress = (next) => {
    const clamped = Math.max(0, Math.min(next, 1));
    progressRef.current = clamped;
    const input = progressInputRef.current;
    if (input && (!isScrubbingRef.current || document.activeElement !== input)) {
      input.value = String(clamped);
    }
  };

  const randomMonochromeFilmFrame = () => (
    MONOCHROME_FILM_FRAME_MIN + Math.random() * (MONOCHROME_FILM_FRAME_MAX - MONOCHROME_FILM_FRAME_MIN)
  );

  const resetMonochromeFilmClock = (rawT = Tone.Transport.seconds || 0) => {
    monochromeFilmRef.current.anchorRawT = rawT;
    monochromeFilmRef.current.renderT = rawT;
    monochromeFilmRef.current.nextFrameDuration = randomMonochromeFilmFrame();
  };

  const getMonochromeRenderTime = (rawT) => {
    const film = monochromeFilmRef.current;

    if (rawT < film.anchorRawT || rawT - film.anchorRawT > 0.42 || Math.abs(rawT - film.renderT) > 0.6) {
      resetMonochromeFilmClock(rawT);
      return monochromeFilmRef.current.renderT;
    }

    while (rawT - film.anchorRawT >= film.nextFrameDuration) {
      film.anchorRawT += film.nextFrameDuration;
      film.renderT = film.anchorRawT;
      film.nextFrameDuration = randomMonochromeFilmFrame();
    }

    return film.renderT;
  };

  const getCachedPattern = (ctx, key, painter) => {
    if (patternCacheRef.current.ctx !== ctx) {
      patternCacheRef.current = { ctx, patterns: new Map() };
    }

    if (patternCacheRef.current.patterns.has(key)) {
      return patternCacheRef.current.patterns.get(key);
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = 28;
    offscreen.height = 28;
    const offscreenCtx = offscreen.getContext("2d");
    if (!offscreenCtx) return null;

    painter(offscreenCtx, offscreen.width, offscreen.height);
    const pattern = ctx.createPattern(offscreen, "repeat");
    patternCacheRef.current.patterns.set(key, pattern);
    return pattern;
  };

  const getThemeBarPattern = (ctx, mode, isWhite) => {
    if (mode === "Candy") {
      return getCachedPattern(ctx, `candy-${isWhite ? "white" : "pink"}`, (pctx, w, h) => {
        pctx.fillStyle = isWhite ? "#fff7fb" : "#ffd7e8";
        pctx.fillRect(0, 0, w, h);
        pctx.strokeStyle = isWhite ? "#ff456f" : "#ff7cb2";
        pctx.lineWidth = 8;
        for (let i = -h; i < w + h; i += 14) {
          pctx.beginPath();
          pctx.moveTo(i, 0);
          pctx.lineTo(i + h, h);
          pctx.stroke();
        }
      });
    }

    if (mode === "Retrowave") {
      return getCachedPattern(ctx, `retrowave-${isWhite ? "sun" : "grid"}`, (pctx, w, h) => {
        const grad = pctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, isWhite ? "#ffb0d8" : "#67f3ff");
        grad.addColorStop(1, isWhite ? "#ff4fb6" : "#2876ff");
        pctx.fillStyle = grad;
        pctx.fillRect(0, 0, w, h);
        pctx.fillStyle = "rgba(255,255,255,0.18)";
        for (let y = 2; y < h; y += 7) {
          pctx.fillRect(0, y, w, 1);
        }
      });
    }

    if (mode === "Monochrome") {
      return null;
    }

    return null;
  };

  const paintThemeBar = (ctx, { x, yTop, yBottom, barWidth, barHeight, isWhite, baseColor, mode }) => {
    if (barHeight <= 0 || barWidth <= 0) return;

    if (mode === "Pixelated") {
      ctx.imageSmoothingEnabled = false;
      const px = Math.round(x);
      const py = Math.round(yTop);
      const ph = Math.max(1, Math.round(barHeight));
      const pw = Math.max(1, Math.round(barWidth));

      ctx.fillStyle = baseColor;
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      for (let yy = py + 2; yy < py + ph; yy += 5) {
        ctx.fillRect(px, yy, pw, 1);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = borderColor;
      ctx.strokeRect(px + 0.5, py + 0.5, Math.max(0, pw - 1), Math.max(0, ph - 1));
      return;
    }

    if (mode === "Monochrome") {
      const px = Math.round(x);
      const py = Math.round(yTop);
      const pw = Math.max(1, Math.round(barWidth));
      const ph = Math.max(1, Math.round(barHeight));
      ctx.fillStyle = isWhite ? "rgba(212,212,212,0.96)" : "rgba(98,98,98,0.96)";
      ctx.fillRect(px, py, pw, ph);
      return;
    }

    const radius = Math.min(barWidth / 2, barHeight / 2, mode === "Candy" ? 14 : 8);
    drawRoundedRectPath(ctx, x, yTop, barWidth, barHeight, radius);

    if (mode === "Candy") {
      const pattern = getThemeBarPattern(ctx, mode, isWhite);
      ctx.fillStyle = pattern || baseColor;
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = isWhite
        ? "rgba(255,255,255,0.92)"
        : "rgba(255,255,255,0.52)";
      ctx.stroke();
      return;
    }

    if (mode === "Night") {
      const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
      grad.addColorStop(0, isWhite ? "rgba(196,216,250,0.24)" : "rgba(98,134,228,0.18)");
      grad.addColorStop(1, isWhite ? "rgba(247,251,255,0.94)" : "rgba(188,216,255,0.78)");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 1.05;
      ctx.strokeStyle = isWhite ? "rgba(255,255,255,0.44)" : "rgba(182,210,255,0.32)";
      ctx.stroke();
      return;
    }


    if (mode === "Neon") {
      const core = ctx.createLinearGradient(0, yTop, 0, yBottom);

      if (isWhite) {
        core.addColorStop(0, "rgba(228,255,255,0.96)");
        core.addColorStop(0.26, "rgba(118,255,247,1)");
        core.addColorStop(1, "rgba(0,176,255,0.98)");
      } else {
        core.addColorStop(0, "rgba(255,236,249,0.96)");
        core.addColorStop(0.26, "rgba(255,120,232,1)");
        core.addColorStop(1, "rgba(150,72,255,0.98)");
      }

      drawRoundedRectPath(ctx, x, yTop, barWidth, barHeight, radius);
      ctx.fillStyle = core;
      ctx.fill();
      return;
    }

    if (mode === "Bad Apple") {
      ctx.fillStyle = "rgba(0,0,0,0.98)";
      ctx.fill();
      return;
    }

    const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
    grad.addColorStop(0, baseColor);
    grad.addColorStop(1, "rgba(255,255,255,0.2)");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  };

  const stopScrub = (finalClientX = null, pointerId = null) => {
    if (!isScrubbingRef.current && scrubPointerIdRef.current == null) {
      return;
    }

    if (
      pointerId != null &&
      scrubPointerIdRef.current != null &&
      pointerId !== scrubPointerIdRef.current
    ) {
      return;
    }

    if (finalClientX != null) {
      scrubFromClientX(finalClientX);
    }

    const input = progressInputRef.current;
    if (input && scrubPointerIdRef.current != null) {
      try {
        input.releasePointerCapture?.(scrubPointerIdRef.current);
      } catch {}
    }

    const shouldResume = wasPlayingBeforeScrubRef.current;

    isScrubbingRef.current = false;
    scrubPointerIdRef.current = null;
    wasPlayingBeforeScrubRef.current = false;

    syncVisualFromTransport();

    if (shouldResume && midiDataRef.current) {
      Tone.Transport.start();
      setPlaying(true);
      playingRef.current = true;
    }

    queueVisualFrame();
  };

  const queueVisualFrame = (markDirty = true) => {
    if (markDirty) {
      visualDirtyRef.current = true;
    }
    if (visualRafRef.current != null) return;
    visualRafRef.current = requestAnimationFrame((now) => {
      visualRafRef.current = null;

      const hasActiveInteraction =
        playingRef.current ||
        isScrubbingRef.current ||
        kbdSet.current.size > 0 ||
        pointerMap.current.size > 0;

      if (!hasActiveInteraction && !visualDirtyRef.current) {
        return;
      }

      const minFrameMs = themeVisualRef.current.mode === "Monochrome"
        ? MONOCHROME_VISUAL_FRAME_MS
        : VISUAL_FRAME_MS;

      if (now - visualFrameTimeRef.current < minFrameMs) {
        if (hasActiveInteraction || visualDirtyRef.current) {
          queueVisualFrame(false);
        }
        return;
      }

      visualFrameTimeRef.current = now;

      if (playingRef.current && durationRef.current && !isScrubbingRef.current) {
        const t = Tone.Transport.seconds;
        commitProgress(transportSecondsToProgress(t));
      }

      drawBars();
      visualDirtyRef.current = false;

      if (hasActiveInteraction) {
        queueVisualFrame(false);
      }
    });
  };

  const measureScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (
      canvasMetricsRef.current.width !== width ||
      canvasMetricsRef.current.height !== height ||
      canvasMetricsRef.current.dpr !== dpr
    ) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvasCtxRef.current = ctx;
      }
    }

    const pianoTop = pianoRef.current?.getBoundingClientRect().top
      ?? (height - parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--white-h")));

    canvasMetricsRef.current = { width, height, dpr, pianoTop };
    recomputePixelSongStep();

    const nextMeta = new Map();
    document.querySelectorAll("[data-midi]").forEach((el) => {
      const midi = Number(el.getAttribute("data-midi"));
      const rect = el.getBoundingClientRect();
      nextMeta.set(midi, {
        el,
        left: rect.left,
        width: rect.width,
        isWhite: WHITE.includes(midi % 12),
      });
    });
    keyMetaRef.current = nextMeta;
  };

  // réinitialise l'état pour revenir à l'écran vide
  const unloadMidi = () => {
    loadRequestIdRef.current += 1;

    // 1) Stoppe la lecture et nettoie le transport
    resetPlaybackForIncomingMidi();

    // 2) Si on venait de Bad Apple, restaure l’ancien thème et nettoie
    if (prevThemeRef.current !== null) {
      setTheme(prevThemeRef.current);
      prevThemeRef.current = null;
      delete THEMES[TEMP_THEME_KEY];
    }

    // 3) Réinitialise les données
    midiDataRef.current = null;
    durationRef.current = 0;
    setMidiData(null);
    setDuration(0);
  };

  // À placer DANS ton composant App(), à l’endroit où tu as défini loadDemo
  const loadDemo = async (name) => {
    if (!name) return;
    const requestId = ++loadRequestIdRef.current;

    setMidiLoadingText(`Chargement de ${name.replace(/\.mid$/i, "")}…`);
    setIsMidiLoading(true);
    closeLibrary();
    resetPlaybackForIncomingMidi();
    setMidiData(null);
    setDuration(0);

    try {
      const res = await fetch(`/demos/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.arrayBuffer();
      const midi = new Midi(arr);

      if (requestId !== loadRequestIdRef.current) return;

      midiDataRef.current = midi;
      durationRef.current = midi.duration;
      setMidiData(midi);
      setDuration(midi.duration);
      preparePart(midi);
      requestAnimationFrame(measureScene);
      queueVisualFrame();

      if (name === "Bad Apple!!.mid") {
        THEMES[TEMP_THEME_KEY] = BAD_APPLE_THEME;
        prevThemeRef.current = theme;
        setTheme(TEMP_THEME_KEY);
      } else if (prevThemeRef.current !== null) {
        setTheme(prevThemeRef.current);
        prevThemeRef.current = null;
        delete THEMES[TEMP_THEME_KEY];
      }
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      console.error("Erreur loadDemo :", err);
      alert("Impossible de charger le morceau : " + name);
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsMidiLoading(false);
      }
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

  useEffect(() => {
    const onResize = () => {
      measureScene();
      queueVisualFrame();
    };

    measureScene();
    queueVisualFrame();
    const raf = requestAnimationFrame(() => {
      measureScene();
      queueVisualFrame();
    });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      if (visualRafRef.current != null) {
        cancelAnimationFrame(visualRafRef.current);
        visualRafRef.current = null;
      }
    };
  }, [isBarCollapsed]);

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
    const onBlur = () => {
      releaseHeldInteractiveNotes();
    };

    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // appliquer thème -------------------------------------------------
  useEffect(() => {
    if (theme === "Pixelated") {
      if (!PIXEL_INSTRUMENTS.includes(instrument)) {
        prevNonPixelInstrumentRef.current = instrument;
        try { localStorage.setItem("pv.instrument.normal", instrument); } catch {}
        setInstrument("Pulse Lead");
      }
    } else if (PIXEL_INSTRUMENTS.includes(instrument)) {
      const restored = prevNonPixelInstrumentRef.current || "Grand Piano";
      if (instrument !== restored) {
        setInstrument(restored);
      }
    }
  }, [theme]);

  useEffect(() => {
    if (!PIXEL_INSTRUMENTS.includes(instrument)) {
      prevNonPixelInstrumentRef.current = instrument;
      try { localStorage.setItem("pv.instrument.normal", instrument); } catch {}
    }
    try { localStorage.setItem("pv.instrument", instrument); } catch {}
  }, [instrument]);

  useEffect(() => {
    try { localStorage.setItem("pv.theme", theme); } catch {}
  }, [theme]);

  useLayoutEffect(()=>{
    const c = THEMES[theme] ?? THEMES.Classic;
    Object.entries({bg:c.bg,"bar-w":c.barW,"bar-b":c.barB,"act-w":c.actW,"act-b":c.actB}).forEach(([k,v])=>document.documentElement.style.setProperty(`--${k}`,v));
    applyThemeClass(theme);
    patternCacheRef.current = { ctx: null, patterns: new Map() };
    themeVisualRef.current = {
      barWhite: c.barW,
      barBlack: c.barB,
      activeWhite: c.actW,
      activeBlack: c.actB,
      pixelated: theme === "Pixelated",
      mode: theme,
    };
    resetMonochromeFilmClock(0);
    queueVisualFrame();
    return () => {
      THEME_CLASS_LIST.forEach((className) => document.documentElement.classList.remove(className));
    };
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
  useEffect(()=>{
    synthRef.current?.dispose();
    disposeAudioNodes(audioNodesRef.current);

    const { input, nodes } = buildThemeAudioChain(theme);
    audioNodesRef.current = nodes;

    const sampler = makeSampler(instrument, theme);
    sampler.connect(input);
    synthRef.current = sampler;

    const baseDb = synthRef.current?._pixelBaseDb ?? 0;
    synthRef.current.volume.value = Tone.gainToDb(volume / 100) + baseDb;
    synthRef.current.release = sustain ? LONG_REL : 1;
    queueVisualFrame();

    return () => {
      synthRef.current?.dispose();
      disposeAudioNodes(audioNodesRef.current);
      audioNodesRef.current = [];
    };
  },[instrument, theme]);
  useEffect(()=>{
    sustainRef.current = sustain;
    if(synthRef.current){
      const baseDb = synthRef.current?._pixelBaseDb ?? 0;
      synthRef.current.volume.value=Tone.gainToDb(volume/100)+baseDb;
      synthRef.current.release = sustain ? LONG_REL : 1;
    }
  },[volume,sustain]);

  // MIDI import ----------------------------------------------------
  const handleFile = async (eOrFile) => {
    const requestId = ++loadRequestIdRef.current;

    try {
      const file = eOrFile instanceof File
        ? eOrFile
        : (eOrFile.target && eOrFile.target.files[0]);
      if (!file) {
        console.warn("handleFile : pas de fichier trouvé");
        return;
      }

      setMidiLoadingText(`Chargement de ${file.name.replace(/\.mid$/i, "")}…`);
      setIsMidiLoading(true);
      closeLibrary();
      resetPlaybackForIncomingMidi();
      setMidiData(null);
      setDuration(0);

      const arr = await file.arrayBuffer();
      const midi = new Midi(arr);

      if (requestId !== loadRequestIdRef.current) return;

      midiDataRef.current = midi;
      durationRef.current = midi.duration;
      setMidiData(midi);
      setDuration(midi.duration);
      preparePart(midi);
      requestAnimationFrame(measureScene);
      queueVisualFrame();
    }
    catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      console.error("Erreur dans handleFile :", err);
      alert("Erreur lors de la lecture du MIDI : " + err.message);
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsMidiLoading(false);
      }
    }
  };

  const clearAllActive = () => {
    synthRef.current?.releaseAll?.();

    pointerMap.current.clear();
    kbdSet.current.clear();

    if (keyMetaRef.current.size > 0) {
      keyMetaRef.current.forEach((meta) => {
        meta?.el?.classList.remove("active");
      });
    } else {
      document.querySelectorAll(".active").forEach((el) => {
        el.classList.remove("active");
      });
    }

    queueVisualFrame();
  };

  const resetPlaybackForIncomingMidi = () => {
    stopScrub();

    wasPlayingBeforeScrubRef.current = false;

    if (visualRafRef.current != null) {
      cancelAnimationFrame(visualRafRef.current);
      visualRafRef.current = null;
    }
    visualFrameTimeRef.current = 0;
    visualDirtyRef.current = true;

    setPlaying(false);
    playingRef.current = false;

    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Tone.Transport.seconds = 0;

    partRef.current?.dispose();
    partRef.current = null;

    midiDataRef.current = null;
    durationRef.current = 0;
    visualNotesRef.current = [];
    visualMaxDurationRef.current = 0;

    commitProgress(0);
    clearAllActive();
    drawBars();
  };

  const preparePart = (midi) => {
    partRef.current?.dispose();
    const events = [];
    const visualNotes = [];
    let maxDuration = 0;
    let minDuration = Infinity;

    midi.tracks.forEach(track =>
      track.notes.forEach(n => {
        const transposedMidi = n.midi + transposeRef.current;
        if (transposedMidi >= NOTE_MIN && transposedMidi <= NOTE_MAX) {
          const name = m2n(transposedMidi);
          events.push({
            time: n.time,
            name,
            duration: n.duration,
            velocity: n.velocity
          });
          if (n.duration > maxDuration) maxDuration = n.duration;
          if (n.duration > 0 && n.duration < minDuration) minDuration = n.duration;
          visualNotes.push({
            time: n.time + LEAD,
            duration: n.duration,
            midi: transposedMidi
          });
        }
      })
    );

    visualNotes.sort((a, b) => a.time - b.time);

    let minGap = Infinity;
    let previousTime = null;
    for (const note of visualNotes) {
      if (previousTime != null && note.time > previousTime) {
        minGap = Math.min(minGap, note.time - previousTime);
      }
      previousTime = note.time;
    }

    pixelSongTimingRef.current = {
      minDuration,
      minGap
    };
    recomputePixelSongStep();

    visualNotesRef.current = visualNotes;
    visualMaxDurationRef.current = maxDuration;

    partRef.current = new Tone.Part((time, note) => {
      const effectiveDuration = note.duration + (sustainRef.current ? MIDI_SUSTAIN_EXTRA : 0);
      synthRef.current.triggerAttackRelease(note.name, effectiveDuration, time, note.velocity);
      Tone.Draw.schedule(() => highlight(n2m(note.name), true), time);
      Tone.Draw.schedule(() => highlight(n2m(note.name), false), time + note.duration);
    }, events.map(n => ({
      time: n.time + LEAD,
      name: n.name,
      duration: n.duration,
      velocity: n.velocity
    })));

    partRef.current.start(0);
    Tone.Transport.seconds = 0;
    syncVisualFromTransport(true);
    queueVisualFrame();
  };

  // play / pause --------------------------------------------------- ---------------------------------------------------
  const togglePlay = async () => {
    if (!midiDataRef.current) return;

    if (!playingRef.current) {
      try {
        await Tone.start();
      } catch {}
      Tone.Transport.start();
      setPlaying(true);
      playingRef.current = true;
      syncVisualFromTransport();
      queueVisualFrame();
    } else {
      const pausedAt = Tone.Transport.seconds;
      Tone.Transport.pause();
      Tone.Transport.seconds = pausedAt;
      setPlaying(false);
      playingRef.current = false;
      commitProgress(transportSecondsToProgress(pausedAt));
      drawBars();
      queueVisualFrame();
    }
  };

  useEffect(() => {
    queueVisualFrame();
  }, [playing, duration, midiData]);

  const onScrub = (val) => {
    if (!midiDataRef.current || !durationRef.current) return;
    const clamped = Math.max(0, Math.min(val, 1));
    Tone.Transport.seconds = progressToTransportSeconds(clamped);
    commitProgress(clamped);
    drawBars();
    queueVisualFrame();
  };

  const scrubFromClientX = (clientX) => {
    const input = progressInputRef.current;
    if (!input || !midiDataRef.current || !durationRef.current) return;
    const rect = input.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = (clientX - rect.left) / rect.width;
    onScrub(ratio);
  };

  const beginScrub = (e) => {
    if (!midiDataRef.current) return;
    e.preventDefault();

    wasPlayingBeforeScrubRef.current = playingRef.current;

    if (playingRef.current) {
      Tone.Transport.pause();
      setPlaying(false);
      playingRef.current = false;
    }

    isScrubbingRef.current = true;
    scrubPointerIdRef.current = e.pointerId ?? null;
    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {}
    scrubFromClientX(e.clientX);
    queueVisualFrame();
  };

  const moveScrub = (e) => {
    if (!isScrubbingRef.current) return;
    if (
      scrubPointerIdRef.current != null &&
      e.pointerId != null &&
      scrubPointerIdRef.current !== e.pointerId
    ) return;
    scrubFromClientX(e.clientX);
    queueVisualFrame();
  };

  const endScrub = (e) => {
    stopScrub(e?.clientX ?? null, e?.pointerId ?? null);
  };

  useEffect(() => {
    const onGlobalPointerUp = (e) => {
      stopScrub(e?.clientX ?? null, e?.pointerId ?? null);
    };
    const onWindowBlur = () => {
      stopScrub();
    };

    window.addEventListener("pointerup", onGlobalPointerUp, true);
    window.addEventListener("pointercancel", onGlobalPointerUp, true);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      window.removeEventListener("pointerup", onGlobalPointerUp, true);
      window.removeEventListener("pointercancel", onGlobalPointerUp, true);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  // ==== Falling bars =============================================
  const LEAD = 8; // seconds it takes for a bar to fall from top to keys
  const MAX_VISIBLE_BARS = 260;

  const recomputePixelSongStep = () => {
    const path = canvasMetricsRef.current.pianoTop || 0;
    if (!path) return;

    const pixelsPerSecond = path / LEAD;
    const { minDuration, minGap } = pixelSongTimingRef.current;

    const limitingSeconds = Math.min(
      Number.isFinite(minDuration) && minDuration > 0 ? minDuration : Infinity,
      Number.isFinite(minGap) && minGap > 0 ? minGap : Infinity
    );

    if (!Number.isFinite(limitingSeconds)) {
      pixelSongStepRef.current = 8;
      pixelSongStepTimeRef.current = 0.1;
      return;
    }

    pixelSongStepTimeRef.current = 0.1;
    pixelSongStepRef.current = 8;
  };

  const progressToTransportSeconds = (ratio) => {
    const trackDuration = durationRef.current;
    if (!trackDuration) return 0;
    return LEAD + Math.max(0, Math.min(ratio, 1)) * trackDuration;
  };

  const transportSecondsToProgress = (seconds) => {
    const trackDuration = durationRef.current;
    if (!trackDuration) return 0;
    return Math.max(0, Math.min((seconds - LEAD) / trackDuration, 1));
  };

  const syncVisualFromTransport = (forceMeasure = false) => {
    if (forceMeasure) {
      measureScene();
    }
    resetMonochromeFilmClock(Tone.Transport.seconds);
    commitProgress(transportSecondsToProgress(Tone.Transport.seconds));
    drawBars();
  };

  const drawBars = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!canvasCtxRef.current) {
      measureScene();
    }

    const ctx = canvasCtxRef.current;
    if (!ctx) return;

    const { width: W, pianoTop } = canvasMetricsRef.current;
    ctx.clearRect(0, 0, W, canvasMetricsRef.current.height);

    const path = pianoTop;
    const rawT = Tone.Transport.seconds;
    const { barWhite, barBlack, mode } = themeVisualRef.current;
    const renderT = mode === "Monochrome"
      ? getMonochromeRenderTime(rawT)
      : rawT;
    const cullLead = 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, pianoTop);
    ctx.clip();
    ctx.shadowColor = "transparent";
    ctx.imageSmoothingEnabled = mode !== "Pixelated";

    const pressedMidis = Array.from(new Set([
      ...kbdSet.current,
      ...pointerMap.current.values()
    ]));

    if (!midiDataRef.current && pressedMidis.length > 0) {
      for (const midi of pressedMidis) {
        const meta = keyMetaRef.current.get(midi);
        if (!meta) continue;

        const barWidth = meta.width * 0.9;
        const x = meta.left + (meta.width - barWidth) / 2;
        const yBottom = pianoTop;
        const yTop = 0;
        const baseColor = meta.isWhite ? barWhite : barBlack;

        ctx.globalAlpha = 0.9;
        paintThemeBar(ctx, {
          x,
          yTop,
          yBottom,
          barWidth,
          barHeight: yBottom - yTop,
          isWhite: meta.isWhite,
          baseColor,
          mode,
        });
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      return;
    }

    if (midiDataRef.current) {
      const visualNotes = visualNotesRef.current;
      const visibleUntil = rawT + LEAD + cullLead;
      const visibleFrom = rawT - visualMaxDurationRef.current - cullLead;
      let lo = 0;
      let hi = visualNotes.length;

      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (visualNotes[mid].time < visibleFrom) lo = mid + 1;
        else hi = mid;
      }

      let visibleCount = 0;
      const maxVisibleBars = mode === "Monochrome" ? 160 : MAX_VISIBLE_BARS;
      for (let i = lo; i < visualNotes.length; i++) {
        const n = visualNotes[i];
        if (n.time > visibleUntil) break;
        if (n.time + n.duration < visibleFrom) continue;
        visibleCount += 1;
        if (visibleCount > maxVisibleBars) break;

        const meta = keyMetaRef.current.get(n.midi);
        if (!meta) continue;

        const remaining = n.time - renderT;
        const barWidth = meta.width * 0.9;
        const x = meta.left + (meta.width - barWidth) / 2;
        const yBottom = (1 - remaining / LEAD) * path;
        const barHeight = n.duration * (path / LEAD);
        const yTop = yBottom - barHeight;
        const baseColor = meta.isWhite ? barWhite : barBlack;

        ctx.globalAlpha = 0.9;
        paintThemeBar(ctx, {
          x,
          yTop,
          yBottom,
          barWidth,
          barHeight,
          isWhite: meta.isWhite,
          baseColor,
          mode,
        });
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  };

  // --- PC keyboard -------------------------------------------------
  useEffect(() => {
    const down = (e) => {
      if (e.code === "Space") {
        if (midiDataRef.current) {
          e.preventDefault();
          e.stopPropagation();
          if (playingRef.current) {
            Tone.Transport.pause();
            setPlaying(false);
          } else {
            Tone.Transport.start("+0.1");
            setPlaying(true);
          }
          queueVisualFrame();
        }
        return;
      }
      if (e.repeat) return;
      const note = PC_MAP[e.code];
      if (!note) return;
      const midi = n2m(note);
      if (kbdSet.current.has(midi)) return;
      kbdSet.current.add(midi);
      playTransposedNote(note)
      highlight(midi, true);
      queueVisualFrame();
    };
    const up = (e) => {
      const note = PC_MAP[e.code];
      if (!note) return;
      const midi = n2m(note);
      kbdSet.current.delete(midi);
      releaseTransposedNote(note)
      highlight(midi, false);
      queueVisualFrame();
    };
    const resetHeldNotes = () => {
      if (document.visibilityState === "hidden") {
        releaseHeldInteractiveNotes();
      }
    };
    const resetHeldNotesOnBlur = () => {
      releaseHeldInteractiveNotes();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', resetHeldNotesOnBlur);
    document.addEventListener('visibilitychange', resetHeldNotes);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', resetHeldNotesOnBlur);
      document.removeEventListener('visibilitychange', resetHeldNotes);
    };
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
            playTransposedNote(m2n(note), vel / 127);
            highlight(note, true);
            kbdSet.current.add(note);
            queueVisualFrame();
          }
          else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) {
            // NOTE OFF
            releaseTransposedNote(m2n(note));
            highlight(note, false);
            kbdSet.current.delete(note);
            queueVisualFrame();
          }
        };
      });
    });
  },[]);

  // pointer events (unchanged) ------------------------------------
  const midiAt = (x, y) => {
    const a = document.elementFromPoint(x, y)?.getAttribute("data-midi");
    return a ? +a : null;
  };

  const highlight = (m, on) => {
    const meta = keyMetaRef.current.get(m);
    const el = meta?.el ?? document.querySelector(`[data-midi='${m}']`);
    if (!el) return;
    el.classList.toggle("active", on);
    queueVisualFrame();
  };

  const releasePointerNote = (pointerId) => {
    const m = pointerMap.current.get(pointerId);
    pointerMap.current.delete(pointerId);
    if (m != null) {
      releaseTransposedNote(m2n(m));
      highlight(m, false);
      queueVisualFrame();
    }
  };

  const releaseHeldInteractiveNotes = () => {
    let changed = false;

    pointerMap.current.forEach((m, pointerId) => {
      pointerMap.current.delete(pointerId);
      if (m != null) {
        releaseTransposedNote(m2n(m));
        highlight(m, false);
        changed = true;
      }
    });

    kbdSet.current.forEach((m) => {
      releaseTransposedNote(m2n(m));
      highlight(m, false);
      changed = true;
    });
    kbdSet.current.clear();

    if (changed) {
      synthRef.current?.releaseAll?.();
      queueVisualFrame();
    }
  };

  const pDown = e => {
    e.preventDefault();
    releasePointerNote(e.pointerId);

    const m = midiAt(e.clientX, e.clientY);
    if (m == null) return;

    pointerMap.current.set(e.pointerId, m);
    playTransposedNote(m2n(m));
    highlight(m, true);

    try {
      e.currentTarget?.setPointerCapture?.(e.pointerId);
    } catch {}

    queueVisualFrame();
  };

  const pMove = e => {
    if (!pointerMap.current.has(e.pointerId)) return;
    const cur = pointerMap.current.get(e.pointerId);
    const n = midiAt(e.clientX, e.clientY);
    if (n === cur) return;

    pointerMap.current.delete(e.pointerId);
    releaseTransposedNote(m2n(cur));
    highlight(cur, false);

    if (n != null) {
      pointerMap.current.set(e.pointerId, n);
      playTransposedNote(m2n(n));
      highlight(n, true);
    }

    queueVisualFrame();
  };

  const pUp = e => {
    releasePointerNote(e.pointerId);
  };

  useEffect(() => {
    const endPointer = (e) => {
      if (typeof e.pointerId === "number") {
        releasePointerNote(e.pointerId);
      } else {
        releaseHeldInteractiveNotes();
      }
    };

    window.addEventListener("pointerup", endPointer, true);
    window.addEventListener("pointercancel", endPointer, true);

    return () => {
      window.removeEventListener("pointerup", endPointer, true);
      window.removeEventListener("pointercancel", endPointer, true);
    };
  }, []);

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
  useEffect(()=>{const mq=matchMedia('(hover: hover) and (pointer: fine)');const f=()=>document.documentElement.classList.toggle('pc',mq.matches);f();mq.addEventListener('change',f);return()=>mq.removeEventListener('change',f);},[]);

  // keys render ----------------------------------------------------
  const keys = useMemo(() => KEYS.map(m => <div key={m} data-midi={m} className={WHITE.includes(m % 12) ? "white key" : "black key"}>{labelByMidi[m] && !isBarCollapsed && <span className="label">{labelByMidi[m]}</span>}</div>), [labelByMidi, isBarCollapsed]);

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
  .white:last-child{border-right:1px solid #000;}
  .black{width:var(--black-w);height:var(--black-h);background:#000;margin-left:var(--black-shift);margin-right:var(--black-shift);border-radius:0 0 4px 4px;z-index:2;display:flex;align-items:flex-end;justify-content:center;box-sizing:border-box;}
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
    position: fixed;
    inset: 0;
    background: var(--library-overlay-bg, rgba(0,0,0,0.56));
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
    padding: 1rem;
  }

  .library-menu {
    position: relative;
    width: min(92vw, 360px);
    padding: 1rem;
    border-radius: 18px;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    background: var(--library-card-bg, #222);
    border: 1px solid var(--library-card-border, rgba(255,255,255,0.12));
    color: var(--library-text-color, #fff);
    box-shadow: none;
    box-sizing: border-box;
  }

  .library-menu h3 {
    margin: 0 0 0.25rem;
    color: var(--library-title-color, #fff);
    text-align: center;
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: 0.02em;
  }

  .library-menu button,
  .library-menu select {
    width: 100%;
    min-width: 0;
    height: 42px;
    font-size: 0.95rem;
    padding: 0 0.8rem;
    border-radius: 12px;
    background: var(--library-control-bg, rgba(255,255,255,0.08));
    border: 1px solid var(--library-control-border, rgba(255,255,255,0.12));
    color: var(--library-text-color, #fff);
    box-sizing: border-box;
    outline: none;
  }

  .library-menu button:hover,
  .library-menu select:hover {
    background: var(--library-control-hover, rgba(255,255,255,0.12));
  }

  .library-menu button:focus,
  .library-menu select:focus {
    box-shadow: 0 0 0 2px var(--library-focus-ring, rgba(91, 140, 255, 0.22));
  }

  .library-menu button:first-of-type {
    background: var(--library-accent-bg, linear-gradient(135deg, #4b66ff 0%, #6f86ff 100%));
    border-color: var(--library-accent-border, rgba(125,148,255,0.5));
    color: var(--library-accent-text, var(--library-text-color, #fff));
    font-weight: 700;
  }

  .library-menu button:first-of-type:hover {
    background: var(--library-accent-hover, linear-gradient(135deg, #5872ff 0%, #8094ff 100%));
  }

  .library-menu select {
    appearance: none;
    accent-color: var(--library-select-accent, #5b8cff);
  }

  .library-menu select option {
    background: var(--library-select-option-bg, #1b1d26);
    color: var(--library-select-option-text, #ffffff);
  }

.loading-pill {
  --load-accent-a: #7c5cff;
  --load-accent-b: #ff4fa6;
  --load-accent-c: #6ecbff;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  max-width: min(100%, 300px);
  height: 30px;
  padding: 0 0.82rem 0 0.7rem;
  border-radius: 11px;
  border: 1px solid rgba(255,255,255,0.08);
  background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.045) 100%);
  color: #f6f8ff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 20px rgba(0,0,0,0.16);
  overflow: hidden;
}

.loading-pill::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  border-radius: 11px 0 0 11px;
  background: linear-gradient(180deg, var(--load-accent-a) 0%, var(--load-accent-b) 55%, var(--load-accent-c) 100%);
  opacity: 0.95;
}

.loading-pill::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.07) 35%, transparent 62%);
  background-size: 240% 100%;
  animation: midi-loading-sheen 1.7s linear infinite;
  pointer-events: none;
}

.loading-pill-text {
  position: relative;
  z-index: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.015em;
}

.loading-dot {
  position: relative;
  z-index: 1;
  width: 11px;
  height: 11px;
  border-radius: 999px;
  flex: 0 0 auto;
  background: radial-gradient(circle at 35% 35%, #ffffff 0%, #ffd9ec 28%, var(--load-accent-b) 58%, var(--load-accent-a) 100%);
  box-shadow: 0 0 0 2px rgba(124, 92, 255, 0.18), 0 0 14px rgba(255, 79, 166, 0.35);
  animation: midi-orb-pulse 1.2s ease-in-out infinite;
}

.progress-slider.is-loading {
  opacity: 1;
  filter: saturate(1.02);
}

.progress-slider.is-loading::-webkit-slider-runnable-track {
  background: linear-gradient(90deg, rgba(124, 92, 255, 0.18) 0%, rgba(255, 79, 166, 0.24) 38%, rgba(110, 203, 255, 0.2) 70%, rgba(124, 92, 255, 0.18) 100%);
  background-size: 220% 100%;
  animation: midi-track-shimmer 1.5s linear infinite;
}

.progress-slider.is-loading::-moz-range-track {
  background: linear-gradient(90deg, rgba(124, 92, 255, 0.18) 0%, rgba(255, 79, 166, 0.24) 38%, rgba(110, 203, 255, 0.2) 70%, rgba(124, 92, 255, 0.18) 100%);
  background-size: 220% 100%;
  animation: midi-track-shimmer 1.5s linear infinite;
}

@keyframes midi-orb-pulse {
  0% { transform: scale(0.92); box-shadow: 0 0 0 2px rgba(124, 92, 255, 0.16), 0 0 10px rgba(255, 79, 166, 0.25); }
  50% { transform: scale(1.06); box-shadow: 0 0 0 3px rgba(124, 92, 255, 0.26), 0 0 18px rgba(255, 79, 166, 0.42); }
  100% { transform: scale(0.92); box-shadow: 0 0 0 2px rgba(124, 92, 255, 0.16), 0 0 10px rgba(255, 79, 166, 0.25); }
}

@keyframes midi-track-shimmer {
  from { background-position: 0% 0; }
  to { background-position: 220% 0; }
}

@keyframes midi-loading-sheen {
  from { background-position: 240% 0; }
  to { background-position: -40% 0; }
}

  /* 1) Bouton toggle, masqué par défaut */
  .toggle-bar {
    display: none;
    position: fixed;
    top: 0.25rem;
    left: 0.25rem;
    background: var(--bg);
    border: none;
    color: var(--top-control-text, #fff);
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
    color: var(--top-toggle-text, #fff);
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
    color: var(--top-button-text, #fff);
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
    transition: none;
  }

  /* Désactive les transitions de recolorisation pour éviter le lag au changement de thème */
  .bar,
  .active-note,
  .top,
  .top.top-shell,
  .top-group,
  .white,
  .black,
  .label,
  .kofi-link,
  .top.top-shell button,
  .top.top-shell select,
  .library-menu,
  .library-menu button,
  .library-menu select,
  .status-pill,
  .toggle-chip,
  .value-badge,
  .control-input,
  .top-frame-toggle {
    transition: none !important;
  }
  .kofi-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    margin-left: auto;
    align-self: center;
    border-radius: 999px;
    background: linear-gradient(180deg, #67d2f7 0%, #45b9ea 100%);
    border: 1px solid rgba(255,255,255,0.22);
    text-decoration: none;
    box-shadow: 0 2px 10px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.18);
    opacity: 0.92;
    overflow: hidden;
    transition: opacity 0.12s linear, background 0.12s linear, border-color 0.12s linear;
  }

  .kofi-link:hover {
    opacity: 0.97;
    box-shadow: 0 3px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.22);
  }

  .kofi-link svg {
    display: block;
    width: 24px;
    height: 24px;
  }

  @media (max-width: 768px) {
    .kofi-link {
      width: 30px;
      height: 30px;
    }

    .kofi-link svg {
      width: 20px;
      height: 20px;
    }
  }

  .nav-toggle {
    position: fixed;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: linear-gradient(135deg, #575757 0%, #373434 100%);
    padding: 0;
    border: none;
    cursor: pointer;
    z-index: 30;
    transition: box-shadow 0.12s linear, background 0.12s linear;
  }
  
  /* 2) Centre la flèche avec position absolue */
  .nav-toggle .chevron {
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    font-size: 1.2rem !important;
    line-height: 1;
    pointer-events: none;
  }
  
  .nav-toggle:hover {
    box-shadow: 0 5px 10px rgba(0,0,0,0.34);
  }
  

  .nav-toggle.open {
    transform: translateY(-50%) rotate(180deg);
  }
  
  /* ────── BARRE LATERALE ────── */
  .side-nav{
    position:fixed; top:0; left:0; height:100vh;
    width:220px; max-width:70vw;
    background:#1a1a1a; color:#fff; z-index:25;
    transform:translateX(-100%); transition:transform .12s linear;
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
  
  
  

  .side-nav {
    padding-bottom: env(safe-area-inset-bottom, 1.5rem);
  }
  
  /* 2) Footer collant juste au-dessus du bas de .side-nav */
  .sidebar-footer {
    position: sticky;
    bottom: env(safe-area-inset-bottom, 1rem);
    margin-top: auto;
    padding: 0.5rem 0;
    background: inherit;       /* hérite de l’arrière‑plan de .side-nav */
  }
  
  /* Style du lien */
  .sidebar-footer a {
    display: inline-block;
    color: #bbb;
    font-size: 0.9rem;
    text-decoration: none;
  }
  
  .sidebar-footer a:hover {
    color: var(--top-frame-toggle-text, #fff);
    text-decoration: underline;
  }
  
  
  .transpose-slider {
    width: 100px;
    height: 4px;
    appearance: none;
    background: #666;
    border-radius: 2px;
    outline: none;
    margin: 0 0.5rem;
    vertical-align: middle;
  }
  .transpose-slider::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 10px;
    background: #fff;
    border-radius: 50%;
    cursor: pointer;
    border: 1px solid #000;
  }
  .transpose-slider::-moz-range-thumb {
    width: 10px;
    height: 10px;
    background: #fff;
    border-radius: 50%;
    cursor: pointer;
    border: 1px solid #000;
  }

  

  
  .toolbar-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin: 0;
    font-size: 0.75rem;
  }
  
  .toolbar-item select,
  .toolbar-item input[type="range"],
  .toolbar-item label {
    height: 1.3rem !important;
    font-size: 0.75rem !important;
    padding: 0 0.3rem !important;
  }

  

  /* ===== Top bar redesign ===== */
  .top.top-shell {
    display: flex;
    padding: 0.45rem 0.55rem;
    background: var(--top-shell-bg, #15171b);
    border-bottom: 1px solid var(--top-shell-border, rgba(255,255,255,0.08));
    box-shadow: 0 6px 14px var(--top-shell-shadow, rgba(0,0,0,0.22));
    gap: 0;
    overflow-x: hidden;
    box-sizing: border-box;
    accent-color: var(--top-range-accent, #5b8cff);
  }

  .top-row {
    width: 100%;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.28fr) minmax(0, 1fr) auto;
    gap: 0.5rem;
    align-items: stretch;
  }

  .top-group {
    min-width: 0;
    display: flex;
    align-items: flex-end;
    gap: 0.55rem;
    min-height: 50px;
    padding: 0.5rem 0.65rem;
    border-radius: 14px;
    background: var(--top-group-bg, #1d2127);
    border: 1px solid var(--top-group-border, rgba(255,255,255,0.075));
    box-sizing: border-box;
  }

  .top-group-status {
    display: grid;
    grid-template-columns: auto minmax(110px, 150px) minmax(170px, 1fr);
    align-items: end;
  }

  .top-group-controls {
    display: grid;
    grid-template-columns: auto minmax(145px, 1fr) minmax(145px, 1fr);
    align-items: end;
  }

  .top-group-actions {
    justify-content: flex-end;
    gap: 0.45rem;
    padding-left: 0.55rem;
    white-space: nowrap;
  }

  .top-progress-strip {
    grid-column: 1 / -1;
    width: 100%;
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
  }

  .top-group-progress {
    grid-column: auto;
    width: auto;
    flex: 1 1 auto;
    padding-top: 0.4rem;
    padding-bottom: 0.45rem;
  }

  .top-progress-side-controls {
    display: flex;
    align-items: center;
    gap: 0.42rem;
    flex: 0 0 auto;
  }

  .top-progress-toggle-slot,
  .top-progress-kofi-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    height: 36px;
    padding: 0 0.75rem;
    border-radius: 999px;
    background: var(--top-status-bg, rgba(255,255,255,0.055));
    border: 1px solid var(--top-status-border, rgba(255,255,255,0.08));
    white-space: nowrap;
    font-size: 0.78rem;
    color: var(--top-control-text, #eef2fa);
  }

  .status-pill span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status-pill img {
    width: 18px;
    height: 18px;
    display: block;
    flex-shrink: 0;
  }

  .control-block {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .control-block-wide,
  .control-block-slider,
  .control-block-progress {
    min-width: 0;
    flex: 1 1 auto;
  }

  .control-label {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--top-label-color, #aeb7c7);
    line-height: 1;
  }

  .control-input,
  .top.top-shell select {
    width: 100%;
    min-width: 0;
    height: 36px;
    padding: 0 0.65rem;
    border-radius: 11px;
    border: 1px solid var(--top-control-border, rgba(255,255,255,0.08));
    background: var(--top-control-bg, rgba(255,255,255,0.065));
    color: var(--top-control-text, #fff);
    outline: none;
    box-sizing: border-box;
  }

  .top.top-shell select:focus,
  .top.top-shell button:focus,
  .top.top-shell input:focus {
    box-shadow: 0 0 0 2px var(--top-focus-ring, rgba(91, 140, 255, 0.22));
  }

  .toggle-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    height: 36px;
    padding: 0 0.75rem;
    border-radius: 11px;
    background: var(--top-toggle-bg, rgba(255,255,255,0.055));
    border: 1px solid var(--top-toggle-border, rgba(255,255,255,0.08));
    color: var(--top-toggle-text, #fff);
    white-space: nowrap;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .toggle-chip input {
    margin: 0;
    accent-color: var(--top-range-accent, #5b8cff);
  }

  .control-range {
    width: 100%;
    min-width: 0;
  }

  .top.top-shell input[type="range"],
  .top.top-shell input[type="checkbox"],
  .top.top-shell select {
    accent-color: var(--top-range-accent, #5b8cff);
  }

  .top.top-shell select option {
    background: var(--top-select-option-bg, #1b1d26);
    color: var(--top-select-option-text, #ffffff);
  }

  .top.top-shell input[type="range"] {
    filter: saturate(1.02);
  }

  .inline-slider-value {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    min-width: 0;
  }

  .value-badge {
    min-width: 34px;
    height: 28px;
    padding: 0 0.45rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--top-value-bg, rgba(255,255,255,0.08));
    border: 1px solid var(--top-value-border, rgba(255,255,255,0.08));
    color: var(--top-control-text, #fff);
    font-weight: 700;
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: nowrap;
  }

  .top.top-shell button {
    height: 36px;
    padding: 0 0.82rem;
    border-radius: 11px;
    border: 1px solid var(--top-button-border, rgba(255,255,255,0.08));
    background: var(--top-button-bg, rgba(255,255,255,0.08));
    color: var(--top-button-text, #fff);
    font-weight: 600;
    letter-spacing: 0.01em;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }

  .top.top-shell button:hover {
    background: var(--top-button-hover, rgba(255,255,255,0.13));
  }

  .top.top-shell button.primary-action {
    min-width: 84px;
    justify-content: center;
    background: var(--top-play-bg, linear-gradient(135deg, #4b66ff 0%, #6f86ff 100%));
    border-color: var(--top-play-border, rgba(125, 148, 255, 0.5));
    color: var(--top-play-color, #ffffff);
  }

  .top.top-shell button.primary-action:hover {
    background: var(--top-play-hover, linear-gradient(135deg, #5872ff 0%, #8094ff 100%));
  }

  .top.top-shell button.primary-action.is-playing {
    background: linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.07) 100%);
    border-color: rgba(255,255,255,0.14);
    color: var(--top-play-active-color, rgba(255,255,255,0.96));
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  }

  .top.top-shell button.primary-action.is-playing:hover {
    background: linear-gradient(180deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.09) 100%);
    border-color: rgba(255,255,255,0.18);
  }

  .top.top-shell button:disabled {
    cursor: not-allowed;
    opacity: 0.62;
    box-shadow: none;
  }

  .top.top-shell button.primary-action:disabled,
  .top.top-shell button.primary-action.is-inactive {
    background: rgba(255,255,255,0.07);
    color: var(--top-play-disabled-color, rgba(255,255,255,0.52));
    border-color: rgba(255,255,255,0.08);
  }

  .top.top-shell button.primary-action:disabled:hover,
  .top.top-shell button.primary-action.is-inactive:hover {
    background: rgba(255,255,255,0.07);
  }

  .top-kofi {
    margin-left: 0;
    flex-shrink: 0;
  }

  .progress-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    margin-bottom: 0.15rem;
  }

  .progress-state {
    color: var(--top-progress-text, #d0d6e3);
    font-size: 0.76rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .progress-wide {
    width: 100%;
  }

  .progress-row {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    width: 100%;
  }

  .progress-row .control-block-progress {
    flex: 1 1 auto;
    min-width: 0;
  }

  .progress-compact {
    max-width: 100%;
  }

  .top-frame-toggle-inline {
    margin-bottom: 0;
    flex-shrink: 0;
  }

  .top-progress-toggle-slot .top-frame-toggle-inline {
    align-self: center;
  }

  .top-frame-toggle-collapsed {
    display: inline-flex;
  }

  @media (max-width: 1420px) {
    .top-row {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }

    .top-group-actions {
      grid-column: 1 / -1;
      justify-content: space-between;
      padding-left: 0.65rem;
    }
  }

  @media (max-width: 980px) {
    .top.top-shell {
      padding: 0.45rem;
    }

    .top-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .top-group {
      width: 100%;
      min-height: auto;
      padding: 0.55rem 0.6rem;
      border-radius: 13px;
      flex-wrap: wrap;
    }

    .top-group-status,
    .top-group-controls {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .status-pill {
      grid-column: 1 / -1;
      justify-self: flex-start;
    }

    .top-group-actions {
      justify-content: space-between;
      gap: 0.5rem;
      padding-left: 0.6rem;
    }
  }

  @media (max-width: 620px) {
    .top-group-status,
    .top-group-controls {
      grid-template-columns: minmax(0, 1fr);
    }

    .action-buttons {
      width: 100%;
      flex-wrap: wrap;
    }

    .top.top-shell button {
      flex: 1 1 31%;
      min-width: 82px;
      padding: 0 0.6rem;
    }

    .top-group-actions {
      align-items: center;
      justify-content: space-between;
      padding-left: 0.6rem;
    }

    .top-progress-strip {
      align-items: stretch;
    }

    .progress-label-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }

    .loading-pill {
      max-width: 100%;
    }

    .top-progress-strip {
      gap: 0.42rem;
    }

    .progress-row {
      gap: 0.42rem;
    }

    .top-frame-toggle-inline,
    .top-frame-toggle-collapsed,
    .top.top-shell.collapsed .top-frame-toggle {
      width: 32px;
      height: 32px;
    }
  }

  /* ===== Overrides v10 ===== */
  .top.top-shell {
    position: fixed;
    top: 0.55rem;
    left: 50%;
    right: auto;
    width: min(1580px, calc(100vw - 1.1rem));
    max-width: calc(100vw - 1rem);
    transform: translateX(-50%);
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0.45rem;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    box-sizing: border-box;
    transition: none;
  }

  .top-content {
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
  }

  .top-frame-toggle {
    flex: 0 0 auto;
    align-self: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--top-toggle-border, rgba(255,255,255,0.1));
    border-radius: 12px;
    background: var(--top-toggle-bg, rgba(255,255,255,0.05));
    color: var(--top-frame-toggle-text, #fff);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
    transition: background 0.1s linear, border-color 0.1s linear;
  }

  .top-frame-toggle:hover {
    background: var(--top-toggle-hover, rgba(255,255,255,0.09));
    border-color: var(--top-toggle-border, rgba(255,255,255,0.16));
  }

  .top-frame-toggle .chevron {
    font-size: 1rem;
    line-height: 1;
    transform: translateY(-1px);
  }

  .top.top-shell.collapsed {
    width: auto;
    max-width: none;
    padding: 0.32rem;
    border-radius: 999px;
    transform: translateX(-50%);
    opacity: 1;
    pointer-events: auto;
    box-shadow: 0 8px 20px rgba(0,0,0,0.28);
  }

  .top.top-shell.collapsed .top-content {
    display: none;
  }

  .top.top-shell.collapsed .top-frame-toggle {
    width: 38px;
    height: 38px;
    border-radius: 999px;
  }

  .control-block-transpose {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .control-block-transpose .control-label {
    width: 100%;
    display: block;
    margin: 0 auto 0.2rem;
    text-align: center;
  }

  .control-block-transpose .inline-slider-value {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
  }

  .control-block-transpose .control-range {
    max-width: 165px;
  }

  .top-kofi-inline {
    width: 36px;
    height: 36px;
    margin-left: 0;
    border-radius: 12px;
    background: var(--top-kofi-bg, linear-gradient(180deg, #67d2f7 0%, #45b9ea 100%));
    border: 1px solid var(--top-kofi-border, rgba(255,255,255,0.2));
    box-shadow: 0 4px 12px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.22);
    opacity: 0.9;
  }

  .top-kofi-inline:hover {
    opacity: 1;
    border-color: rgba(255,255,255,0.26);
    box-shadow: 0 7px 18px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.24);
  }

  .top-kofi-inline svg {
    width: 21px;
    height: 21px;
  }

  .top-kofi-inline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .top-kofi-inline svg {
    display: block;
  }

  @media (max-width: 980px) {
    .top.top-shell {
      width: calc(100vw - 0.9rem);
      max-width: calc(100vw - 0.9rem);
      top: 0.45rem;
      gap: 0.42rem;
      padding: 0.42rem;
    }

    .top-frame-toggle,
    .top-kofi-inline {
      width: 34px;
      height: 34px;
      border-radius: 11px;
    }
  }

  @media (max-width: 620px) {
    .top.top-shell {
      width: calc(100vw - 0.7rem);
      max-width: calc(100vw - 0.7rem);
      top: 0.35rem;
      gap: 0.35rem;
      padding: 0.35rem;
      border-radius: 15px;
    }

    .top.top-shell.collapsed {
      padding: 0.28rem;
    }

    .top-frame-toggle,
    .top.top-shell.collapsed .top-frame-toggle {
      width: 32px;
      height: 32px;
    }

    .top-kofi-inline {
      width: 32px;
      height: 32px;
      border-radius: 11px;
    }

    .top-kofi-inline svg {
      width: 18px;
      height: 18px;
    }
  }

/* ===== Perf tune ===== */
.top.top-shell,
.top.top-shell *,
.top-frame-toggle,
.top-kofi-inline {
  will-change: auto;
}

.top-content,
.top-row,
.top-group,
.top-progress-strip,
.top-progress-side-controls {
  backface-visibility: hidden;
}

.midi-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--loading-bg);
  backdrop-filter: blur(8px);
}

.midi-loading-card {
  width: min(88vw, 290px);
  padding: 18px 18px 16px;
  border-radius: 20px;
  border: 1px solid var(--loading-card-border);
  background: var(--loading-card-bg);
  box-shadow:
    none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.midi-loading-spinner {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 3px solid var(--loading-spinner-track);
  border-top-color: var(--loading-accent-a);
  border-right-color: var(--loading-accent-b);
  animation: midi-overlay-spin 0.9s linear infinite;
}

.midi-loading-name {
  max-width: 100%;
  padding: 0 2px;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--loading-name-color, rgba(255,255,255,0.92));
  line-height: 1.35;
  overflow-wrap: anywhere;
}


.midi-loading-pixels {
  display: inline-flex;
  align-items: flex-end;
  gap: 5px;
  height: 34px;
}

.midi-loading-pixel {
  width: 10px;
  height: 10px;
  background: var(--loading-accent-a);
  box-shadow: 0 0 0 2px rgba(0,0,0,0.38);
  image-rendering: pixelated;
  animation: pixel-load-step 0.72s steps(1, end) infinite;
}

.midi-loading-pixel.pixel-b {
  background: var(--loading-accent-b);
  animation-delay: 0.18s;
}

.midi-loading-pixel.pixel-c {
  background: color-mix(in srgb, var(--loading-accent-a) 72%, var(--loading-accent-b));
  animation-delay: 0.36s;
}

@keyframes pixel-load-step {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  33% { transform: translateY(-10px); opacity: 1; }
  66% { transform: translateY(-4px); opacity: 0.82; }
}

html.theme-classic body {
  background: #111 !important;
}

html.theme-classic body::before {
  content: none;
}

html.theme-classic .white {
  background: #fff;
}

html.theme-classic .black {
  background: #000;
}


html.theme-night body {
  background:
    linear-gradient(180deg, #02040a 0%, #040814 34%, #07101d 68%, #02050b 100%) !important;
}

html.theme-night body::before {
  content: none;
}

html.theme-night .white {
  background: linear-gradient(180deg, #fdfefe 0%, #e9f2ff 100%);
  border-color: #10203f;
  box-shadow: inset 0 0 14px rgba(255,255,255,0.2), 0 0 14px rgba(148,188,255,0.08);
}

html.theme-night .black {
  background: linear-gradient(180deg, #102349 0%, #040914 100%);
  border: 1px solid rgba(168,199,255,0.26);
  box-shadow: 0 0 14px rgba(112,152,255,0.1);
}

html.theme-night .active.white {
  background: linear-gradient(180deg, #c8d5ea 0%, #8ea6c9 100%) !important;
  border-color: #55749d !important;
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.14), inset 0 10px 18px rgba(0,0,0,0.18), 0 0 14px rgba(148,188,255,0.18) !important;
}

html.theme-night .active.black {
  background: linear-gradient(180deg, #d6e5ff 0%, #78aaff 100%) !important;
  box-shadow: 0 0 20px rgba(172,204,255,0.76), 0 0 34px rgba(92,129,255,0.28), inset 0 0 9px rgba(255,255,255,0.26) !important;
}

.night-sky-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  visibility: hidden;
  transition: opacity 80ms linear, visibility 0s linear 80ms;
  contain: strict;
}

.night-sky-overlay.is-visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 80ms linear, visibility 0s linear 0s;
}

.night-sky-overlay:not(.is-visible) .night-star {
  animation-play-state: paused;
}

.night-sky-gradient,
.night-stars-layer {
  position: absolute;
  inset: 0;
}

.night-sky-gradient {
  background:
    linear-gradient(180deg, rgba(8,12,22,0.05) 0%, rgba(5,9,18,0.02) 40%, rgba(0,0,0,0.18) 100%);
}

.night-stars-layer {
  contain: layout paint style;
}

.night-sky-overlay:not(.is-visible) .night-stars-layer {
  opacity: 0;
}

.night-star {
  position: absolute;
  border-radius: 999px;
  background: rgba(255,255,255,0.94);
  opacity: 0.7;
  will-change: opacity;
  animation: night-star-twinkle ease-in-out infinite;
}

.night-star.star-cold {
  background: rgba(207,229,255,0.96);
}

.night-star.star-dim {
  background: rgba(255,255,255,0.66);
}

@keyframes night-star-twinkle {
  0%, 100% { opacity: 0.26; }
  30% { opacity: 0.9; }
  58% { opacity: 0.42; }
  78% { opacity: 0.82; }
}

html.theme-candy body {
  background: linear-gradient(180deg, #ffb7d8 0%, #ff85bd 44%, #7b234f 100%) !important;
}

html.theme-candy body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.4;
  background:
    radial-gradient(circle at 12% 24%, rgba(255,255,255,0.34) 0 13px, transparent 14px),
    radial-gradient(circle at 78% 18%, rgba(255,240,248,0.28) 0 11px, transparent 12px),
    radial-gradient(circle at 32% 13%, rgba(255,255,255,0.22) 0 7px, transparent 8px),
    radial-gradient(circle at 58% 28%, rgba(255,255,255,0.18) 0 9px, transparent 10px);
  background-size: 260px 180px, 280px 190px, 210px 150px, 240px 170px;
}

html.theme-candy .white {
  background: linear-gradient(180deg, #fffefe 0%, #ffeef6 100%);
  border-color: #ff8fc1;
}

html.theme-candy .black {
  background: linear-gradient(180deg, #ff8fbe 0%, #ff4f96 100%);
  border: 1px solid rgba(255,255,255,0.55);
}

html.theme-candy .active.white {
  background: linear-gradient(180deg, #ffd7e9 0%, #ffb3d2 100%) !important;
  box-shadow: 0 0 18px rgba(255,255,255,0.72), inset 0 0 10px rgba(255,74,149,0.22) !important;
}

html.theme-candy .active.black {
  box-shadow: 0 0 16px rgba(255,143,193,0.76), inset 0 0 8px rgba(255,255,255,0.24) !important;
}

html.theme-neon body {
  background:
    radial-gradient(circle at 50% 0%, rgba(255,64,214,0.09) 0%, transparent 26%),
    radial-gradient(circle at 50% 100%, rgba(0,255,255,0.08) 0%, transparent 32%),
    linear-gradient(180deg, #05070d 0%, #020308 58%, #010104 100%) !important;
}

html.theme-neon body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.88;
  background:
    radial-gradient(circle at 14% 18%, rgba(0,255,255,0.1) 0 0, transparent 18%),
    radial-gradient(circle at 86% 14%, rgba(255,64,214,0.1) 0 0, transparent 18%),
    radial-gradient(circle at 50% 78%, rgba(0,255,255,0.08) 0 0, transparent 26%),
    linear-gradient(180deg, rgba(255,255,255,0.02), transparent 34%, rgba(255,255,255,0.01) 72%, transparent 100%);
}

html.theme-neon body::after {
  content: none;
}

html.theme-neon .white {
  background: linear-gradient(180deg, #0b1120 0%, #04070f 100%);
  border-color: rgba(70,245,255,0.46);
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.03),
    0 0 8px rgba(0,255,255,0.05);
}

html.theme-neon .black {
  background: linear-gradient(180deg, #16051d 0%, #060109 100%);
  border: 1px solid rgba(255,86,230,0.42);
  box-shadow:
    0 0 8px rgba(255,64,214,0.06),
    inset 0 0 6px rgba(255,255,255,0.025);
}

html.theme-neon .label,
html.theme-neon .white .label,
html.theme-neon .black .label {
  color: #f7fbff !important;
  text-shadow:
    0 0 8px rgba(255,255,255,0.3),
    0 0 12px rgba(0,255,255,0.2);
}

html.theme-neon .active.white {
  background: linear-gradient(180deg, #8afff8 0%, #17dfff 100%) !important;
  border-color: rgba(238,255,255,0.98) !important;
  box-shadow:
    0 0 18px rgba(0,255,255,0.46),
    0 0 34px rgba(0,255,255,0.16),
    inset 0 0 10px rgba(255,255,255,0.16) !important;
}

html.theme-neon .active.black {
  background: linear-gradient(180deg, #ff8ef1 0%, #b653ff 100%) !important;
  border-color: rgba(255,232,248,0.9) !important;
  box-shadow:
    0 0 18px rgba(255,64,214,0.42),
    0 0 34px rgba(176,79,255,0.16),
    inset 0 0 10px rgba(255,255,255,0.14) !important;
}

html.theme-neon .top.top-shell {
  box-shadow:
    0 0 0 1px rgba(0,255,255,0.1),
    0 0 20px rgba(0,255,255,0.06),
    0 0 30px rgba(255,64,214,0.05);
}

html.theme-monochrome body {
  background: linear-gradient(180deg, #0d0d0d 0%, #050505 100%) !important;
}

html.theme-monochrome body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.2;
  background: linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(0,0,0,0.12) 100%);
}

html.theme-monochrome body::after {
  content: none;
}

.monochrome-film-grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  opacity: 0;
  background-image: url("data:image/png;base64,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");
  background-size: 220px 220px;
  background-repeat: repeat;
}

.monochrome-film-grain.is-visible {
  opacity: 0.14;
}

html.theme-monochrome .top.top-shell,
html.theme-monochrome .library-menu,
html.theme-monochrome .midi-loading-card {
  filter: grayscale(1) contrast(1.05) saturate(0);
}

html.theme-monochrome canvas,
html.theme-monochrome .piano {
  filter: none;
}

html.theme-monochrome .white {
  background: linear-gradient(180deg, #f6f6f6 0%, #cecece 100%);
  border-color: #080808;
}

html.theme-monochrome .black {
  background: linear-gradient(180deg, #252525 0%, #000000 100%);
  border: 1px solid rgba(255,255,255,0.18);
}

html.theme-monochrome .active.white {
  background: linear-gradient(180deg, #d8d8d8 0%, #ababab 100%) !important;
  box-shadow: inset 0 -6px 10px rgba(0,0,0,0.14) !important;
}

html.theme-monochrome .active.black {
  background: linear-gradient(180deg, #9a9a9a 0%, #4d4d4d 100%) !important;
  box-shadow: inset 0 -6px 10px rgba(0,0,0,0.18) !important;
}



.theme-pixelated html,
html.theme-pixelated,
html.theme-pixelated body {
  image-rendering: pixelated;
}

html.theme-pixelated body,
html.theme-pixelated select,
html.theme-pixelated button,
html.theme-pixelated input,
html.theme-pixelated .control-label,
html.theme-pixelated .progress-state,
html.theme-pixelated .status-pill,
html.theme-pixelated .midi-loading-name,
html.theme-pixelated .library-menu,
html.theme-pixelated .library-menu select,
html.theme-pixelated .library-menu button {
  font-family: "Courier New", "Lucida Console", monospace;
  letter-spacing: 0.01em;
}

html.theme-pixelated .top.top-shell,
html.theme-pixelated .top-group,
html.theme-pixelated .library-menu,
html.theme-pixelated .midi-loading-card {
  box-shadow: none !important;
  border-radius: 0 !important;
}

html.theme-pixelated .top.top-shell {
  background: #0f380f;
  border-bottom-width: 2px;
}

html.theme-pixelated .top-group {
  background: #102a12;
  border-width: 3px;
  background-image:
    repeating-linear-gradient(0deg, rgba(139,172,15,0.08) 0 2px, transparent 2px 4px),
    repeating-linear-gradient(90deg, rgba(139,172,15,0.05) 0 2px, transparent 2px 4px);
}

html.theme-pixelated .status-pill,
html.theme-pixelated .toggle-chip,
html.theme-pixelated .control-input,
html.theme-pixelated .top.top-shell select,
html.theme-pixelated .top.top-shell button,
html.theme-pixelated .value-badge,
html.theme-pixelated .library-menu button,
html.theme-pixelated .library-menu select,
html.theme-pixelated .midi-loading-card {
  border-radius: 0 !important;
  border-width: 2px !important;
  box-shadow: none !important;
}

html.theme-pixelated .control-input,
html.theme-pixelated .top.top-shell select,
html.theme-pixelated .library-menu select {
  background: #1a3a1a;
  color: #c7d68d;
  border-color: #8bac0f !important;
}

html.theme-pixelated .top.top-shell button,
html.theme-pixelated .library-menu button {
  background: #1a3a1a;
  color: #c7d68d;
  border-color: #8bac0f !important;
}

html.theme-pixelated .top.top-shell button.primary-action,
html.theme-pixelated .library-menu button:first-of-type {
  background: linear-gradient(180deg, #9bbc0f 0 50%, #8bac0f 50% 100%) !important;
  color: #0f380f;
  border-color: #0f380f !important;
  text-shadow: none;
}

html.theme-pixelated .top.top-shell button.primary-action.is-playing {
  background: linear-gradient(180deg, #306230 0 50%, #275227 50% 100%) !important;
  color: #c7d68d;
  border-color: #9bbc0f !important;
}

html.theme-pixelated .top.top-shell button:hover,
html.theme-pixelated .library-menu button:hover,
html.theme-pixelated .top.top-shell select:hover,
html.theme-pixelated .library-menu select:hover {
  filter: brightness(1.04);
}

html.theme-pixelated .status-pill,
html.theme-pixelated .toggle-chip,
html.theme-pixelated .value-badge {
  background: #1a3a1a;
  color: #c7d68d;
  border-color: #8bac0f !important;
}

html.theme-pixelated .control-label,
html.theme-pixelated .progress-state {
  color: #9bbc0f;
  text-shadow: none;
}

html.theme-pixelated .progress-state,
html.theme-pixelated .status-pill span,
html.theme-pixelated .midi-loading-name {
  text-transform: uppercase;
}

html.theme-pixelated .white,
html.theme-pixelated .black,
html.theme-pixelated .label {
  image-rendering: pixelated;
}

html.theme-pixelated .white {
  border-left-width: 3px;
  border-bottom-width: 3px;
  background: #9bbc0f;
  background-image: repeating-linear-gradient(0deg, rgba(202,220,159,0.28) 0 2px, rgba(15,56,15,0.06) 2px 4px);
  border-color: #0f380f;
}


html.theme-pixelated .black {
  border-width: 3px;
  border-bottom-width: 4px;
  background: #306230;
  background-image: repeating-linear-gradient(0deg, rgba(139,172,15,0.08) 0 2px, transparent 2px 4px);
  border-color: #0f380f;
}

html.theme-pixelated .active.white,
html.theme-pixelated .active.black {
  box-shadow: none !important;
}

html.theme-pixelated .active.white {
  background: #e0f8cf !important;
  background-image:
    repeating-linear-gradient(0deg, rgba(139,172,15,0.18) 0 2px, transparent 2px 4px),
    linear-gradient(180deg, #e0f8cf 0%, #b7d46a 100%) !important;
  border-color: #0f380f !important;
}

html.theme-pixelated .active.black {
  background: #e0f8cf !important;
  background-image:
    repeating-linear-gradient(0deg, rgba(139,172,15,0.2) 0 2px, transparent 2px 4px),
    linear-gradient(180deg, #e0f8cf 0%, #b7d46a 100%) !important;
  border-color: #0f380f !important;
  filter: none;
}

html.theme-pixelated .library-overlay,
html.theme-pixelated .midi-loading-overlay {
  background: rgba(15, 56, 15, 0.82) !important;
}

html.theme-pixelated .library-menu {
  background: #102a12;
  background-image: repeating-linear-gradient(0deg, rgba(139,172,15,0.06) 0 2px, transparent 2px 4px);
}

html.theme-pixelated .midi-loading-card {
  background: #102a12;
  background-image: repeating-linear-gradient(0deg, rgba(139,172,15,0.06) 0 2px, transparent 2px 4px);
  padding: 16px 18px 14px;
}

html.theme-pixelated .midi-loading-spinner {
  border-radius: 0;
  border-width: 4px;
}

html.theme-pixelated .top.top-shell input[type="range"]::-webkit-slider-thumb,
html.theme-pixelated .transpose-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 0 !important;
  background: #9bbc0f;
  border: 2px solid #0f380f;
  box-shadow: none;
  cursor: pointer;
}

html.theme-pixelated .top.top-shell input[type="range"]::-moz-range-thumb,
html.theme-pixelated .transpose-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 0 !important;
  background: #9bbc0f;
  border: 2px solid #0f380f;
  box-shadow: none;
  cursor: pointer;
}

html.theme-pixelated .top.top-shell input[type="range"]::-webkit-slider-runnable-track,
html.theme-pixelated .transpose-slider::-webkit-slider-runnable-track {
  border-radius: 0 !important;
}

html.theme-pixelated .top.top-shell input[type="range"]::-moz-range-track,
html.theme-pixelated .transpose-slider::-moz-range-track {
  border-radius: 0 !important;
}

html.theme-pixelated .top-frame-toggle,
html.theme-pixelated .top-frame-toggle:hover {
  border-radius: 0 !important;
}

html.theme-pixelated .top-kofi-inline {
  border-radius: 0 !important;
  background: #1a3a1a !important;
  border: 2px solid #8bac0f !important;
  box-shadow: none !important;
  padding: 0 !important;
  width: 36px !important;
  height: 36px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  image-rendering: pixelated;
}

html.theme-pixelated .top-kofi-inline svg {
  width: 23px !important;
  height: 23px !important;
  display: block !important;
}

html.theme-pixelated .top-kofi-inline .pixel-kofi-outline {
  fill: #0f380f !important;
}

html.theme-pixelated .top-kofi-inline .pixel-kofi-body {
  fill: #c7d68d !important;
}

html.theme-pixelated .top-kofi-inline .pixel-kofi-coffee {
  fill: #8bac0f !important;
}

html.theme-pixelated .top-kofi-inline .pixel-kofi-heart {
  fill: #306230 !important;
}

html.theme-pixelated .top-kofi-inline svg {
  shape-rendering: crispEdges;
  image-rendering: pixelated;
}

html.theme-pixelated .top-kofi-inline path,
html.theme-pixelated .top-kofi-inline circle {
  filter: none !important;
}

html.theme-pixelated .top-kofi-inline .pixel-kofi-body {
  fill: #c7d68d !important;
}

html.theme-pixelated .top-kofi-inline .pixel-kofi-coffee {
  fill: #8bac0f !important;
}

html.theme-pixelated .top-kofi-inline .pixel-kofi-heart {
  fill: #306230 !important;
}

html.theme-pixelated .top-kofi-inline:hover {
  background: #275227 !important;
  transform: none !important;
}

html.theme-pixelated body,
html.theme-pixelated .top.top-shell,
html.theme-pixelated .library-menu,
html.theme-pixelated .midi-loading-card {
  text-shadow: 1px 1px 0 rgba(8,24,32,0.65);
}

html.theme-pixelated body {
  background:
    linear-gradient(180deg, #0f380f 0%, #081820 100%) !important;
}

html.theme-pixelated body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.28;
  background:
    repeating-linear-gradient(0deg, rgba(155,188,15,0.16) 0 2px, transparent 2px 6px),
    repeating-linear-gradient(90deg, rgba(48,98,48,0.18) 0 2px, transparent 2px 6px),
    linear-gradient(180deg, rgba(155,188,15,0.05) 0%, rgba(8,24,32,0.16) 100%);
}

html.theme-pixelated canvas,
html.theme-pixelated .piano {
  z-index: 1;
}

html.theme-pixelated canvas {
  image-rendering: pixelated;
}

@keyframes midi-overlay-spin {
  to { transform: rotate(360deg); }
}

`}</style>

  {isMidiLoading && (
    <div
      className="midi-loading-overlay"
      style={loadingOverlayStyle}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={midiLoadingDisplay ? `Loading ${midiLoadingDisplay}` : "Loading MIDI"}
    >
      <div className="midi-loading-card">
        {isPixelated ? (
          <div className="midi-loading-pixels" aria-hidden="true">
            <span className="midi-loading-pixel pixel-a" />
            <span className="midi-loading-pixel pixel-b" />
            <span className="midi-loading-pixel pixel-c" />
          </div>
        ) : (
          <div className="midi-loading-spinner" aria-hidden="true" />
        )}
        <div className="midi-loading-name">{midiLoadingDisplay}</div>
      </div>
    </div>
  )}

  {showLibrary && (
    <div className="library-overlay" onClick={closeLibrary} style={libraryThemeStyle}>
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
            handleFile(file);
            e.target.value = "";
          }}
        />

        {/* 4) Sélecteur de la bibliothèque */}
        <select
          defaultValue=""
          disabled={isMidiLoading}
          onChange={e => {
            loadDemo(e.target.value);
            e.target.value = "";
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

  <div className={`top top-shell${isBarCollapsed ? " collapsed" : ""}`} style={topBarThemeStyle}>
    {isBarCollapsed ? (
      <button
        className="top-frame-toggle top-frame-toggle-collapsed"
        onClick={() => setIsBarCollapsed(false)}
        aria-label="Show options"
      >
        <span className="chevron">▼</span>
      </button>
    ) : (
      <div className="top-content">
        <div className="top-row">
        <div className="top-group top-group-status">
          <div
            className="status-pill"
            title={midiConnected ? "MIDI keyboard connected" : "No MIDI keyboard connected"}
          >
            <img src={midiConnected ? "/midi_on.png" : "/midi_off.png"} width={24} height={24} />
            <span>{midiConnected ? "MIDI connected" : "No MIDI"}</span>
          </div>

          <div className="control-block">
            <span className="control-label">Theme</span>
            <select value={theme} onChange={e => setTheme(e.target.value)} className="control-input">
              {(() => { const keys = Object.keys(THEMES); return [keys[0], "Pixelated", ...keys.filter(t => t !== keys[0] && t !== "Pixelated")]; })().map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="control-block control-block-wide">
            <span className="control-label">Instrument</span>
            <select value={instrument} onChange={e => setInstrument(e.target.value)} className="control-input">
              {(isPixelated ? PIXEL_INSTRUMENTS : Object.keys(INSTR)).map(i => <option key={i}>{getDisplayInstrumentName(i)}</option>)}
            </select>
          </div>
        </div>

        <div className="top-group top-group-controls">
          <label className="toggle-chip">
            <input type="checkbox" checked={sustain} onChange={e => setSustain(e.target.checked)} />
            <span>Sustain</span>
          </label>

          <div className="control-block control-block-slider">
            <span className="control-label">Volume</span>
            <input
              type="range"
              min="0"
              max="500"
              value={volume}
              onChange={e => setVolume(+e.target.value)}
              className="slider volume-slider control-range"
            />
          </div>

          <div className="control-block control-block-slider control-block-transpose">
            <span className="control-label">Transpose</span>
            <div className="inline-slider-value">
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={transpose}
                onChange={e => setTranspose(+e.target.value)}
                className="transpose-slider control-range"
              />
              <span className="value-badge">{transpose > 0 ? "+" : ""}{transpose}</span>
            </div>
          </div>
        </div>

        <div className="top-group top-group-actions">
          <div className="action-buttons">
            <button
              className={`primary-action${playing ? " is-playing" : ""}${(!midiData && !isMidiLoading) ? " is-inactive" : ""}`}
              onClick={togglePlay}
              disabled={!midiData}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button onClick={openLibrary} disabled={isMidiLoading}>Load…</button>
            <button onClick={unloadMidi} disabled={!midiData}>Clear</button>
          </div>
        </div>

        <div className="top-progress-strip">
          <div className="top-group top-group-progress">
            <div className="progress-row">
              <div className="control-block control-block-progress">
                <div className="progress-label-row">
                  <span className="control-label">Track</span>
                  <span className="progress-state">
                    {midiData ? (playing ? "Playing" : "Ready") : "No MIDI loaded"}
                  </span>
                </div>
                <input
                  ref={progressInputRef}
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  defaultValue={0}
                  onInput={e => onScrub(e.currentTarget.valueAsNumber)}
                  onChange={e => onScrub(e.currentTarget.valueAsNumber)}
                  onPointerDown={beginScrub}
                  onPointerMove={moveScrub}
                  onPointerUp={endScrub}
                  onPointerCancel={endScrub}
                  disabled={!midiData}
                  className="slider progress-slider control-range progress-wide progress-compact"
                />
              </div>
            </div>
          </div>

          <div className="top-progress-side-controls">
            <div className="top-progress-kofi-slot">
              <a
                href="https://ko-fi.com/pianovisual"
                target="_blank"
                rel="noopener"
                className="kofi-link top-kofi-inline"
                title="Support me on Ko-fi"
                aria-label="Support me on Ko-fi"
              >
                {isPixelated ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect className="pixel-kofi-outline" x="4" y="5" width="12" height="1" />
                    <rect className="pixel-kofi-outline" x="3" y="6" width="14" height="1" />
                    <rect className="pixel-kofi-outline" x="3" y="7" width="14" height="14" />
                    <rect className="pixel-kofi-body" x="4" y="7" width="12" height="13" />
                    <rect className="pixel-kofi-coffee" x="5" y="10" width="9" height="9" />
                    <rect className="pixel-kofi-outline" x="16" y="10" width="3" height="1" />
                    <rect className="pixel-kofi-outline" x="18" y="11" width="1" height="6" />
                    <rect className="pixel-kofi-outline" x="16" y="17" width="3" height="1" />
                    <rect className="pixel-kofi-body" x="17" y="11" width="1" height="6" />
                    <rect className="pixel-kofi-heart" x="8" y="11" width="1" height="1" />
                    <rect className="pixel-kofi-heart" x="11" y="11" width="1" height="1" />
                    <rect className="pixel-kofi-heart" x="7" y="12" width="6" height="1" />
                    <rect className="pixel-kofi-heart" x="8" y="13" width="4" height="1" />
                    <rect className="pixel-kofi-heart" x="9" y="14" width="2" height="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 64 64" aria-hidden="true">
                    <path
                      d="M11 20h33.5c3.1 0 5.5 2.4 5.5 5.5V38c0 10.4-8.4 18-18.8 18H18.2C15.3 56 13 53.7 13 50.8V22c0-1.1.9-2 2-2Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M46 27h4.7c5.7 0 10.3 4.6 10.3 10.3S56.4 47.6 50.7 47.6H46v-5.2h4.1c2.8 0 5.1-2.3 5.1-5.1s-2.3-5.1-5.1-5.1H46V27Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M26.8 43.2c-.7 0-1.4-.3-1.9-.8l-4.3-4.1c-2.1-2-2.3-5.2-.4-7.4 1.8-2.1 4.9-2.4 7.1-.7 2.2-1.7 5.4-1.4 7.1.7 1.9 2.2 1.7 5.4-.4 7.4l-4.3 4.1c-.5.5-1.2.8-1.9.8Z"
                      fill={isBadApple ? "#000000" : "#ff5b7f"}
                      transform="translate(1.5 0)"
                    />
                  </svg>
                )}
              </a>
            </div>

            <div className="top-progress-toggle-slot">
              <button
                className="top-frame-toggle top-frame-toggle-inline"
                onClick={() => setIsBarCollapsed(true)}
                aria-label="Hide options"
               
              >
                <span className="chevron">▲</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    )}
  </div>

  <div className={`night-sky-overlay${isNight ? " is-visible" : ""}`} aria-hidden="true">
    <div className="night-sky-gradient" />
    <div className="night-stars-layer">
      {nightStars.map((star) => (
        <span
          key={star.id}
          className={`night-star ${star.hue}`.trim()}
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animationDuration: star.duration,
            animationDelay: star.delay
          }}
        />
      ))}
    </div>
  </div>

  <div className={`monochrome-film-grain${isMonochrome ? " is-visible" : ""}`} aria-hidden="true" />

  <canvas ref={canvasRef}></canvas>

  <div className="piano" ref={pianoRef} onPointerDown={pDown} onPointerMove={pMove} onPointerUp={pUp} onPointerCancel={pUp} onLostPointerCapture={pUp}>{keys}</div>
  
  </>);
}