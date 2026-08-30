"use client";

// Wraps Telegram's native HapticFeedback bridge. This only works inside
// the actual Telegram mobile apps (iOS/Android) — Telegram Desktop and
// Telegram Web have no vibration motor to trigger, so haptics are simply a
// no-op there regardless of what this file does; that's a platform limit,
// not a bug. Respects the same "Haptic feedback" setting toggle the
// Settings page already reads/writes (cached in sessionStorage).

const SETTINGS_CACHE_KEY = "nexus_settings_cache";

function hapticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cached = window.sessionStorage.getItem(SETTINGS_CACHE_KEY);
    if (!cached) return true; // default on before settings have loaded once
    const parsed = JSON.parse(cached);
    return parsed?.haptics_enabled !== false;
  } catch {
    return true;
  }
}

function getHaptics() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp?.HapticFeedback ?? null;
}

/** Light tap feedback — for routine taps (keyboard keys, board moves, toggles). */
export function hapticTap(style: "light" | "medium" | "heavy" | "rigid" | "soft" = "light") {
  if (!hapticsEnabled()) return;
  getHaptics()?.impactOccurred(style);
}

/** Win / loss / error-style feedback — for match results, rejected actions. */
export function hapticNotify(type: "success" | "warning" | "error") {
  if (!hapticsEnabled()) return;
  getHaptics()?.notificationOccurred(type);
}

/** Selection-style feedback — for picking between options (tabs, pickers). */
export function hapticSelect() {
  if (!hapticsEnabled()) return;
  getHaptics()?.selectionChanged();
}
