"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Swords } from "lucide-react";
import { useActiveRoomStore } from "@/store/useActiveRoomStore";

/**
 * Shown whenever both players are in a live room (joined, voting,
 * ready-check, or mid-match) and the player has navigated away from that
 * room's page to somewhere else in the app. Tapping it returns to the room
 * exactly where they left off — its live state was never lost, since
 * RoomSync (mounted at the app root) keeps tracking it in the background
 * regardless of which page is on screen.
 */
export function ActiveRoomFloatingButton() {
  const pathname = usePathname();
  const router = useRouter();
  const room = useActiveRoomStore((s) => s.room);

  const roomPath = room ? `/room/${room.code}` : null;
  const visible = Boolean(room && room.player2 && room.status !== "FINISHED" && pathname !== roomPath);

  return (
    <AnimatePresence>
      {visible && roomPath && (
        <motion.button
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={() => router.push(roomPath)}
          className="glass-panel-cyan fixed inset-x-4 bottom-40 z-40 mx-auto flex max-w-sm items-center justify-center gap-2 px-4 py-3"
        >
          <Swords size={16} className="text-cyan" />
          <span className="text-sm font-medium text-ink-primary">Return to your match</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
