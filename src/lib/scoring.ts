import type { Quadrant } from '../data/types';

// --- Types ---

export interface IndicatorDef {
  axis: 'Formal' | 'Substantive';
  dimension_code: string;
  dimension: string;
  indicator_code: string;
  indicator: string;
  max_score: number;
}

export interface BaselineScore {
  row_id: string;
  country: string;
  iso3: string;
  indicator_code: string;
  score: number;
  confidence: 'High' | 'Medium' | 'Low';
  evidence_note: string;
  primary_source_url: string;
}

export interface CohortSummary {
  country: string;
  iso3: string;
  formal_pct: number;
  substantive_pct: number;
  quadrant: Quadrant;
}

export interface IndicatorScore {
  score: number | null;
  evidence: string;
  source_url: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface ScoringSession {
  session_id: string;
  country: string;
  iso3: string;
  is_new_country: boolean;
  started_at: string;
  last_saved_at: string;
  step: number;
  scores: Record<string, IndicatorScore>;
}

export interface ComputedResult {
  formal_avg: number;
  formal_pct: number;
  substantive_avg: number;
  substantive_pct: number;
  gap_pp: number;
  quadrant: Quadrant;
  position_label: string;
  scored_formal: number;
  total_formal: number;
  scored_substantive: number;
  total_substantive: number;
}

// --- Constants ---

const FORMAL_COUNT = 24;
const SUBSTANTIVE_COUNT = 20;
const MAX_SCORE = 3;

const POSITION_LABELS: Record<Quadrant, string> = {
  theatre: 'Sovereignty Theatre',
  interdep: 'Negotiated Interdependence',
  adhoc: 'Ad-Hoc Capability',
  depend: 'Dependency by Default',
};

// --- Computation ---

export function classifyQuadrant(formal_pct: number, substantive_pct: number): Quadrant {
  if (formal_pct >= 50 && substantive_pct >= 50) return 'interdep';
  if (formal_pct >= 50) return 'theatre';
  if (substantive_pct >= 50) return 'adhoc';
  return 'depend';
}

export function computeResult(
  scores: Record<string, IndicatorScore>,
  indicators: IndicatorDef[],
): ComputedResult {
  let formalSum = 0;
  let formalCount = 0;
  let substantiveSum = 0;
  let substantiveCount = 0;

  for (const ind of indicators) {
    const entry = scores[ind.indicator_code];
    if (entry && entry.score !== null) {
      if (ind.axis === 'Formal') {
        formalSum += entry.score;
        formalCount++;
      } else {
        substantiveSum += entry.score;
        substantiveCount++;
      }
    }
  }

  const formal_avg = formalCount > 0 ? formalSum / formalCount : 0;
  const substantive_avg = substantiveCount > 0 ? substantiveSum / substantiveCount : 0;
  const formal_pct = Math.round((formal_avg / MAX_SCORE) * 1000) / 10;
  const substantive_pct = Math.round((substantive_avg / MAX_SCORE) * 1000) / 10;
  const gap_pp = Math.round((formal_pct - substantive_pct) * 10) / 10;
  const quadrant = classifyQuadrant(formal_pct, substantive_pct);

  return {
    formal_avg: Math.round(formal_avg * 100) / 100,
    formal_pct,
    substantive_avg: Math.round(substantive_avg * 100) / 100,
    substantive_pct,
    gap_pp,
    quadrant,
    position_label: POSITION_LABELS[quadrant],
    scored_formal: formalCount,
    total_formal: FORMAL_COUNT,
    scored_substantive: substantiveCount,
    total_substantive: SUBSTANTIVE_COUNT,
  };
}

// --- localStorage ---

const STORAGE_PREFIX = 'sp_wizard_';

export function saveSession(session: ScoringSession): void {
  const key = STORAGE_PREFIX + session.session_id;
  session.last_saved_at = new Date().toISOString();
  localStorage.setItem(key, JSON.stringify(session));
  const index = getSavedSessionIds();
  if (!index.includes(session.session_id)) {
    index.push(session.session_id);
    localStorage.setItem(STORAGE_PREFIX + '_index', JSON.stringify(index));
  }
}

export function loadSession(session_id: string): ScoringSession | null {
  const key = STORAGE_PREFIX + session_id;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw) as ScoringSession;
}

export function getSavedSessionIds(): string[] {
  const raw = localStorage.getItem(STORAGE_PREFIX + '_index');
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

export function deleteSession(session_id: string): void {
  localStorage.removeItem(STORAGE_PREFIX + session_id);
  const index = getSavedSessionIds().filter((id) => id !== session_id);
  localStorage.setItem(STORAGE_PREFIX + '_index', JSON.stringify(index));
}

// --- JSON export ---

export function exportSessionAsJson(session: ScoringSession, result: ComputedResult): string {
  const payload = {
    ...session,
    computed: result,
    exported_at: new Date().toISOString(),
    framework_version: 'v2.2',
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- CSV export ---

export function exportSessionAsCsv(
  session: ScoringSession,
  indicators: IndicatorDef[],
  result: ComputedResult,
): string {
  const rows: string[] = [];
  rows.push('indicator_code,indicator,axis,dimension,score,confidence,evidence,source_url');

  for (const ind of indicators) {
    const entry = session.scores[ind.indicator_code];
    const score = entry?.score !== null && entry?.score !== undefined ? String(entry.score) : '';
    const confidence = entry?.confidence || '';
    const evidence = csvEscape(entry?.evidence || '');
    const source = csvEscape(entry?.source_url || '');
    rows.push(`${ind.indicator_code},${csvEscape(ind.indicator)},${ind.axis},${csvEscape(ind.dimension)},${score},${confidence},${evidence},${source}`);
  }

  // Append summary row
  rows.push('');
  rows.push(`# Country: ${session.country}`);
  rows.push(`# Formal: ${result.formal_pct}%`);
  rows.push(`# Substantive: ${result.substantive_pct}%`);
  rows.push(`# Gap: ${result.gap_pp} pp`);
  rows.push(`# Quadrant: ${result.position_label}`);
  rows.push(`# Framework: v2.3`);
  rows.push(`# Exported: ${new Date().toISOString()}`);

  return rows.join('\n');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- PNG export from SVG ---

export function downloadSvgAsPng(svgElement: SVGSVGElement, filename: string): void {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const scale = 2; // 2x for retina
    const canvas = document.createElement('canvas');
    canvas.width = svgElement.viewBox.baseVal.width * scale;
    canvas.height = svgElement.viewBox.baseVal.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');

    URL.revokeObjectURL(url);
  };
  img.src = url;
}

// --- Baseline pre-population ---

export function buildBaselineScores(
  iso3: string,
  allScores: BaselineScore[],
): Record<string, IndicatorScore> {
  const result: Record<string, IndicatorScore> = {};
  for (const s of allScores) {
    if (s.iso3 === iso3) {
      result[s.indicator_code] = {
        score: s.score,
        evidence: s.evidence_note || '',
        source_url: s.primary_source_url || '',
        confidence: s.confidence,
      };
    }
  }
  return result;
}
