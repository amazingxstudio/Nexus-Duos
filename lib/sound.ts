"use client";

// Small Web Audio synth for match-end feedback. No audio files to fetch —
// everything here is generated on the fly, so it works offline and can't
// go missing/404 inside a Telegram WebView. Respects the "Sound effects"
// toggle on the Settings page (cached in sessionStorage under the same key
// that page already reads/writes).

const SETTINGS_CACHE_KEY = "nexus_settings_cache";

function soundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cached = window.sessionStorage.getItem(SETTINGS_CACHE_KEY);
    if (!cached) return true; // default on before settings have loaded once
    const parsed = JSON.parse(cached);
    return parsed?.sound_enabled !== false;
  } catch {
    return true;
  }
}

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  if (sharedCtx.state === "suspended") sharedCtx.resume().catch(() => {});
  return sharedCtx;
}

function tone(freq: number, startOffset: number, duration: number, type: OscillatorType, peakGain: number) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const t0 = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

/** Call this from a genuine, early tap handler (e.g. the "I'm Ready"
 * button, which happens before every match). Browsers only let an
 * AudioContext actually produce audible sound if it's created/resumed as
 * a direct result of a real user gesture — every sound call in this file
 * fires later, from a socket event (match end), which is never a gesture,
 * so without this the context can end up silently stuck "suspended"
 * forever and none of the sounds below ever actually play. */
export function unlockAudio() {
  getCtx();
}

/** Bright ascending arpeggio. */
export function playWinSound() {
  if (!soundEnabled()) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone(freq, i * 0.09, 0.35, "triangle", 0.16));
}

/** Descending, softer tone. */
export function playLoseSound() {
  if (!soundEnabled()) return;
  [392, 329.63, 261.63].forEach((freq, i) => tone(freq, i * 0.14, 0.4, "sawtooth", 0.1));
}

/** Neutral double chime. */
export function playDrawSound() {
  if (!soundEnabled()) return;
  [440, 440].forEach((freq, i) => tone(freq, i * 0.18, 0.28, "sine", 0.13));
}

/** Short, quiet tick — used for lightweight in-game feedback (e.g. a correct answer). */
export function playTickSound() {
  if (!soundEnabled()) return;
  tone(880, 0, 0.12, "sine", 0.08);
}
