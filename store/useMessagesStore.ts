import { create } from "zustand";

export interface MessageTarget {
  user_id: string;
  nickname: string;
}

interface MessagesState {
  /** Which conversation (if any) is currently open in the global
   *  MessagePanel — used so an incoming dm:received for that sender
   *  appends straight into the open panel instead of also popping a
   *  notification banner / bumping the unread dot. */
  openTarget: MessageTarget | null;
  /** Unread DM count per sender, keyed by user_id — drives the small
   *  message-dot badges on the Friends page and the Friends entry point
   *  on Find. */
  unreadBySender: Record<string, number>;
  /** Epoch ms until which incoming-DM notification banners/sound are
   *  suppressed (set by swiping a banner away — see
   *  MessageNotificationToast.tsx). Unread dots still update while
   *  muted; only the popup + sound are held back. */
  mutedUntil: number;
  openConversation: (target: MessageTarget) => void;
  closeConversation: () => void;
  incrementUnread: (userId: string) => void;
  markRead: (userId: string) => void;
  muteFor: (ms: number) => void;
}

export const useMessagesStore = create<MessagesState>((set) => ({
  openTarget: null,
  unreadBySender: {},
  mutedUntil: 0,
  openConversation: (target) =>
    set((s) => {
      if (!s.unreadBySender[target.user_id]) return { openTarget: target };
      const next = { ...s.unreadBySender };
      delete next[target.user_id];
      return { openTarget: target, unreadBySender: next };
    }),
  closeConversation: () => set({ openTarget: null }),
  incrementUnread: (userId) =>
    set((s) => ({ unreadBySender: { ...s.unreadBySender, [userId]: (s.unreadBySender[userId] ?? 0) + 1 } })),
  markRead: (userId) =>
    set((s) => {
      if (!s.unreadBySender[userId]) return s;
      const next = { ...s.unreadBySender };
      delete next[userId];
      return { unreadBySender: next };
    }),
  muteFor: (ms) => set({ mutedUntil: Date.now() + ms }),
}));
