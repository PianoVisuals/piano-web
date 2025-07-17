// RhythmGame.jsx — Piano Tiles Rhythm Game with Difficulty Modes, Combo System, HP Bar Flash + Sound

import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

// Global animation styles (for menu and play)
const globalStyles = `
  @keyframes fall { from { transform: translateY(-100%); } to { transform: translateY(100vh); } }
  @keyframes fadeUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-50px); } }
`;

if (typeof document !== 'undefined' && !document.querySelector('meta[name=viewport]')) {
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
  document.head.appendChild(meta);
  const styleTag = document.createElement('style');
  styleTag.innerHTML = globalStyles;
  document.head.appendChild(styleTag);
}

// Ko-fi button style (menu only)
if (typeof document !== 'undefined' && !document.getElementById('kofi-style')) {
  const kofiStyle = document.createElement('style');
  kofiStyle.id = 'kofi-style';
  kofiStyle.innerHTML = `.kofi-mobile-button{position:fixed;bottom:0.5rem;right:1rem;width:100px;height:100px;background:url('https://cdn.ko-fi.com/cdn/kofi5.png?v=3') center center/contain no-repeat;opacity:0.7;transition:opacity .2s;z-index:1000;} .kofi-mobile-button:hover{opacity:1;}`;
  document.head.appendChild(kofiStyle);
}

/* ===== CONFIG ===== */
const SOUNDFONT = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/";
const NOTE_SOUNDS = { C4: "C4.mp3", D4: "D4.mp3", E4: "E4.mp3", F4: "F4.mp3" };
const BASE_COL = ["#ff7675","#ffeaa7","#55efc4","#74b9ff"];
const colorAt = i => BASE_COL[i % BASE_COL.length];
const FLASH_ALPHA = 0.9;
const DAMAGE = 20;
const HEAL_PER_HIT = 2;
const MAX_HP = 100;
const DIFFICULTIES = {
  Easy:    { lanes: 4, speed: 2400, interval: 650, hp: 100, multiplier: 1 },
  Normal:  { lanes: 6, speed: 2000, interval: 500, hp: 100, multiplier: 2 },
  Hard:    { lanes: 8, speed: 1500, interval: 400, hp: 100, multiplier: 4 },
  Harder:  { lanes: 10, speed: 1200, interval: 300, hp: 100, multiplier: 6 },
  Insane:  { lanes: 12, speed: 1200, interval: 300, hp: 100, multiplier: 8 }
};
const DIFF_NAMES = Object.keys(DIFFICULTIES);

export default function RhythmGame() {
  const [phase, setPhase] = useState("menu");
  const [diff, setDiff] = useState("Easy");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [notes, setNotes] = useState([]);
  const [hp, setHp] = useState(MAX_HP);
  const [flashRed, setFlashRed] = useState(false);
  const [comboEffects, setComboEffects] = useState([]);

  // Background notes in menu
  const [bgNotes, setBgNotes] = useState([]);
  const bgId = useRef(0);
  const bgTimer = useRef(null);

  const nextId = useRef(0);
  const spawnTimer = useRef(null);
  const audioSampler = useRef(null);
  const damageFx = useRef(null);
  const startTimeRef = useRef(null);

  const settings = DIFFICULTIES[diff];

  useEffect(() => {
    Tone.setContext(new Tone.Context({ latencyHint: "interactive" }));
    audioSampler.current = new Tone.Sampler({
      urls: NOTE_SOUNDS,
      baseUrl: SOUNDFONT + "acoustic_grand_piano-mp3/",
      release: 1,
      volume: 0
    }).toDestination();
    damageFx.current = new Tone.MembraneSynth({ volume: -6 }).toDestination();
  }, []);

  // Spawn background notes when in menu
  useEffect(() => {
    if (phase === 'menu') {
      const interval = settings.interval * 2;
      bgTimer.current = setInterval(() => {
        const cols = window.innerWidth <= 600 ? 6 : 10;
        const lane = Math.floor(Math.random() * cols);
        setBgNotes(arr => [...arr, { id: bgId.current++, lane, cols }]);
      }, interval);
    } else {
      clearInterval(bgTimer.current);
      setBgNotes([]);
    }
    return () => clearInterval(bgTimer.current);
  }, [phase, settings.interval]);

  const startGame = async () => {
    await Tone.start();
    const { lanes, interval, hp } = settings;
    setScore(0);
    setHp(hp);
    setCombo(0);
    setMaxCombo(0);
    setNotes([]);
    setFlashRed(false);
    setComboEffects([]);
    setPhase("play");
    startTimeRef.current = Date.now();
    spawnTimer.current = setInterval(() => {
      const now = Date.now();
      const lane = Math.floor(Math.random() * lanes);
      setNotes(n => [...n, { id: nextId.current++, lane, t0: now }]);
    }, interval);
  };

  const stopGame = () => {
    clearInterval(spawnTimer.current);
    setPhase("over");
  };

  const flashDamage = () => {
    setFlashRed(true);
    damageFx.current.triggerAttackRelease("C2", "8n");
    setTimeout(() => setFlashRed(false), 200);
  };

  const onHit = (note, e) => {
    e.stopPropagation();
    const NOTE_KEYS = Object.keys(NOTE_SOUNDS);
    const key = NOTE_KEYS[note.lane % NOTE_KEYS.length];
    audioSampler.current.triggerAttackRelease(key, "8n");
    setCombo(c => {
      const newCombo = c + 1;
      setMaxCombo(m => Math.max(m, newCombo));
      const points = settings.multiplier * newCombo;
      setScore(s => s + points);
      const effectId = Date.now()```
