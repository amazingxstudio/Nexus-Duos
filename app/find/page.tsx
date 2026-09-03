"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Swords, Hash, ArrowRight, Loader2, Users, ClipboardPaste, X, Circle } from "lucide-react";
import { apiFetch, friendlyErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useSocket } from "@/components/providers/SocketProvider";
import { GameInvitePickerSheet } from "@/components/room/GameInvitePickerSheet";
import { OutgoingInviteToast } from "@/components/room/OutgoingInviteToast";

interface RoomResponse {
  room: { code: string };
}

interface PlayerCard {
  user_id: string; nickname: string; player_id: string; photo_url?: string | null; online: boolean;
  last_seen_at?: string | null; last_seen_label?: string;
}

export default function FindPage() {
  const { token } = useAuthStore();
  const socket = useSocket();
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<PlayerCard[]>([]);
  const [sentInvite, setSentInvite] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<PlayerCard | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{ user_id: string; nickname: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ friends: PlayerCard[] }>("/players/friends", { token }).then((res) => setFriends(res.friends));
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    function onStatus(data: { user_id: string; online: boolean }) {
      setFriends((prev) => prev.map((f) => (f.user_id === data.user_id ? { ...f, online: data.online } : f)));
    }
    socket.on("friend_status_changed", onStatus);
    return () => { socket.off("friend_status_changed", onStatus); };
  }, [socket]);

  // Show every friend here (not just online ones) so offline friends'
  // last-seen label has somewhere to render — online friends sort first.
  const sortedFriends = [...friends].sort((a, b) => Number(b.online) - Number(a.online));

  async function createRoom() {
    setLoading("create");
    setError(null);
    try {
      const res = await apiFetch<RoomResponse>("/rooms", { method: "POST", token });
      router.push(`/room/${res.room.code}`);
    } catch (err) {
      setError(err instanceof Error ? friendlyErrorMessage(err.message) : "Failed to create room");
      setLoading(null);
    }
  }

  async function joinRoom() {
    if (!joinCode.trim()) return;
    setLoading("join");
    setError(null);
    try {
      const res = await apiFetch<RoomResponse>("/rooms/join", {
        method: "POST",
        token,
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      router.push(`/room/${res.room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
      setLoading(null);
    }
  }

  // Standard navigator.clipboard.readText() is blocked inside Telegram's
  // in-app WebView on most platforms (no permission prompt ever appears,
  // it just rejects) — Telegram's own bridge method is what actually works
  // there, but it's unreliable on some Telegram clients/versions and can
  // report an empty clipboard even when there's something on it. So this
  // button is just a shortcut, not the only way in: the join-code field
  // itself is a normal editable field (see below), so a long-press on it
  // always offers the native Select/Copy/Paste menu as a fallback.
  async function pasteCode() {
    setError(null);
    const tgClipboard = window.Telegram?.WebApp?.readTextFromClipboard;
    if (tgClipboard) {
      tgClipboard((text) => {
        if (text) setJoinCode(text.trim().toUpperCase());
        else setError("Couldn't read the clipboard automatically — long-press the box above to paste instead.");
      });
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (text) setJoinCode(text.trim().toUpperCase());
    } catch {
      setError("Couldn't read the clipboard automatically — long-press the box above to paste instead.");
    }
  }

  function sendInvite(gameKey: string | null) {
    if (!pickerFor) return;
    socket?.emit("invite:send", { to_user_id: pickerFor.user_id, game_key: gameKey });
    setSentInvite(pickerFor.user_id);
    setPendingInvite({ user_id: pickerFor.user_id, nickname: pickerFor.nickname });
    setPickerFor(null);
    setTimeout(() => setSentInvite(null), 3000);
  }

  return (
    <main className="flex min-h-dvh flex-col px-5 pb-28 pt-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="font-display text-xs uppercase tracking-[0.35em] text-violet">Matchmaking</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">Find your duel</h1>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        onClick={createRoom}
        disabled={loading !== null}
        className="btn-primary"
      >
        {loading === "create" ? <Loader2 size={18} className="animate-spin" /> : <Swords size={18} strokeWidth={2.25} />}
        {loading === "create" ? "Creating…" : "Create Room"}
      </motion.button>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="my-6 flex items-center gap-3 text-ink-muted">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-widest">or join</span>
        <div className="h-px flex-1 bg-white/10" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-col gap-3">
        {/* Not readOnly — a readOnly field greys out "Paste" in the native
            long-press menu on most mobile browsers, which is exactly what
            we need people to be able to use when Telegram's clipboard
            bridge is unavailable. inputMode="none" is what actually keeps
            the on-screen keyboard from popping up on tap; the field stays
            editable so long-press still gives the normal Select/Copy/Paste
            callout (see .selectable in globals.css). */}
        <div className="glass-panel flex items-center gap-2 px-4 py-3">
          <Hash size={16} className="text-ink-faint shrink-0" />
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            inputMode="none"
            placeholder="Paste a room code…"
            className="selectable stat-mono w-full bg-transparent text-ink-primary outline-none placeholder:text-ink-faint"
          />
          {joinCode && (
            <button onClick={() => setJoinCode("")} aria-label="Clear code" className="icon-badge h-6 w-6 shrink-0 bg-white/5 text-ink-muted">
              <X size={12} />
            </button>
          )}
          <button onClick={pasteCode} aria-label="Paste from clipboard" className="icon-badge h-8 w-8 shrink-0 bg-cyan/10 text-cyan">
            <ClipboardPaste size={15} />
          </button>
        </div>
        <button onClick={joinRoom} disabled={loading !== null || !joinCode.trim()} className="btn-ghost">
          {loading === "join" ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} strokeWidth={2.25} />}
          Join Room
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
        {/* Friends entry point lives here now, next to the section it
            actually belongs to, instead of floating in the page header. */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Friends</p>
          <Link href="/friends" className="icon-badge h-8 w-8 glass-panel" aria-label="Friends">
            <Users size={14} className="text-ink-muted" />
          </Link>
        </div>

        {sortedFriends.length === 0 ? (
          <div className="glass-panel p-6 text-center text-xs text-ink-muted">No friends added yet — tap the icon above to add some.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedFriends.map((f) => (
              <div key={f.user_id} className="glass-panel flex items-center gap-3 p-3">
                <Link href={`/profile/${f.player_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="h-9 w-9 overflow-hidden rounded-full bg-surface-raised bg-cover bg-center" style={f.photo_url ? { backgroundImage: `url(${f.photo_url})` } : undefined} />
                    {f.online && <Circle size={9} className="absolute -bottom-0.5 -right-0.5 fill-cyan text-cyan" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-primary">{f.nickname}</p>
                    {!f.online && <p className="truncate text-xs text-ink-muted">{f.last_seen_label ?? "Last seen recently"}</p>}
                  </div>
                </Link>
                {f.online && (
                  <button onClick={() => setPickerFor(f)} disabled={sentInvite === f.user_id} className="icon-badge h-9 w-9 shrink-0 bg-cyan text-void disabled:opacity-50">
                    <Swords size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center text-sm text-magenta">
          {error}
        </motion.p>
      )}

      <GameInvitePickerSheet target={pickerFor} onClose={() => setPickerFor(null)} onPick={sendInvite} />
      <OutgoingInviteToast target={pendingInvite} onDismiss={() => setPendingInvite(null)} />
    </main>
  );
}
