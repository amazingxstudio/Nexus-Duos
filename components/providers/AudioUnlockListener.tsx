"use client";

import { useEffect } from "react";
import { unlockAudio } from "@/lib/sound";

/**
 * Global, always-mounted, renders nothing (see AppProviders.tsx).
 *
 * Browsers/WebViews only allow audio to actually play if it was started
 * (or, for a shared AudioContext/audio element, first "unlocked") as a
 * direct result of a genuine user gesture. Previously the only place that
 * ever called unlockAudio() was the "I'm Ready" button inside an active
 * match room (see app/room/[code]/page.tsx) — but incoming-DM chimes and
 * duel-invite notification sounds can both fire long before someone has
 * ever entered a room, e.g. while just browsing Friends or Home. Without
 * an earlier unlock, those sounds were being silently blocked by the
 * browser with no audible fallback.
 *
 * This listens for the very first tap anywhere in the app, unlocks audio
 * right then (a real gesture), and detaches itself — a single one-time
 * listener rather than one per screen, so it works no matter which page
 * someone happens to land on first.
 */
export function AudioUnlockListener() {
  useEffect(() => {
    let unlocked = false;
    function onFirstInteraction() {
      if (unlocked) return;
      unlocked = true;
      unlockAudio();
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    }
    // pointerdown covers both touch and mouse; keydown is a fallback for
    // keyboard-only navigation. capture:true so it fires even if some
    // element in between calls stopPropagation().
    window.addEventListener("pointerdown", onFirstInteraction, { capture: true });
    window.addEventListener("keydown", onFirstInteraction, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstInteraction, { capture: true } as EventListenerOptions);
      window.removeEventListener("keydown", onFirstInteraction, { capture: true } as EventListenerOptions);
    };
  }, []);

  return null;
}
