// Background music (docs/ARCHITECTURE.md §6.3): a tiny step sequencer on Web Audio – note
// patterns and synthesised drums, one short loop per world (src/worlds/<id>/music.ts, its own
// lazy chunk, loaded with the world). Quiet by design, under the effects and the voice:
// - starts only after the first touch (browsers block sound before it), and only on a profile's
//   own screens (the map, games, the chest and the boss) – App sets the scene; the shared
//   screens (splash, "who is playing?", PIN, the editor) and lessons are silent;
// - the profile's "music" setting turns it off; its volume follows the profile's volume;
// - it ducks while the hero speaks (audio/speech.ts) and comes back after; while an explanation
//   runs in a round it drops very low (`holdMusic`), because then the child should listen;
// - it pauses when the app is in the background.
// Notes are scheduled a little ahead on the audio clock (a "lookahead" timer), so the beat stays
// steady even when the page is busy. window.__mathitMusic is a log for tests.
import { audioContext, onAudioUnlock, voice, type Tone } from './sfx';
import { onSpeaking } from './speech';

export type MusicVoice = 'pluck' | 'bell' | 'bass' | 'lead' | 'pad' | 'saw' | 'flute' | 'brass' | 'marimba' | 'chip';
export type DrumName = 'kick' | 'snare' | 'hat' | 'tom' | 'clap' | 'shaker';

export interface MusicPart {
  voice: MusicVoice;
  /** One token per step, space-separated: a note ("C4", "F#3", "Bb2") or "." (rest). */
  notes: string;
  /** How many steps each note lasts (default 1). */
  len?: number;
  /** 0..1, before the music's own (low) level. */
  vol: number;
}

export interface MusicLoop {
  bpm: number;
  /** Sixteenth-note steps in the loop (16 = one bar of 4/4). */
  steps: number;
  parts: MusicPart[];
  /** A line per drum: "x" = hit, "." = rest, one character per step. */
  drums?: Partial<Record<DrumName, string>>;
}

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C4" → 60, "F#3" → 54, "Bb2" → 46; null for a rest or anything else. */
export function noteMidi(token: string): number | null {
  const m = /^([A-G])([#b]?)(\d)$/.exec(token);
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export function midiFreq(m: number): number {
  return 440 * 2 ** ((m - 69) / 12);
}

/** The tokens of a part (for the sequencer and the tests). */
export function partTokens(p: MusicPart): string[] {
  return p.notes.trim().split(/\s+/);
}

/** One note of an instrument, as synth voices (sfx.ts plays them). */
export function voiceTones(v: MusicVoice, f: number, len: number, vol: number): Tone[] {
  switch (v) {
    case 'pluck':
      return [
        { wave: 'triangle', freq: f, at: 0, len: Math.min(len, 0.5), vol, attack: 0.004 },
        { wave: 'sine', freq: f * 2, at: 0, len: 0.08, vol: vol * 0.3, attack: 0.003 }
      ];
    case 'bell':
      return [
        { wave: 'sine', freq: f, at: 0, len: Math.max(len, 0.6), vol, attack: 0.004 },
        { wave: 'sine', freq: f * 2.76, at: 0, len: 0.25, vol: vol * 0.22, attack: 0.004 }
      ];
    case 'marimba':
      return [
        { wave: 'sine', freq: f, at: 0, len: Math.min(len, 0.35), vol, attack: 0.003 },
        { wave: 'sine', freq: f * 4, at: 0, len: 0.04, vol: vol * 0.25, attack: 0.002 }
      ];
    case 'bass':
      return [
        { wave: 'triangle', freq: f, at: 0, len, vol, attack: 0.01, filter: { type: 'lowpass', freq: 600 } },
        { wave: 'sine', freq: f, at: 0, len, vol: vol * 0.6, attack: 0.01 }
      ];
    case 'lead':
      return [{ wave: 'square', freq: f, at: 0, len, vol: vol * 0.5, attack: 0.01, filter: { type: 'lowpass', freq: 1800 } }];
    case 'chip':
      return [{ wave: 'square', freq: f, at: 0, len: len * 0.8, vol: vol * 0.45, attack: 0.003, filter: { type: 'lowpass', freq: 3200 } }];
    case 'pad':
      return [{ wave: 'sawtooth', freq: f, at: 0, len, vol: vol * 0.5, attack: Math.min(0.15, len * 0.4), detune: 10, filter: { type: 'lowpass', freq: 900 } }];
    case 'saw':
      return [{ wave: 'sawtooth', freq: f, at: 0, len, vol: vol * 0.55, attack: 0.01, detune: 14, filter: { type: 'lowpass', freq: 2400, to: 900 } }];
    case 'brass':
      return [{ wave: 'sawtooth', freq: f, at: 0, len, vol: vol * 0.55, attack: 0.03, detune: 8, filter: { type: 'lowpass', freq: 1300, to: 2200 } }];
    case 'flute':
      return [
        { wave: 'sine', freq: f, at: 0, len, vol, attack: 0.06, vib: { rate: 5, depth: f * 0.008 } },
        { wave: 'noise', at: 0, len: Math.min(len, 0.12), vol: vol * 0.15, attack: 0.03, filter: { type: 'bandpass', freq: f * 2, q: 4 } }
      ];
  }
}

export function drumTones(d: DrumName, vol = 1): Tone[] {
  switch (d) {
    case 'kick':
      return [{ wave: 'sine', freq: 150, to: 45, at: 0, len: 0.18, vol: 0.7 * vol, attack: 0.002 }];
    case 'snare':
      return [
        { wave: 'noise', at: 0, len: 0.12, vol: 0.3 * vol, attack: 0.002, filter: { type: 'bandpass', freq: 1900, q: 0.8 } },
        { wave: 'triangle', freq: 200, to: 150, at: 0, len: 0.06, vol: 0.25 * vol, attack: 0.002 }
      ];
    case 'hat':
      return [{ wave: 'noise', at: 0, len: 0.035, vol: 0.14 * vol, attack: 0.001, filter: { type: 'highpass', freq: 7000 } }];
    case 'shaker':
      return [{ wave: 'noise', at: 0, len: 0.06, vol: 0.1 * vol, attack: 0.02, filter: { type: 'highpass', freq: 5000 } }];
    case 'tom':
      return [
        { wave: 'sine', freq: 110, to: 68, at: 0, len: 0.32, vol: 0.7 * vol, attack: 0.003 },
        { wave: 'noise', at: 0, len: 0.05, vol: 0.12 * vol, attack: 0.002, filter: { type: 'lowpass', freq: 600 } }
      ];
    case 'clap':
      return [0, 0.012, 0.026].map((at): Tone => ({ wave: 'noise', at, len: 0.05, vol: 0.22 * vol, attack: 0.001, filter: { type: 'bandpass', freq: 1500, q: 1.2 } }));
  }
}

/** The music's level under the effects (before the profile's volume). */
const LEVEL = 0.16;
/** While the hero speaks. */
const DUCK = 0.25;
/** While an explanation runs. */
const HOLD = 0.12;

export type MusicScene = 'play' | 'off';

interface MusicLogEntry {
  t: number;
  what: 'start' | 'stop' | 'duck' | 'unduck' | 'hold' | 'release' | 'loop' | 'level';
  level: number;
}

/** For tests: what the music is doing. */
export interface MusicState {
  playing: boolean;
  world: string | null;
  scene: MusicScene;
  enabled: boolean;
  ducked: boolean;
  held: boolean;
  /** The level it is heading to (0 when stopped). */
  level: number;
  /** Steps scheduled so far (the beat is going). */
  steps: number;
  log: MusicLogEntry[];
}

const state: MusicState = { playing: false, world: null, scene: 'off', enabled: true, ducked: false, held: false, level: 0, steps: 0, log: [] };
if (typeof window !== 'undefined') (window as unknown as { __mathitMusic: MusicState }).__mathitMusic = state;

let loop: MusicLoop | null = null;
let volume = 0.8;
let holds = 0;
let master: GainNode | null = null;
let timer = 0;
let step = 0;
let nextTime = 0;
let parsed: { part: MusicPart; tokens: (number | null)[] }[] = [];

function note(what: MusicLogEntry['what']): void {
  state.log.push({ t: Math.round(typeof performance !== 'undefined' ? performance.now() : 0), what, level: Number(state.level.toFixed(4)) });
  if (state.log.length > 200) state.log.shift();
}

function target(): number {
  return LEVEL * volume * (state.ducked ? DUCK : 1) * (state.held ? HOLD : 1);
}

function wanted(): boolean {
  return !!loop && state.enabled && state.scene === 'play' && volume > 0 && !(typeof document !== 'undefined' && document.hidden);
}

/** Glide to the current level (ducking, a hold, the volume). */
function glide(): void {
  if (!state.playing || !master) return;
  const ac = master.context;
  state.level = target();
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setTargetAtTime(Math.max(0.0001, state.level), ac.currentTime, 0.12);
}

function schedule(ac: AudioContext): void {
  if (!loop || !master) return;
  const stepDur = 60 / loop.bpm / 4;
  while (nextTime < ac.currentTime + 0.15) {
    for (const { part, tokens } of parsed) {
      const m = tokens[step % tokens.length];
      if (m === null) continue;
      for (const t of voiceTones(part.voice, midiFreq(m), stepDur * (part.len ?? 1), part.vol)) voice(ac, t, nextTime, master);
    }
    for (const [d, line] of Object.entries(loop.drums ?? {})) {
      if (line[step % line.length] === 'x') for (const t of drumTones(d as DrumName)) voice(ac, t, nextTime, master);
    }
    state.steps++;
    nextTime += stepDur;
    step = (step + 1) % loop.steps;
  }
}

function start(): void {
  if (state.playing || !wanted()) return;
  const ac = audioContext();
  if (!ac || !loop) return;
  if (ac.state === 'suspended') void ac.resume().catch(() => {});
  master = ac.createGain();
  master.gain.value = 0.0001;
  master.connect(ac.destination);
  parsed = loop.parts.map((part) => ({ part, tokens: partTokens(part).map(noteMidi) }));
  step = 0;
  nextTime = ac.currentTime + 0.08;
  state.playing = true;
  note('start');
  glide();
  schedule(ac);
  timer = window.setInterval(() => schedule(ac), 40);
}

function stop(): void {
  if (!state.playing) return;
  clearInterval(timer);
  state.playing = false;
  state.level = 0;
  note('stop');
  const m = master;
  master = null;
  if (m) {
    const now = m.context.currentTime;
    m.gain.cancelScheduledValues(now);
    m.gain.setTargetAtTime(0.0001, now, 0.08);
    setTimeout(() => {
      try {
        m.disconnect();
      } catch {
        /* already gone */
      }
    }, 600);
  }
}

/** Start or stop to match the scene, the setting, the loop and the page. */
function sync(): void {
  if (wanted()) start();
  else stop();
}

/** The world's loop (worlds/index.ts, when a world is applied); null = no music (the base look). */
export function setMusicLoop(worldId: string | null, l: MusicLoop | null): void {
  if (state.world === worldId && loop === l) return;
  stop();
  loop = l;
  state.world = l ? worldId : null;
  note('loop');
  sync();
}

/** Which screen we are on: "play" on a profile's own screens, "off" elsewhere (App). */
export function setMusicScene(s: MusicScene): void {
  if (state.scene === s) return;
  state.scene = s;
  sync();
}

/** The profile's "music" setting. */
export function setMusicEnabled(on: boolean): void {
  state.enabled = on;
  sync();
}

/** The profile's volume (0..1). */
export function setMusicVolume(v: number): void {
  volume = Math.min(1, Math.max(0, v));
  sync();
  glide();
  note('level');
}

/** Very low while something needs listening (an explanation). Returns the release. */
export function holdMusic(): () => void {
  holds++;
  state.held = true;
  glide();
  note('hold');
  let done = false;
  return () => {
    if (done) return;
    done = true;
    holds = Math.max(0, holds - 1);
    state.held = holds > 0;
    glide();
    note('release');
  };
}

export function musicState(): MusicState {
  return state;
}

if (typeof window !== 'undefined') {
  onAudioUnlock(sync);
  onSpeaking((on) => {
    state.ducked = on;
    glide();
    note(on ? 'duck' : 'unduck');
  });
  document.addEventListener('visibilitychange', sync);
}
