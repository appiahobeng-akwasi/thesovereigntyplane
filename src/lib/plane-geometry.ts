export const PLANE = {
  W: 760,
  H: 660,
  ml: 84,
  mr: 56,
  mt: 64,
  mb: 84,
  get iw() { return this.W - this.ml - this.mr; },
  get ih() { return this.H - this.mt - this.mb; },
  x(v: number) { return this.ml + (v / 100) * this.iw; },
  y(v: number) { return this.mt + this.ih - (v / 100) * this.ih; },
} as const & {
  readonly W: number;
  readonly H: number;
  readonly ml: number;
  readonly mr: number;
  readonly mt: number;
  readonly mb: number;
  readonly iw: number;
  readonly ih: number;
  x(v: number): number;
  y(v: number): number;
};

export function quadrantColor(q: string): string {
  const map: Record<string, string> = {
    theatre: '#8a3a2a',
    interdep: '#2d5a3a',
    adhoc: '#8a6a1f',
    depend: '#6b6862',
  };
  return map[q] ?? '#8a8680';
}

export function quadrantColorSoft(q: string): string {
  const map: Record<string, string> = {
    theatre: 'rgba(138, 58, 42, 0.18)',
    interdep: 'rgba(45, 90, 58, 0.2)',
    adhoc: 'rgba(138, 106, 31, 0.18)',
    depend: 'rgba(107, 104, 98, 0.15)',
  };
  return map[q] ?? 'rgba(138, 134, 128, 0.1)';
}

export function quadrantWashColor(q: string): string {
  const map: Record<string, string> = {
    theatre: 'rgba(138, 58, 42, 0.04)',
    interdep: 'rgba(45, 90, 58, 0.04)',
    adhoc: 'rgba(138, 106, 31, 0.04)',
    depend: 'rgba(107, 104, 98, 0.03)',
  };
  return map[q] ?? 'transparent';
}

export function quadrantName(q: string): string {
  const map: Record<string, string> = {
    theatre: 'Sovereignty Theatre',
    interdep: 'Negotiated Interdependence',
    adhoc: 'Ad-Hoc Capability',
    depend: 'Dependency by Default',
  };
  return map[q] ?? q;
}
