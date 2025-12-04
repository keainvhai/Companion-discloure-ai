import { create } from "zustand";
import { persist } from "zustand/middleware";

const initialMessagesByMode = {
  chatA: [
    {
      role: "assistant",
      content: "I'm your Ai Assistant, how are you doing today?",
      mood: "neutral",
    },
  ],
  chatB: [
    {
      role: "assistant",
      content: "I'm your Ai Assistant, how are you doing today?",
      mood: "neutral",
    },
  ],
  chatC: [
    {
      role: "assistant",
      content: "I'm your Ai Assistant, how are you doing today?",
      mood: "neutral",
    },
  ],
};

const initialConversationIdByMode = {
  chatA: null,
  chatB: null,
  chatC: null,
};

export const useUsernameStore = create(
  persist(
    (set) => ({
      username: "",
      isLocked: false,

      // ⭐ 按模式分开存
      messagesByMode: initialMessagesByMode,
      conversationIdByMode: initialConversationIdByMode,

      // username 相关
      setUsername: (name) => set({ username: name }),
      lockUsername: () => set({ isLocked: true }),

      // ⭐ 往某个模式里追加一条消息
      addMessage: (mode, msg) =>
        set((state) => ({
          messagesByMode: {
            ...state.messagesByMode,
            [mode]: [...(state.messagesByMode[mode] || []), msg],
          },
        })),

      // ⭐ 覆盖某个模式的消息（用得少）
      setMessages: (mode, messages) =>
        set((state) => ({
          messagesByMode: {
            ...state.messagesByMode,
            [mode]: messages,
          },
        })),

      // ⭐ 设置某个模式的 conversationId
      setConversationId: (mode, id) =>
        set((state) => ({
          conversationIdByMode: {
            ...state.conversationIdByMode,
            [mode]: id,
          },
        })),

      // 重置所有
      reset: () =>
        set({
          username: "",
          isLocked: false,
          messagesByMode: initialMessagesByMode,
          conversationIdByMode: initialConversationIdByMode,
        }),
    }),
    {
      // 改个 key，避免老结构冲突；如果之前有旧数据，建议在 DevTools 里手动清一下 localStorage
      name: "chat-store-v2",
    }
  )
);
