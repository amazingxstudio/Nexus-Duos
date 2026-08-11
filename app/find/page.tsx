"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Swords, Hash, ArrowRight, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

interface RoomResponse { room: { code: string }; }

export default function FindPage() {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createRoom() {
    setLoading("create"); setError(null);
    try {
      const res = await apiFetch<RoomResponse>("/rooms", { method: "POST", token });
      router.push(`/room/${res.room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
      setLoading(null);
    }
  }

  async function joinRoom() {
    if (!joinCode.trim()) return;
    setLoading("join"); setError(null);
    try {
      const res = await apiFetch<RoomResponse>("/rooms/join", { method: "POST", token, body: JSON.stringify({ code: joinCode.trim().toUpperCase() }) });
      router.push(`/room/${res.room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
      setLoading(null);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="font-display text-xs uppercase tracking-[0.35em] text-violet">Matchmaking</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">Find your duel</h1>
      </motion.div>

      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} onClick={createRoom} disabled={loading !== null} className="btn-primary w-full max-w-xs">
        {loading === "create" ? <Loader2 size={18} className="animate-spin" /> : <Swords size={18} strokeWidth={2.25} />}
        {loading === "create" ? "Creating…" : "Create Room"}
      </motion.button>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex w-full max-w-xs items-center gap-3 text-ink-muted">
        <div className="h-px flex-1 bg-white/10" /><span className="text-xs uppercase tracking-widest">or join</span><div className="h-px flex-1 bg-white/10" />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex w-full max-w-xs flex-col gap-3">
        <div className="glass-panel flex items-center gap-2 px-4 py-3">
          <Hash size={16} className="text-ink-faint" />
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="NDUO-CYBER-829381" className="selectable stat-mono w-full bg-transparent text-ink-primary outline-none placeholder:text-ink-faint" />
        </div>
        <button onClick={joinRoom} disabled={loading !== null || !joinCode.trim()} className="btn-ghost w-full">
          {loading === "join" ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} strokeWidth={2.25} />}
          Join Room
        </button>
      </motion.div>

      {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-magenta">{error}</motion.p>}
    </main>
  );
}
