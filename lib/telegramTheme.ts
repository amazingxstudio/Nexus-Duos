// Maps Telegram's WebApp.themeParams (the live palette of whichever theme
// the user has picked for the whole Telegram app — not just a light/dark
// flag) onto this app's own CSS custom-property tokens (see :root in
// globals.css). Every surface in the app — panels, cards, buttons, the
// bottom nav, the ambient "wallpaper" glow orbs — already reads its color
// from these tokens instead of a hardcoded value, so overriding the
// tokens here is enough to re-skin the whole app at once; no per-component
// theming needed.
//
// Telegram Mini Apps have no API exposing the user's actual chat wallpaper
// image — themeParams is color-only — so "wallpaper" sync is approximated
// with the theme's own background colors feeding the app's ambient glow
// background (AmbientBackground.tsx), which is the closest equivalent this
// app has to a wallpaper.

export interface TelegramThemeParams {
  bg_color?: string;
  secondary_bg_color?: string;
  section_bg_color?: string;
  header_bg_color?: string;
  bottom_bar_bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  accent_text_color?: string;
  destructive_text_color?: string;
  [key: string]: string | undefined;
}

function hexToRgbTriplet(hex?: string): string | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

function mixTriplets(a: string, b: string, t: number): string {
  const [ar, ag, ab] = a.split(" ").map(Number);
  const [br, bg, bb] = b.split(" ").map(Number);
  const round = (x: number) => Math.round(x);
  return `${round(ar + (br - ar) * t)} ${round(ag + (bg - ag) * t)} ${round(ab + (bb - ab) * t)}`;
}

/** Full set of CSS custom-property values to apply to :root when Telegram
 *  theme sync is on. Returns null for anything Telegram didn't provide so
 *  callers can skip setting (and fall back to the app's own default for)
 *  that specific token, rather than writing a broken empty value. */
export function computeSyncedCssVars(params: TelegramThemeParams): Record<string, string> {
  const bg = hexToRgbTriplet(params.bg_color);
  const secondaryBg = hexToRgbTriplet(params.secondary_bg_color) ?? bg;
  const sectionBg = hexToRgbTriplet(params.section_bg_color) ?? secondaryBg;
  const text = hexToRgbTriplet(params.text_color);
  const hint = hexToRgbTriplet(params.hint_color);
  const button = hexToRgbTriplet(params.button_color) ?? hexToRgbTriplet(params.link_color) ?? hexToRgbTriplet(params.accent_text_color);
  const buttonText = hexToRgbTriplet(params.button_text_color);

  const vars: Record<string, string> = {};
  if (bg) vars["--color-void"] = bg;
  if (secondaryBg) vars["--color-surface"] = secondaryBg;
  if (sectionBg) vars["--color-surface-raised"] = sectionBg;
  if (text) vars["--color-ink-primary"] = text;
  if (hint) vars["--color-ink-muted"] = hint;
  if (hint && bg) vars["--color-ink-faint"] = mixTriplets(hint, bg, 0.5);
  if (button) {
    vars["--color-cyan"] = button;
    vars["--color-cyan-dim"] = bg ? mixTriplets(button, bg, 0.35) : button;
  }
  if (buttonText) vars["--color-button-text"] = buttonText;
  return vars;
}

/** Hex form of whichever color should back Telegram's own native header
 *  bar / WebView background (tg.setHeaderColor / setBackgroundColor) so
 *  Telegram's own chrome matches the synced palette too, not just the
 *  in-app content. */
export function syncedChromeColorHex(params: TelegramThemeParams): string | null {
  const raw = params.header_bg_color ?? params.bg_color;
  if (!raw) return null;
  return raw.startsWith("#") ? raw : `#${raw}`;
}

const CSS_VAR_KEYS = [
  "--color-void", "--color-surface", "--color-surface-raised",
  "--color-ink-primary", "--color-ink-muted", "--color-ink-faint",
  "--color-cyan", "--color-cyan-dim", "--color-button-text",
] as const;

export function applySyncedCssVars(vars: Record<string, string>) {
  const root = document.documentElement.style;
  for (const key of CSS_VAR_KEYS) {
    if (vars[key]) root.setProperty(key, vars[key]);
    else root.removeProperty(key);
  }
}

export function clearSyncedCssVars() {
  const root = document.documentElement.style;
  for (const key of CSS_VAR_KEYS) root.removeProperty(key);
}
