"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { Swords } from "lucide-react";
import { useActiveRoomStore } from "@/store/useActiveRoomStore";

const STORAGE_KEY = "nexus-duos:return-button-pos";
const SIZE = 52;
const MARGIN = 16;
const DEFAULT_BOTTOM_OFFSET = 160; // clears the bottom nav + invite banner by default

/**
 * A small, draggable, circular "return to your match" button. Shown
 * whenever the player has an active room — hosting and waiting for someone
 * to join, joined, or mid-match — and has navigated away from that room's
 * page. Its position is remembered across visits (localStorage) so the
 * player only has to drag it out of the way once. Tapping it (without
 * dragging) returns to the room; the live room state itself was never
 * lost, since RoomSync (mounted at the app root) keeps tracking it in the
 * background regardless of which page is on screen.
 */
export function ActiveRoomFloatingButton() {
  const pathname = usePathname();
  const router = useRouter();
  const room = useActiveRoomStore((s) => s.room);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);

  const roomPath = room ? `/room/${room.code}` : null;
  const visible = Boolean(room && room.status !== "FINISHED" && pathname !== roomPath);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          setPos(parsed);
          return;
        }
      } catch {
        // fall through to default
      }
    }
    setPos({ x: window.innerWidth - SIZE - MARGIN, y: window.innerHeight - SIZE - DEFAULT_BOTTOM_OFFSET });
  }, []);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (typeof window === "undefined" || !pos) return;
    draggedRef.current = Math.abs(info.offset.x) > 4 || Math.abs(info.offset.y) > 4;
    const next = {
      x: Math.min(Math.max(0, pos.x + info.offset.x), window.innerWidth - SIZE),
      y: Math.min(Math.max(0, pos.y + info.offset.y), window.innerHeight - SIZE),
    };
    setPos(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function handleClick() {
    if (draggedRef.current) {
      draggedRef.current = false; // this tap was the end of a drag, not a real tap — ignore it
      return;
    }
    if (roomPath) router.push(roomPath);
  }

  return (
    <div ref={constraintsRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 45 }}>
      <AnimatePresence>
        {visible && pos && (
          <motion.button
            key="return-to-match"
            drag
            dragConstraints={constraintsRef}
            dragElastic={0}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, x: pos.x, y: pos.y }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            aria-label="Return to your match"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: SIZE,
              height: SIZE,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgb(var(--color-void) / 0.85)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgb(var(--color-cyan) / 0.45)",
              boxShadow: "0 4px 24px rgb(0 0 0 / 0.35), 0 0 18px rgb(var(--color-cyan) / 0.3)",
              pointerEvents: "auto",
              touchAction: "none",
              cursor: "grab",
            }}
          >
            <span
              className="animate-pulse-glow"
              style={{
                position: "absolute",
                inset: -3,
                borderRadius: "50%",
                border: "1px solid rgb(var(--color-cyan) / 0.5)",
                pointerEvents: "none",
              }}
            />
            <Swords size={20} color="rgb(var(--color-cyan))" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
