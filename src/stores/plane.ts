import { create } from 'zustand';
import type { Country, Scope, View, Quadrant } from '../data/types';

interface PlaneStore {
  view: View;
  scope: Scope;
  selected: Country | null;
  hoveredQuadrant: Quadrant | null;
  setView: (view: View) => void;
  setScope: (scope: Scope) => void;
  setSelected: (country: Country | null) => void;
  setHoveredQuadrant: (q: Quadrant | null) => void;
}

export const usePlaneStore = create<PlaneStore>((set) => ({
  view: 'plane',
  scope: 'africa',
  selected: null,
  hoveredQuadrant: null,
  setView: (view) => set({ view, selected: null }),
  setScope: (scope) => set({ scope, selected: null }),
  setSelected: (selected) => set({ selected }),
  setHoveredQuadrant: (hoveredQuadrant) => set({ hoveredQuadrant }),
}));
