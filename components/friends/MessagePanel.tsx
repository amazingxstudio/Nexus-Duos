"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Smile } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useSocket } from "@/components/providers/SocketProvider";

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  mine: boolean;
  created_at: string | null;
}

interface MessagePanelProps {
  target: { user_id: string; nickname: string } | null;
  onClose: () => void;
}

// Preset call-to-duel lines — the fastest way to say "come play" without
// typing. The custom text field below still covers everything else.
const QUICK_MESSAGES = ["ဆော့ကြရအောင်", "Duel လာလုပ်ကြရအောင်", "အွန်လိုင်းရှိလား?", "နောက်တစ်ပွဲ ကစားမလား?"];

// A small curated set rather than a full emoji-picker package — this
// environment has no way to add a new dependency, and a chat this
// lightweight (20-message cap, 24h retention — see backend/app/messaging.py)
// doesn't need a searchable picker, just quick access to the handful of
// reactions people actually reach for mid-duel.
const EMOJIS = ["😀", "😂", "🔥", "🎮", "🏆", "😎", "👍", "👏", "😢", "😡", "❤️", "⚡", "🤝", "😴", "🎉", "🙏"];

/**
 * Bottom sheet opened from the Friends list "Message" button (spec D.14).
 * History loads via REST on open; new messages arrive/echo via the
 * "dm:send" / "dm:received" / "dm:sent" socket events (see sockets.py) —
 * no optimistic local append, the sent bubble only appears once the
 * server's own "dm:sent" echo confirms it, which keeps this dead simple
 * with no reconciliation logic needed.
 */
export function MessagePanel({ target, onClose }: MessagePanelProps) {
  const token = useAuthStore((s) => s.token);
  const myId = useAuthStore((s) => s.user?.id);
  const socket = useSocket();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!target) { setMessages(null); return; }
    setMessages(null);
    setShowEmoji(false);
    setSending(false);
    apiFetch<{ messages: ChatMessage[] }>(`/messages/${target.user_id}`, { token })
      .then((res) => setMessages(res.messages))
      .catch(() => setMessages([]));
  }, [target, token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket || !target) return;
    function onReceived(data: ChatMessage) {
      if (data.sender_id !== target!.user_id) return;
      setMessages((prev) => [...(prev ?? []), { ...data, mine: false }]);
    }
    function onSent(data: ChatMessage) {
      if (data.sender_id !== myId) return;
      setMessages((prev) => [...(prev ?? []), { ...data, mine: true }]);
      setSending(false);
    }
    socket.on("dm:received", onReceived);
    socket.on("dm:sent", onSent);
    return () => {
      socket.off("dm:received", onReceived);
      socket.off("dm:sent", onSent);
    };
  }, [socket, target, myId]);

  function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || !target || sending) return;
    setSending(true);
    socket?.emit("dm:send", { to_user_id: target.user_id, content: trimmed });
    setText("");
    setShowEmoji(false);
  }

  function addEmoji(e: string) {
    setText((t) => t + e);
  }

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-end justify-center bg-void/70 backdrop-blur-glass"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="glass-panel flex h-[85vh] max-h-[85vh] w-full flex-col rounded-t-3xl rounded-b-none p-4 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-ink-primary">Message {target.nickname}</p>
              <button onClick={onClose} className="icon-badge h-8 w-8 bg-white/5 text-ink-muted"><X size={14} /></button>
            </div>

            <div ref={scrollRef} className="mb-3 flex min-h-[160px] flex-1 flex-col gap-2 overflow-y-auto">
              {messages === null && <div className="glass-panel h-14 animate-pulse-glow p-3" />}
              {messages?.length === 0 && (
                <p className="mt-6 text-center text-xs text-ink-muted">No messages yet — say hi, or call them over for a duel.</p>
              )}
              {messages?.map((m) => (
                <div
                  key={m.id}
                  className={`selectable max-w-[80%] rounded-card px-3 py-2 text-sm ${m.mine ? "ml-auto bg-cyan/15 text-ink-primary" : "glass-panel text-ink-primary"}`}
                >
                  {m.content}
                </div>
              ))}
            </div>

            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_MESSAGES.map((q) => (
                <button key={q} onClick={() => send(q)} disabled={sending} className="glass-card border border-white/[0.08] px-2.5 py-1 text-xs text-ink-muted disabled:opacity-50">
                  {q}
                </button>
              ))}
            </div>

            {showEmoji && (
              <div className="mb-2 grid grid-cols-8 gap-1 rounded-card border border-white/[0.08] bg-white/5 p-2">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => addEmoji(e)} className="text-lg leading-none">{e}</button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEmoji((v) => !v)}
                aria-label="Emoji"
                className={`icon-badge h-9 w-9 shrink-0 ${showEmoji ? "bg-cyan/15 text-cyan" : "bg-white/5 text-ink-muted"}`}
              >
                <Smile size={16} />
              </button>
              <div className="glass-panel flex flex-1 items-center px-3 py-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(text); }}
                  placeholder="Type a message…"
                  maxLength={500}
                  className="selectable w-full bg-transparent text-sm text-ink-primary outline-none placeholder:text-ink-faint"
                />
              </div>
              <button onClick={() => send(text)} disabled={!text.trim() || sending} aria-label="Send" className="icon-badge h-9 w-9 shrink-0 bg-cyan text-void disabled:opacity-50">
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
