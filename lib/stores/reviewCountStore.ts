/**
 * The sidebar's Review count: the decisions waiting, as the Review workspace
 * last counted them in this session. Null until Review has loaded once; a
 * server count endpoint can replace this later (content-workspace README 6).
 */

import { create } from "zustand";

interface ReviewCountState {
  count: number | null;
  setCount: (count: number | null) => void;
}

export const useReviewCountStore = create<ReviewCountState>((set) => ({
  count: null,
  setCount: (count) => set({ count }),
}));
