import { create } from 'zustand';

export const usePlazaUi = create((set) => ({
  panel: null,
  selectedPostId: null,
  selectedCharacterId: null,
  openPanel: (panel, options = {}) => set({ panel, ...options }),
  closePanel: () => set({ panel: null, selectedPostId: null, selectedCharacterId: null })
}));
