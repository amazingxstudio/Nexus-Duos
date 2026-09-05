"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRoomPhaseStore } from "@/store/useRoomPhaseStore";

/**
 * Wires Telegram's native BackButton (the affordance that also captures
 * the phone's hardware/gesture back once shown) to in-app navigation
 * instead of the default "close the whole Mini App" behavior — spec A.4.
 * Mounted once at the app root (see AppProviders.tsx) so it stays wired
 * across every page swap.
 *
 * - Anywhere except Home ("/"): BackButton is shown; tapping it (or the
 *   phone's own hardware/gesture back — Telegram routes that to the same
 *   backButtonClicked event once BackButton.show() has been called) pops
 *   one screen of in-app history via router.back().
 * - On Home: BackButton is hidden, so back/gesture-close falls through to
 *   Telegram's own default close behavior, exactly as requested.
 */
export function TelegramBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  // Counts in-app navigations since mount. If back is pressed on the very
  // first non-Home screen the player landed on (e.g. a deep link straight
  // into /profile/xyz with no prior in-app history), router.back() would
  // have nothing of ours to pop — send them Home instead of a blank/broken
  // back navigation.
  const navigationCount = useRef(0);

  useEffect(() => {
    navigationCount.current += 1;
  }, [pathname]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.BackButton) return;

    function handleBack() {
      // Mid-match, back shouldn't silently pop navigation (which used to
      // skip straight past the forfeit warning) — route it into the same
      // "Leave this match?" confirmation the in-game Exit icon opens, and
      // let that dialog decide what happens next.
      if (useRoomPhaseStore.getState().inGame) {
        useRoomPhaseStore.getState().requestExit();
        return;
      }
      if (navigationCount.current <= 1) router.push("/");
      else router.back();
    }

    tg.BackButton.onClick(handleBack);
    return () => tg.BackButton?.offClick(handleBack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.BackButton) return;
    if (pathname === "/") tg.BackButton.hide();
    else tg.BackButton.show();
  }, [pathname]);

  return null;
}
