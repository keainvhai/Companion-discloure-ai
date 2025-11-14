import { create } from "zustand";

export const useUsernameStore = create((set) => ({
  username: "",
  isLocked: false,

  setUsername: (name) => set({ username: name }),
  lockUsername: () => set({ isLocked: true }),
}));
