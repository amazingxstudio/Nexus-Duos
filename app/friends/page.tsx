"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, UserPlus, Swords, Circle, Check } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useSocket } from "@/components/providers/SocketProvider";
import { GameInvitePickerSheet } from "@/components/room/GameInvitePickerSheet";

interface PlayerCard {
  user_id: string; nickname: string; player_id: string; photo_url?: string | null; online: boolean;
}

export default function FriendsPage() {
  const token = useAuthStore((s) => s.token);
  const socket = useSocket();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerCard[]>([]);
  const [friends, setFriends] = useState<PlayerCard[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [sentInvite, setSentInvite] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<PlayerCard | null>(null);

  function loadFriends() {
    apiFetch<{ friends: PlayerCard[] }>("/players/friends", { token }).then((res) => setFriends(res.friends));
  }

  useEffect(() => { if (token) loadFriends(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socket) return;
    function onStatus(data: { user_id: string; online: boolean }) {
      setFriends((prev) => prev.map((f) => (f.user_id === data.user_id ? { ...f, online: data.online } : f)));
    }
    socket.on("friend_status_changed", onStatus);
    return () => { socket.off("friend_status_changed", onStatus); };
  }, [socket]);

  useEffect(() => {
    // Player IDs are always exactly 11 characters ("NDUO-" + 6) — only
    // search once the whole thing has been entered, not on a partial match.
    if (query.trim().length < 11) { setResults([]); return; }
    const timeout = setTimeout(() => {
      apiFetch<{ players: PlayerCard[] }>(`/players/search?query=${encodeURIComponent(query.trim())}`, { token }).then((res) => setResults(res.players));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, token]);

  async function addFriend(p: PlayerCard) {
    await apiFetch("/players/friends", { method: "POST", token, body: JSON.stringify({ player_id: p.player_id }) });
    setAddedIds((prev) => new Set(prev).add(p.user_id));
    loadFriends();
  }

  // Tapping the duel button opens the picker (Voting, or a specific game)
  // instead of firing the invite immediately — the chosen game_key rides
  // along with the invite so the room skips straight to Ready Check.
  function sendInvite(gameKey: string | null) {
    if (!pickerFor) return;
    socket?.emit("invite:send", { to_user_id: pickerFor.user_id, game_key: gameKey });
    setSentInvite(pickerFor.user_id);
    setPickerFor(null);
    setTimeout(() => setSentInvite(null), 3000);
  }

  return (
    <main className="min-h-dvh px-5 pb-28 pt-8">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink-primary">Friends</h1>

      <div className="glass-panel mb-6 flex items-center gap-2 px-4 py-3">
        <Search size={16} className="text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by Player ID (NDUO-XXXXXX)"
          className="selectable stat-mono w-full bg-transparent text-sm text-ink-primary outline-none placeholder:text-ink-faint"
        />
      </div>

      {results.length > 0 && (
        <div className="mb-8 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Search results</p>
          {results.map((p) => (
            <div key={p.user_id} className="glass-panel flex items-center gap-3 p-3">
              <Avatar photoUrl={p.photo_url} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-primary">{p.nickname}</p>
                <p className="stat-mono text-xs text-ink-muted">{p.player_id}</p>
              </div>
              <button
                onClick={() => addFriend(p)}
                disabled={addedIds.has(p.user_id)}
                className="icon-badge h-9 w-9 bg-cyan/10 text-cyan disabled:opacity-50"
              >
                {addedIds.has(p.user_id) ? <Check size={16} /> : <UserPlus size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mb-3 text-xs uppercase tracking-wide text-ink-muted">Your friends</p>
      {friends.length === 0 && <div className="glass-panel p-8 text-center text-ink-muted">No friends added yet — search by Player ID above.</div>}
      <div className="flex flex-col gap-2">
        {friends.map((f, i) => (
          <motion.div key={f.user_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-panel flex items-center gap-3 p-3">
            <Link href={`/profile/${f.player_id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative">
                <Avatar photoUrl={f.photo_url} />
                {f.online && <Circle size={10} className="absolute -bottom-0.5 -right-0.5 fill-cyan text-cyan" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-primary">{f.nickname}</p>
                <p className="text-xs text-ink-muted">{f.online ? "Online" : "Offline"}</p>
              </div>
            </Link>
            {f.online && (
              <button onClick={() => setPickerFor(f)} disabled={sentInvite === f.user_id} className="icon-badge h-9 w-9 bg-cyan text-void disabled:opacity-50">
                {sentInvite === f.user_id ? <Check size={16} /> : <Swords size={16} />}
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <GameInvitePickerSheet target={pickerFor} onClose={() => setPickerFor(null)} onPick={sendInvite} />
    </main>
  );
}

function Avatar({ photoUrl }: { photoUrl?: string | null }) {
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-raised bg-cover bg-center" style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined} />
  );
}
