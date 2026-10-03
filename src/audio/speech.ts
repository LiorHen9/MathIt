// Reading text aloud in Hebrew with the Web Speech API (for ages 5–7, who may not read yet).
// Adapted from ChessIt; here the hero "speaks" tasks and feedback.
// Only a Hebrew voice is used: another language's voice reads Hebrew as gibberish, so without one
// the 🔊 button is hidden and the parent gets a one-time note on how to install a Hebrew voice.
import { useEffect, useState } from 'preact/hooks';

let voice: SpeechSynthesisVoice | null = null;
let narration = false;
const listeners = new Set<() => void>();

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

function pickVoice(): void {
  const s = synth();
  if (!s) return;
  const voices = s.getVoices();
  // "iw" is the old code for Hebrew, still used by some Android voices.
  const he = voices.filter((v) => /^(he|iw)([-_]|$)/i.test(v.lang));
  const next = he.find((v) => /^(he|iw)[-_]IL$/i.test(v.lang) && v.localService) ?? he.find((v) => /IL$/i.test(v.lang)) ?? he[0] ?? null;
  if (next !== voice) {
    voice = next;
    listeners.forEach((f) => f());
  }
}

const s0 = synth();
if (s0) {
  pickVoice();
  // Voices often arrive later (Chrome loads them asynchronously).
  s0.addEventListener?.('voiceschanged', pickVoice);
}

export function hasHebrewVoice(): boolean {
  return !!voice;
}

/** Re-renders when a Hebrew voice appears (or disappears). */
export function useHebrewVoice(): boolean {
  const [has, setHas] = useState(!!voice);
  useEffect(() => {
    const f = () => setHas(!!voice);
    listeners.add(f);
    f();
    return () => void listeners.delete(f);
  }, []);
  return has;
}

/** Read new tasks aloud by themselves (a per-profile setting). */
export function setNarration(on: boolean): void {
  narration = on;
  if (!on) stopSpeaking();
}

export function narrationOn(): boolean {
  return narration;
}

/** Math signs between numbers, the way a teacher reads them ("7 + 5" → "7 ועוד 5"). */
const SIGN: Record<string, string> = {
  '+': 'ועוד',
  '-': 'פחות',
  '−': 'פחות',
  '×': 'כפול',
  '*': 'כפול',
  '÷': 'חלקי',
  '=': 'שווה',
  '<': 'קטן מ',
  '>': 'גדול מ'
};

/** A sign between two numbers, or a number and "?" / "_" (the missing one). No ":" – it is a clock time. */
const BETWEEN = /(\d|\?|_)\s*([+\-−×*÷=<>])\s*(?=\d|\?|_)/g;

/** Text for the voice: no emoji or arrows, math signs between numbers spelled out in Hebrew. */
export function cleanForSpeech(text: string): string {
  const signs = (s: string) => s.replace(BETWEEN, (_m, a: string, sign: string) => `${a} ${SIGN[sign]} `);
  return (
    // Twice: the pattern consumes the left number, so "2 + 3 + 4" needs a second pass.
    signs(
      signs(
        text
          .replace(/[\uFE0E\uFE0F\u200D\u200E\u200F\u2066-\u2069]/g, '')
          .replace(/\p{Extended_Pictographic}/gu, '')
          .replace(/[\u2190-\u21FF\u2300-\u23FF\u25A0-\u27BF\u2B00-\u2BFF]/g, '')
      )
    )
      // "קטן מ 5" → "קטן מ-5" reads more naturally.
      .replace(/ מ (\d)/g, ' מ-$1')
      // The unknown in an exercise ("5 ועוד ? שווה 7"), not a question mark at the end of a sentence.
      .replace(/(ועוד|פחות|כפול|חלקי|שווה|מ-?) [?_]+/g, '$1 כמה')
      .replace(/(^|\s)[?_]+ (?=ועוד|פחות|כפול|חלקי|שווה)/g, '$1כמה ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Read text aloud now (stopping anything already being read). False when there is no Hebrew voice. */
export function speak(text: string): boolean {
  const s = synth();
  const clean = cleanForSpeech(text);
  if (!s || !voice || !clean) return false;
  s.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = 'he-IL';
  try {
    u.voice = voice;
  } catch {
    // Some engines reject voices from another realm; lang alone still picks a Hebrew voice.
  }
  u.rate = 0.92;
  s.speak(u);
  return true;
}

/** Read aloud only when the profile has narration on. */
export function autoSpeak(text: string): void {
  if (narration) speak(text);
}

export function stopSpeaking(): void {
  pendingEnd?.();
  synth()?.cancel();
}

/**
 * About how long a sentence takes to say (or, without a voice, to look at): a beat plus a bit
 * per letter, at the slow pace a 5-year-old follows. Pure, for tests.
 */
export function readingMs(text: string): number {
  const clean = cleanForSpeech(text);
  if (!clean) return 0;
  return Math.round(Math.min(6500, Math.max(1400, 700 + clean.length * 62)));
}

let pendingEnd: (() => void) | null = null;

/**
 * Say a sentence and wait until it has been said – the hero explaining, step by step, in time
 * with the animation (manipulatives/Explainer.tsx). With narration on and a Hebrew voice it waits
 * for the voice (with a safety timeout); otherwise it waits the time `readingMs` gives, so the
 * pace stays the same with or without a voice. `signal` stops the wait (and the voice).
 */
export function sayAndWait(text: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const ms = readingMs(text);
    let done = false;
    let timer = 0;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (pendingEnd === finish) pendingEnd = null;
      signal?.removeEventListener('abort', onAbort);
      resolve();
    };
    const onAbort = () => {
      if (pendingEnd === finish) synth()?.cancel();
      finish();
    };
    signal?.addEventListener('abort', onAbort);
    const s = synth();
    const clean = cleanForSpeech(text);
    if (narration && s && voice && clean) {
      pendingEnd?.();
      s.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'he-IL';
      try {
        u.voice = voice;
      } catch {
        /* lang alone still picks a Hebrew voice */
      }
      u.rate = 0.92;
      u.onend = finish;
      u.onerror = finish;
      pendingEnd = finish;
      s.speak(u);
      // Voices sometimes never fire "end" (a known Chrome/Android bug): don't hang on them.
      timer = window.setTimeout(finish, ms * 2.5 + 1500);
    } else timer = window.setTimeout(finish, ms);
  });
}
