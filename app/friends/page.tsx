"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, UserPlus, Swords, Check, MessageCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useSocket } from "@/components/providers/SocketProvider";
import { GameInvitePickerSheet } from "@/components/room/GameInvitePickerSheet";
import { OutgoingInviteToast } from "@/components/room/OutgoingInviteToast";
import { useMessagesStore } from "@/store/useMessagesStore";

interface PlayerCard {
  user_id: string; nickname: string; player_id: string; photo_url?: string | null; online: boolean;
  last_seen_at?: string | null; last_seen_label?: string;
}

// Spam-prevention (spec D.16a): after sending a duel invite, the button is
// disabled with a visible countdown for this many seconds before it can be
// tapped again for the SAME friend — independent per friend, and
// independent of whether they've responded yet.
const INVITE_COOLDOWN_SECONDS = 5;

// Long-press default context menu (spec A.6): a friend row wraps its
// avatar/name in a Next <Link> (an <a> tag), and long-pressing a link in a
// mobile WebView shows the browser/webview's own "Open link / Copy link"
// menu — global CSS (see app/globals.css's touch-callout: none) already
// suppresses the plain text-selection callout, but an anchor's own native
// context menu needs to be stopped explicitly. Reused on every avatar/name
// link on this page (friend rows and search results alike).
function suppressContextMenu(e: React.MouseEvent) {
  e.preventDefault();
}

export default function FriendsPage() {
  const token = useAuthStore((s) => s.token);
  const socket = useSocket();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerCard[]>([]);
  const [friends, setFriends] = useState<PlayerCard[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [pickerFor, setPickerFor] = useState<PlayerCard | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{ user_id: string; nickname: string } | null>(null);
  const openConversation = useMessagesStore((s) => s.openConversation);
  const unreadBySender = useMessagesStore((s) => s.unreadBySender);
  const [notice, setNotice] = useState<string | null>(null);

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

  // Ticks every cooldown down once a second — a single shared interval
  // rather than one per friend, so it's harmless to leave running even
  // when nothing is currently cooling down.
  useEffect(() => {
    const t = setInterval(() => {
      setCooldowns((prev) => {
        if (Object.keys(prev).length === 0) return prev;
        const next: Record<string, number> = {};
        for (const [id, secs] of Object.entries(prev)) {
          if (secs > 1) next[id] = secs - 1;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Server-side notices — a decline-spam block (D.16b) or the free-tier
  // capacity gate (C.10) both surface here rather than failing silently.
  useEffect(() => {
    if (!socket) return;
    function onBlocked() {
      setNotice("Please wait a bit before inviting them again.");
      setTimeout(() => setNotice(null), 3500);
    }
    function onServerFull() {
      setNotice("Server ပြည့်နေပါသည်၊ ခဏစောင့်ပြီးမှ ထပ်ကြိုးစားပါ");
      setTimeout(() => setNotice(null), 4000);
    }
    socket.on("invite:blocked", onBlocked);
    socket.on("invite:server_full", onServerFull);
    return () => {
      socket.off("invite:blocked", onBlocked);
      socket.off("invite:server_full", onServerFull);
    };
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
    const target = pickerFor;
    socket?.emit("invite:send", { to_user_id: target.user_id, game_key: gameKey });
    setPendingInvite({ user_id: target.user_id, nickname: target.nickname });
    setPickerFor(null);
    setCooldowns((prev) => ({ ...prev, [target.user_id]: INVITE_COOLDOWN_SECONDS }));
  }

  return (
    <main className="min-h-dvh px-5 pb-28 pt-10">
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
              <Link href={`/profile/${p.player_id}`} onContextMenu={suppressContextMenu} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar photoUrl={p.photo_url} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-primary">{p.nickname}</p>
                  <p className="stat-mono text-xs text-ink-muted">{p.player_id}</p>
                </div>
              </Link>
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
        {friends.map((f, i) => {
          const cooldown = cooldowns[f.user_id] ?? 0;
          return (
            <motion.div key={f.user_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-panel flex items-center gap-3 p-3">
              <Link href={`/profile/${f.player_id}`} onContextMenu={suppressContextMenu} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="relative">
                  <Avatar photoUrl={f.photo_url} />
                  {f.online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-cyan ring-2 ring-void" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-primary">{f.nickname}</p>
                  {f.online ? (
                    <p className="text-xs text-cyan">Online</p>
                  ) : (
                    <p className="text-xs text-ink-muted">{f.last_seen_label ?? "Last seen recently"}</p>
                  )}
                </div>
              </Link>
              {f.online && (
                <button
                  onClick={() => setPickerFor(f)}
                  disabled={cooldown > 0}
                  aria-label={`Duel ${f.nickname}`}
                  className="icon-badge h-9 w-9 shrink-0 bg-cyan text-void disabled:opacity-50"
                >
                  {cooldown > 0 ? <span className="stat-mono text-[11px]">{cooldown}s</span> : <Swords size={16} />}
                </button>
              )}
              <button
                onClick={() => openConversation({ user_id: f.user_id, nickname: f.nickname })}
                aria-label={`Message ${f.nickname}`}
                className="icon-badge h-9 w-9 shrink-0 bg-white/5 text-ink-muted"
              >
                <span className="relative inline-flex">
                  <MessageCircle size={20} strokeWidth={2} />
                  {!!unreadBySender[f.user_id] && (
                    <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-magenta ring-1 ring-void" />
                  )}
                </span>
              </button>
            </motion.div>
          );
        })}
      </div>

      {notice && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-center text-sm text-magenta">
          {notice}
        </motion.p>
      )}

      <GameInvitePickerSheet target={pickerFor} onClose={() => setPickerFor(null)} onPick={sendInvite} />
      <OutgoingInviteToast target={pendingInvite} onDismiss={() => setPendingInvite(null)} />
    </main>
  );
}

function Avatar({ photoUrl }: { photoUrl?: string | null }) {
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-raised bg-cover bg-center" style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined} />
  );
}
