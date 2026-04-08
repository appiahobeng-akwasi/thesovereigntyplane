import { create } from 'zustand';
import type { Country, Scope, View } from '../data/types';

interface PlaneStore {
  view: View;
  scope: Scope;
  selected: Country | null;
  setView: (view: View) => void;
  setScope: (scope: Scope) => void;
  setSelected: (country: Country | null) => void;
}

export const usePlaneStore = create<PlaneStore>((set) => ({
  view: 'plane',
  scope: 'africa',
  selected: null,
  setView: (view) => set({ view, selected: null }),
  setScope: (scope) => set({ scope, selected: null }),
  setSelected: (selected) => set({ selected }),
}));
