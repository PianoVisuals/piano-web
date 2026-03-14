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

  "Ocean":        { bg: "#002b36",  barW: "rgba(38,139,210,0.7)",  barB: "rgba(7,54,66,0.7)",     actW: "#268bd2", actB: "#073642" },
  "Forest":       { bg: "#1b2f24",  barW: "rgba(133,193,85,0.7)",  barB: "rgba(42,92,47,0.7)",    actW: "#85c155", actB: "#2a5c2f" },
  "Sunset":       { bg: "#3e1f47",  barW: "rgba(255,94,77,0.7)",   barB: "rgba(255,188,117,0.7)", actW: "#ff5e4d", actB: "#ffbc75" },
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
const MIDI_SUSTAIN_EXTRA = 0.45; // extra hold for imported MIDI playback when sustain is enabled
const makeSampler = name => new Tone.Sampler({ urls: URLS, release: 1, baseUrl: `${BASE}${INSTR[name]}-mp3/` });

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
  const [instrument,setInstrument]=useState("Grand Piano");
  const [theme,setTheme]=useState("Classic");
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

  const currentTheme = THEMES[theme] ?? THEMES.Classic;
  const midiLoadingDisplay = (midiLoadingText || "MIDI")
    .replace(/^Chargement de\s*/i, "")
    .replace(/\s*[….]+$/u, "")
    .trim() || "MIDI";
  const loadingOverlayStyle = useMemo(() => ({
    "--loading-bg": withAlpha(currentTheme.bg, 0.62),
    "--loading-card-bg": withAlpha(currentTheme.bg, 0.95),
    "--loading-card-border": withAlpha(currentTheme.actW, 0.18),
    "--loading-accent-a": currentTheme.actW,
    "--loading-accent-b": currentTheme.actB,
    "--loading-spinner-track": "rgba(255,255,255,0.12)",
  }), [currentTheme]);

  const topBarThemeStyle = useMemo(() => ({
    "--top-shell-bg": withAlpha(currentTheme.bg, 0.96),
    "--top-shell-border": withAlpha(currentTheme.actW, 0.16),
    "--top-shell-shadow": withAlpha(currentTheme.bg, 0.34),
    "--top-group-bg": `linear-gradient(180deg, ${withAlpha(currentTheme.bg, 0.88)} 0%, ${withAlpha(currentTheme.bg, 0.82)} 100%)`,
    "--top-group-border": withAlpha(currentTheme.actW, 0.18),
    "--top-status-bg": withAlpha(currentTheme.actW, 0.08),
    "--top-status-border": withAlpha(currentTheme.actW, 0.18),
    "--top-control-bg": withAlpha(currentTheme.actW, 0.10),
    "--top-control-hover": withAlpha(currentTheme.actW, 0.14),
    "--top-control-border": withAlpha(currentTheme.actW, 0.18),
    "--top-toggle-bg": withAlpha(currentTheme.actW, 0.08),
    "--top-toggle-hover": withAlpha(currentTheme.actW, 0.14),
    "--top-toggle-border": withAlpha(currentTheme.actW, 0.18),
    "--top-button-bg": withAlpha(currentTheme.actW, 0.10),
    "--top-button-hover": withAlpha(currentTheme.actW, 0.16),
    "--top-button-border": withAlpha(currentTheme.actW, 0.20),
    "--top-play-bg": `linear-gradient(135deg, ${currentTheme.actW} 0%, ${currentTheme.actB} 100%)`,
    "--top-play-hover": `linear-gradient(135deg, ${withAlpha(currentTheme.actW, 0.92)} 0%, ${withAlpha(currentTheme.actB, 0.92)} 100%)`,
    "--top-play-border": withAlpha(currentTheme.actW, 0.42),
    "--top-focus-ring": withAlpha(currentTheme.actW, 0.24),
    "--top-value-bg": withAlpha(currentTheme.actW, 0.10),
    "--top-value-border": withAlpha(currentTheme.actW, 0.18),
    "--top-label-color": withAlpha(currentTheme.actW, 0.82),
    "--top-progress-text": withAlpha("#ffffff", 0.86),
    "--top-range-accent": currentTheme.actW,
    "--top-range-track": withAlpha("#ffffff", 0.18),
  }), [currentTheme]);

  const libraryThemeStyle = useMemo(() => ({
    "--library-overlay-bg": withAlpha(currentTheme.bg, 0.62),
    "--library-card-bg": withAlpha(currentTheme.bg, 0.95),
    "--library-card-border": withAlpha(currentTheme.actW, 0.18),
    "--library-title-color": withAlpha("#ffffff", 0.96),
    "--library-text-color": withAlpha("#ffffff", 0.94),
    "--library-muted": withAlpha("#ffffff", 0.72),
    "--library-control-bg": withAlpha(currentTheme.actW, 0.10),
    "--library-control-hover": withAlpha(currentTheme.actW, 0.16),
    "--library-control-border": withAlpha(currentTheme.actW, 0.20),
    "--library-accent-bg": `linear-gradient(135deg, ${currentTheme.actW} 0%, ${currentTheme.actB} 100%)`,
    "--library-accent-hover": `linear-gradient(135deg, ${withAlpha(currentTheme.actW, 0.92)} 0%, ${withAlpha(currentTheme.actB, 0.92)} 100%)`,
    "--library-accent-border": withAlpha(currentTheme.actW, 0.40),
    "--library-focus-ring": withAlpha(currentTheme.actW, 0.24),
    "--library-select-accent": currentTheme.actW,
  }), [currentTheme]);

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
  const themeVisualRef = useRef({
    barWhite: currentTheme.barW,
    barBlack: currentTheme.barB,
    activeWhite: currentTheme.actW,
    activeBlack: currentTheme.actB,
  });

  const VISUAL_FRAME_MS = 1000 / 45;

  const commitProgress = (next) => {
    const clamped = Math.max(0, Math.min(next, 1));
    progressRef.current = clamped;
    const input = progressInputRef.current;
    if (input && (!isScrubbingRef.current || document.activeElement !== input)) {
      input.value = String(clamped);
    }
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

  const queueVisualFrame = () => {
    if (visualRafRef.current != null) return;
    visualRafRef.current = requestAnimationFrame((now) => {
      visualRafRef.current = null;

      const hasActiveInteraction =
        playingRef.current ||
        isScrubbingRef.current ||
        kbdSet.current.size > 0 ||
        pointerMap.current.size > 0;

      if (now - visualFrameTimeRef.current < VISUAL_FRAME_MS) {
        if (hasActiveInteraction) {
          queueVisualFrame();
        } else {
          drawBars();
        }
        return;
      }

      visualFrameTimeRef.current = now;

      if (playingRef.current && durationRef.current && !isScrubbingRef.current) {
        const t = Tone.Transport.seconds;
        commitProgress(transportSecondsToProgress(t));
      }

      drawBars();

      if (hasActiveInteraction) {
        queueVisualFrame();
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
  useEffect(()=>{
    const c = THEMES[theme];
    Object.entries({bg:c.bg,"bar-w":c.barW,"bar-b":c.barB,"act-w":c.actW,"act-b":c.actB}).forEach(([k,v])=>document.documentElement.style.setProperty(`--${k}`,v));
    themeVisualRef.current = {
      barWhite: c.barW,
      barBlack: c.barB,
      activeWhite: c.actW,
      activeBlack: c.actB,
    };
    queueVisualFrame();
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
    synthRef.current.release = sustain ? LONG_REL : 1;queueVisualFrame();return()=>synthRef.current?.dispose();},[instrument]);
  useEffect(()=>{
    sustainRef.current = sustain;
    if(synthRef.current){
      synthRef.current.volume.value=Tone.gainToDb(volume/100);
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
          visualNotes.push({
            time: n.time + LEAD,
            duration: n.duration,
            midi: transposedMidi
          });
        }
      })
    );

    visualNotes.sort((a, b) => a.time - b.time);
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
  const togglePlay = () => {
    if (!midiDataRef.current) return;

    if (!playingRef.current) {
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
  const MAX_VISIBLE_BARS = 500;

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

    const { width: W, height: H, pianoTop } = canvasMetricsRef.current;
    ctx.clearRect(0, 0, W, H);

    const path = pianoTop;
    const t = Tone.Transport.seconds;
    const { barWhite, barBlack } = themeVisualRef.current;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, pianoTop);
    ctx.clip();

    const pressedMidis = [
      ...kbdSet.current,
      ...Array.from(pointerMap.current.values())
    ];

    if (!midiDataRef.current && pressedMidis.length > 0) {
      for (const midi of pressedMidis) {
        const meta = keyMetaRef.current.get(midi);
        if (!meta) continue;

        const barWidth = meta.width * 0.9;
        const x = meta.left + (meta.width - barWidth) / 2;
        const yBottom = pianoTop;
        const yTop = 0;
        const baseColor = meta.isWhite ? barWhite : barBlack

        const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(1, "rgba(255,255,255,0)");

        ctx.shadowColor = "transparent";
        ctx.globalAlpha = 0.78;
        ctx.fillStyle = grad;
        ctx.fillRect(x, yTop, barWidth, yBottom);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
      return;
    }

    if (midiDataRef.current) {
      const visualNotes = visualNotesRef.current;
      const visibleUntil = t + LEAD;
      const visibleFrom = t - visualMaxDurationRef.current;
      let lo = 0;
      let hi = visualNotes.length;

      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (visualNotes[mid].time < visibleFrom) lo = mid + 1;
        else hi = mid;
      }

      let visibleCount = 0;
      for (let i = lo; i < visualNotes.length; i++) {
        const n = visualNotes[i];
        if (n.time > visibleUntil) break;
        if (n.time + n.duration < t) continue;
        visibleCount += 1;
        if (visibleCount > MAX_VISIBLE_BARS) break;

        const meta = keyMetaRef.current.get(n.midi);
        if (!meta) continue;

        const remaining = n.time - t;
        const barWidth = meta.width * 0.9;
        const x = meta.left + (meta.width - barWidth) / 2;
        const yBottom = (1 - remaining / LEAD) * path;
        const barHeight = n.duration * (path / LEAD);
        const yTop = yBottom - barHeight;

        const baseColor = meta.isWhite ? barWhite : barBlack

        const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
        grad.addColorStop(0, baseColor);
        grad.addColorStop(1, "rgba(255,255,255,0.2)");

        ctx.globalAlpha = 0.9;

        const radius = Math.min(barWidth / 2, barHeight / 2, 8);
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(x, yTop, barWidth, barHeight, radius);
        } else {
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
        }

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = borderColor;
        ctx.stroke();

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
    font-weight: 700;
  }

  .library-menu button:first-of-type:hover {
    background: var(--library-accent-hover, linear-gradient(135deg, #5872ff 0%, #8094ff 100%));
  }

  .library-menu select {
    appearance: none;
    accent-color: var(--library-select-accent, #5b8cff);
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
    transition: background 0.12s linear, color 0.12s linear;
  }

  /* Appliquer une transition sur les barres et les éléments actifs */
  .bar, .active-note, .top {
    transition: background 0.12s linear, color 0.12s linear, border-color 0.12s linear;
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
    color: #fff;
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
    color: #eef2fa;
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
    color: #fff;
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
    color: #fff;
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
    color: #fff;
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
    color: #fff;
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
  }

  .top.top-shell button.primary-action:hover {
    background: var(--top-play-hover, linear-gradient(135deg, #5872ff 0%, #8094ff 100%));
  }

  .top.top-shell button.primary-action.is-playing {
    background: linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.07) 100%);
    border-color: rgba(255,255,255,0.14);
    color: rgba(255,255,255,0.96);
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
    color: rgba(255,255,255,0.52);
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
    color: #fff;
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
    background: linear-gradient(180deg, #67d2f7 0%, #45b9ea 100%);
    border: 1px solid rgba(255,255,255,0.2);
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
  color: rgba(255,255,255,0.92);
  line-height: 1.35;
  overflow-wrap: anywhere;
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
        <div className="midi-loading-spinner" aria-hidden="true" />
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
        title="Afficher la barre"
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
              {Object.keys(THEMES).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="control-block control-block-wide">
            <span className="control-label">Instrument</span>
            <select value={instrument} onChange={e => setInstrument(e.target.value)} className="control-input">
              {Object.keys(INSTR).map(i => <option key={i}>{i}</option>)}
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
                    fill="#ff5b7f"
                    transform="translate(1.5 0)"
                  />
                </svg>
              </a>
            </div>

            <div className="top-progress-toggle-slot">
              <button
                className="top-frame-toggle top-frame-toggle-inline"
                onClick={() => setIsBarCollapsed(true)}
                aria-label="Hide options"
                title="Masquer la barre"
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

  <canvas ref={canvasRef}></canvas>

  <div className="piano" ref={pianoRef} onPointerDown={pDown} onPointerMove={pMove} onPointerUp={pUp} onPointerCancel={pUp} onLostPointerCapture={pUp}>{keys}</div>
  
  </>);
}