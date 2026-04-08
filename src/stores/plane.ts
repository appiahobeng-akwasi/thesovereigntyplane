import { create } from 'zustand';
import type { Country, Scope, View, Quadrant } from '../data/types';

const MAX_SELECTED = 4;

interface PlaneStore {
  view: View;
  scope: Scope;
  selected: Country[];
  hoveredQuadrant: Quadrant | null;
  setView: (view: View) => void;
  setScope: (scope: Scope) => void;
  toggleSelected: (country: Country) => void;
  clearSelected: () => void;
  setHoveredQuadrant: (q: Quadrant | null) => void;
}

export const usePlaneStore = create<PlaneStore>((set, get) => ({
  view: 'plane',
  scope: 'africa',
  selected: [],
  hoveredQuadrant: null,
  setView: (view) => set({ view, selected: [] }),
  setScope: (scope) => set({ scope, selected: [] }),
  toggleSelected: (country) => {
    const { selected } = get();
    const idx = selected.findIndex((c) => c.iso_code === country.iso_code);
    if (idx >= 0) {
      // Deselect
      set({ selected: selected.filter((_, i) => i !== idx) });
    } else if (selected.length < MAX_SELECTED) {
      // Add
      set({ selected: [...selected, country] });
    } else {
      // At max — drop oldest, add new
      set({ selected: [...selected.slice(1), country] });
    }
  },
  clearSelected: () => set({ selected: [] }),
  setHoveredQuadrant: (hoveredQuadrant) => set({ hoveredQuadrant }),
}));
