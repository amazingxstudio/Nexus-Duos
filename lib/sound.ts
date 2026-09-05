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

/** Same as tone(), but glides linearly from one frequency to another over
 * the note's duration instead of holding a single pitch — used for the win
 * sound's long, hopeful tail below, since a held single tone stretched out
 * to 2-3s just sounds like a stuck note rather than "shimmering". */
function toneSweep(freqFrom: number, freqTo: number, startOffset: number, duration: number, type: OscillatorType, peakGain: number) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;

  const t0 = ctx.currentTime + startOffset;
  osc.frequency.setValueAtTime(freqFrom, t0);
  osc.frequency.exponentialRampToValueAtTime(freqTo, t0 + duration);

  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

/** A short burst of white noise with its decay baked straight into the
 * buffer — used for the confetti "pop" below, since a pure oscillator
 * tone() can't produce a percussive/noisy texture on its own. */
function noiseBurst(startOffset: number, duration: number, peakGain: number) {
  const ctx = getCtx();
  if (!ctx) return;
  const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  const t0 = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(peakGain, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(t0);
  source.stop(t0 + duration + 0.02);
}

/** Call this from a genuine, early tap handler (e.g. the "I'm Ready"
 * button, which happens before every match). Browsers only let an
 * AudioContext actually produce audible sound if it's created/resumed as
 * a direct result of a real user gesture — every sound call in this file
 * fires later, from a socket event (match end, an incoming invite), which
 * is never a gesture, so without this the context can end up silently
 * stuck "suspended" forever and none of the sounds below ever actually
 * play. */
export function unlockAudio() {
  getCtx();
  // Also prime the DM chime's <audio> element itself. A Web Audio
  // AudioContext and an HTMLAudioElement are unlocked independently by
  // mobile browsers/WebViews — resuming the shared AudioContext above does
  // nothing for this separate element. Playing it muted-and-instantly-paused
  // here, during a real gesture, is what lets the later un-muted,
  // gesture-less play() call in playDmNotificationSound() actually produce
  // sound instead of being silently rejected.
  const el = getDmAudioEl();
  if (el) {
    const wasMuted = el.muted;
    el.muted = true;
    el.play()
      .then(() => { el.pause(); el.currentTime = 0; el.muted = wasMuted; })
      .catch(() => { el.muted = wasMuted; });
  }
}

/** Bright ascending arpeggio, into a held shimmering sweep — roughly 2.2s
 * total. The original version was a quick four-note flourish (~0.6s) that
 * read as a UI "ding" rather than something worth celebrating; the extra
 * layered sweep tail (two detuned voices gliding gently upward, well under
 * the main arpeggio in volume) gives the win screen a couple of seconds of
 * actual "shimmer" to sit under the confetti/fireworks instead of going
 * silent while the visual celebration is still playing out. */
export function playWinSound() {
  if (!soundEnabled()) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => tone(freq, i * 0.1, 0.4, "triangle", 0.17));
  toneSweep(1046.5, 1568, 0.42, 1.85, "sine", 0.07);
  toneSweep(1318.5, 1975.5, 0.5, 1.7, "sine", 0.045);
}

/** Descending phrase into a slow, sinking sweep — roughly 2.3s total.
 * Sad without being harsh: sawtooth was too buzzy held for this long, so
 * the held tail switches to a softer sine gliding gently downward. */
export function playLoseSound() {
  if (!soundEnabled()) return;
  [392, 329.63, 261.63].forEach((freq, i) => tone(freq, i * 0.16, 0.42, "sawtooth", 0.11));
  toneSweep(246.94, 164.81, 0.5, 1.8, "sine", 0.075);
}

/** Neutral double chime, held open with a flat, unresolved drone — roughly
 * 2.1s. Deliberately doesn't rise or fall (mirrors the "draw" outcome
 * itself: nobody won), just a soft sustained pair of tones a fifth apart. */
export function playDrawSound() {
  if (!soundEnabled()) return;
  [440, 440].forEach((freq, i) => tone(freq, i * 0.18, 0.3, "sine", 0.14));
  tone(440, 0.4, 1.7, "sine", 0.055);
  tone(659.25, 0.4, 1.7, "sine", 0.04);
}

/** Short, quiet tick — used for lightweight in-game feedback (e.g. a correct answer). */
export function playTickSound() {
  if (!soundEnabled()) return;
  tone(880, 0, 0.12, "sine", 0.08);
}

/** Confetti "pop" — a quick noise burst plus a high-pitched click layered
 * on top, timed to fire right as the win-screen confetti/fireworks burst. */
export function playConfettiPopSound() {
  if (!soundEnabled()) return;
  noiseBurst(0, 0.12, 0.18);
  tone(1800, 0, 0.08, "sine", 0.09);
}

/** A second, slightly offset firework "boom" — layered in a beat after the
 * first pop so a multi-burst fireworks display (see MatchResultOverlay's
 * Fireworks component) reads as several distinct explosions rather than
 * one pop repeated identically. Lower and rounder than playConfettiPopSound
 * so the two don't just sound like duplicates of each other. */
export function playFireworkBoomSound() {
  if (!soundEnabled()) return;
  noiseBurst(0, 0.16, 0.14);
  tone(700, 0, 0.14, "sine", 0.07);
}

/** Two quick, bright notes — used for incoming socket notifications the
 * player should notice even if they're not looking at the screen (a duel
 * invite, a rematch request, a friend request). Deliberately distinct from
 * the match-result sounds above: short (under half a second) and neutral
 * in tone, since it fires for a "heads up" event rather than a win/loss. */
export function playNotificationSound() {
  if (!soundEnabled()) return;
  tone(880, 0, 0.11, "sine", 0.12);
  tone(1318.5, 0.09, 0.16, "sine", 0.1);
}

// ---- Incoming direct-message chime (spec D.14a) --------------------------
//
// If a real Telegram notification sound file is dropped in at
// /public/sounds/telegram-notification.mp3 (this repo doesn't ship one —
// this build environment has no network access to fetch Telegram's actual
// asset, and it isn't ours to redistribute), it's played verbatim. Without
// that file this falls back to a synthesized bell — two quick ascending
// notes, each with a quiet octave-ish overtone layered on top of the plain
// sine so it reads as a "bell" timbre rather than a flat beep — which is
// the same short, bright, two-tone shape as Telegram's own default message
// tone, just generated instead of sampled.
let dmAudioEl: HTMLAudioElement | null = null;
let dmAudioUnavailable = false;

function getDmAudioEl(): HTMLAudioElement | null {
  if (typeof window === "undefined" || dmAudioUnavailable) return null;
  if (!dmAudioEl) {
    dmAudioEl = new Audio("/sounds/telegram-notification.mp3");
    dmAudioEl.preload = "auto";
    dmAudioEl.addEventListener("error", () => { dmAudioUnavailable = true; });
  }
  return dmAudioEl;
}

function bell(freq: number, startOffset: number, duration: number, peakGain: number) {
  tone(freq, startOffset, duration, "sine", peakGain);
  tone(freq * 2.01, startOffset, duration * 0.55, "sine", peakGain * 0.22);
}

function playSynthesizedDmChime() {
  bell(988, 0, 0.32, 0.15);
  bell(1318.5, 0.09, 0.38, 0.12);
}

export function playDmNotificationSound() {
  if (!soundEnabled()) return;
  const el = getDmAudioEl();
  if (el) {
    el.currentTime = 0;
    el.play().catch(() => {
      dmAudioUnavailable = true;
      playSynthesizedDmChime();
    });
    return;
  }
  playSynthesizedDmChime();
}
