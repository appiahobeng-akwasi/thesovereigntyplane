# Scoring Wizard v0a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-service scoring wizard at `/score` that lets a policy analyst walk through 44 indicators, score a country, and see it plotted on the Sovereignty Plane alongside the existing 19-country cohort.

**Architecture:** Static Astro page with a single React island (`ScoringWizard`) managing all wizard state via Zustand. Data loaded from existing JSON files at build time and passed as props. All user session state persists in browser `localStorage`. No server-side persistence, no API calls, no accounts.

**Tech Stack:** Astro 5 (static), React 19, Zustand 5, TypeScript, CSS custom properties (existing design system), SVG scatter plot (adapted from existing `Plane.tsx`).

---

## Critical architecture notes for implementers

### Axis mapping (DO NOT get this wrong)

The existing Plane uses **substantive on the x-axis** and **formal on the y-axis**:
- `cx = P.x(c.substantive_score)` — x is substantive
- `cy = P.y(c.formal_score)` — y is formal (SVG-inverted: high value = top)

### Quadrant boundaries (crossing at 50)

| Quadrant | Formal | Substantive | SVG position |
|----------|--------|-------------|--------------|
| `theatre` | >= 50 | < 50 | top-left |
| `interdep` | >= 50 | >= 50 | top-right |
| `adhoc` | < 50 | >= 50 | bottom-right |
| `depend` | < 50 | < 50 | bottom-left |

### Score computation

Each indicator scores 0-3 (`max_score: 3`). There are 24 formal indicators (F1-F6, 4 each) and 20 substantive indicators (S1-S5, 4 each).

```
formal_avg = sum(all formal indicator scores) / 24
formal_pct = formal_avg / 3 * 100
substantive_avg = sum(all substantive indicator scores) / 20
substantive_pct = substantive_avg / 3 * 100
gap_pp = formal_pct - substantive_pct
quadrant = classify(formal_pct, substantive_pct)
```

### Data file schemas (all in `src/data/`)

**indicators.json** (44 entries):
```json
{ "axis": "Formal", "dimension_code": "F1", "dimension": "National AI Strategy",
  "indicator_code": "F1.1", "indicator": "National AI strategy status", "max_score": 3 }
```

**scores.json** (836 entries = 19 countries x 44 indicators):
```json
{ "row_id": "EGY_F1.1", "country": "Egypt", "iso3": "EGY", "region": "North Africa",
  "sample_group": "Core sample", "axis": "Formal", "dimension_code": "F1",
  "dimension": "National AI Strategy", "indicator_code": "F1.1",
  "indicator": "National AI strategy status", "score": 3, "confidence": "High",
  "validation_status": "AI-assisted", "primary_source_url": "",
  "evidence_note": "National AI Strategy 2nd Edition...", "scorer": "...", "score_date": "2026-04-25" }
```

**summary.json** (19 entries):
```json
{ "country": "Egypt", "iso3": "EGY", "formal_avg": 2.5, "formal_pct": 83.3,
  "substantive_avg": 1.15, "substantive_pct": 38.3, "gap_pp": 45.0,
  "quadrant": "theatre", "position_label": "Sovereignty Theatre" }
```

**countries.json** (19 entries):
```json
{ "country": "Egypt", "iso3": "EGY", "region": "North Africa",
  "sample_group": "Core sample", "slug": "egypt" }
```

### Dimensions (11 total)

**Formal axis (6 dimensions, 24 indicators):**
- F1: National AI Strategy (F1.1-F1.4)
- F2: Data Protection Law (F2.1-F2.4)
- F3: Regulatory Institutions (F3.1-F3.4)
- F4: International Commitments (F4.1-F4.4)
- F5: Digital Infrastructure Policy (F5.1-F5.4)
- F6: Partnership Architecture (F6.1-F6.4)

**Substantive axis (5 dimensions, 20 indicators):**
- S1: Enforcement Capacity (S1.1-S1.4)
- S2: Procurement Power (S2.1-S2.4)
- S3: Assurance Infrastructure (S3.1-S3.4)
- S4: Delivery Capability (S4.1-S4.4)
- S5: Negotiation Capacity (S5.1-S5.4)

### Existing files to reuse (DO NOT rebuild these)

- `src/lib/plane-geometry.ts` — `PLANE` constants, `quadrantColor()`, `quadrantName()`
- `src/lib/coherence.ts` — `getQuadrantDescription()`, `getCoherenceAdvice()`
- `src/styles/tokens.css` — all CSS variables (colors, quadrant tokens)
- `src/data/types.ts` — `Quadrant` type

### Visual identity rules

- Fonts: Instrument Serif (display/italic), Inter Variable (body), JetBrains Mono Variable (micro labels)
- No emojis
- CSS variables only (no hardcoded colors)
- Hairline 1px rules, no card shadows
- Buttons: 1px border, transparent bg, mono font, uppercase 10.5px, padding 6px 12px, border-radius 2px
- Active state: black bg, off-white text
- Tabular numerals for all numeric displays
- Section markers: `§ Formal axis · F1` in mono, all caps

---

## File structure

```
src/pages/score.astro                      # /score route — loads data, mounts wizard island
src/components/scoring/ScoringWizard.tsx    # Root React island — step router
src/components/scoring/LandingScreen.tsx    # Screen 1 — hero + CTA
src/components/scoring/CountrySetup.tsx     # Screen 2 — country picker + session name
src/components/scoring/DimensionScreen.tsx  # Screens 3-13 — reusable per-dimension view
src/components/scoring/IndicatorCard.tsx    # Single indicator: toggle + evidence + confidence
src/components/scoring/ScoreToggle.tsx      # 0/1/2/3 button group
src/components/scoring/ReviewScreen.tsx     # Screen 14 — results + plane + export
src/components/scoring/ResultPlane.tsx      # Mini SVG scatter plot for results
src/components/scoring/WizardProgress.tsx   # Progress bar at top of wizard
src/stores/scoring.ts                       # Zustand store for all wizard state
src/lib/scoring.ts                          # Compute composites, localStorage, JSON export
src/styles/scoring.css                      # All wizard-specific styles
```

---

## Task 1: Scoring types and computation logic

**Files:**
- Create: `src/lib/scoring.ts`

This is the pure logic core. Build and test it before any UI.

- [ ] **Step 1: Create the scoring types and computation functions**

Create `src/lib/scoring.ts`:

```typescript
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
  // Also maintain an index of session IDs for the resume picker
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
```

- [ ] **Step 2: Verify the computation against known data**

Run a quick verification in the dev console or via a temporary script. Egypt should produce:
- `formal_pct` close to 83.3
- `substantive_pct` close to 38.3
- `quadrant` = `'theatre'`

Open `src/data/scores.json`, filter for Egypt, sum its 24 formal scores and 20 substantive scores, and confirm the `computeResult` function matches `summary.json`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/scoring.ts
git commit -m "feat(wizard): add scoring computation, localStorage, and JSON export utilities"
```

---

## Task 2: Zustand scoring store

**Files:**
- Create: `src/stores/scoring.ts`

- [ ] **Step 1: Create the scoring store**

Create `src/stores/scoring.ts`:

```typescript
import { create } from 'zustand';
import type { IndicatorScore, ScoringSession, IndicatorDef } from '../lib/scoring';

// Dimensions in order: F1-F6, then S1-S5
export const DIMENSION_ORDER = [
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
  'S1', 'S2', 'S3', 'S4', 'S5',
] as const;

// Steps: 0=landing, 1=country-setup, 2-12=dimensions (F1-S5), 13=review
export const STEP_LANDING = 0;
export const STEP_COUNTRY_SETUP = 1;
export const STEP_FIRST_DIMENSION = 2;
export const STEP_LAST_DIMENSION = 12;
export const STEP_REVIEW = 13;
export const TOTAL_STEPS = 14;

export function dimensionForStep(step: number): string | null {
  if (step < STEP_FIRST_DIMENSION || step > STEP_LAST_DIMENSION) return null;
  return DIMENSION_ORDER[step - STEP_FIRST_DIMENSION];
}

interface ScoringStore {
  // Session state
  step: number;
  session: ScoringSession | null;

  // Navigation
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Session lifecycle
  startSession: (session: ScoringSession) => void;
  clearSession: () => void;

  // Scoring
  setIndicatorScore: (code: string, value: Partial<IndicatorScore>) => void;
}

export const useScoringStore = create<ScoringStore>((set) => ({
  step: STEP_LANDING,
  session: null,

  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, STEP_REVIEW) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, STEP_LANDING) })),

  startSession: (session) => set({ session, step: STEP_FIRST_DIMENSION }),
  clearSession: () => set({ session: null, step: STEP_LANDING }),

  setIndicatorScore: (code, value) =>
    set((s) => {
      if (!s.session) return s;
      const current = s.session.scores[code] || {
        score: null,
        evidence: '',
        source_url: '',
        confidence: 'Medium' as const,
      };
      return {
        session: {
          ...s.session,
          scores: {
            ...s.session.scores,
            [code]: { ...current, ...value },
          },
        },
      };
    }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/scoring.ts
git commit -m "feat(wizard): add Zustand scoring store with step navigation"
```

---

## Task 3: Wizard CSS

**Files:**
- Create: `src/styles/scoring.css`

- [ ] **Step 1: Create the wizard stylesheet**

Create `src/styles/scoring.css`. This file defines all wizard-specific styles. Uses CSS variables from `tokens.css`.

```css
/* ── Wizard layout ── */

.wizard {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 56px;
  min-height: 100vh;
}

/* ── Landing screen ── */

.wizard-landing {
  padding-top: 160px;
  padding-bottom: 120px;
}

.wizard-landing-question {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  font-size: clamp(36px, 5vw, 64px);
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin-bottom: 32px;
}

.wizard-landing-question em {
  font-style: italic;
}

.wizard-landing-body {
  font-family: 'Inter Variable', sans-serif;
  font-size: 15px;
  font-weight: 400;
  color: var(--ink-2);
  line-height: 1.6;
  max-width: 560px;
  margin-bottom: 40px;
}

.wizard-landing-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 48px;
}

.wizard-chip {
  display: inline-block;
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  border: 1px solid var(--rule);
  padding: 4px 10px;
  border-radius: 2px;
}

.wizard-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

/* ── Buttons ── */

.wizard-btn {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid var(--ink);
  background: transparent;
  color: var(--ink);
  padding: 10px 20px;
  border-radius: 2px;
  cursor: pointer;
  transition: background 150ms, color 150ms;
}

.wizard-btn:hover,
.wizard-btn:focus-visible {
  background: var(--ink);
  color: var(--paper);
}

.wizard-btn--primary {
  background: var(--ink);
  color: var(--paper);
}

.wizard-btn--primary:hover,
.wizard-btn--primary:focus-visible {
  background: var(--ink-2);
}

.wizard-btn--ghost {
  border-color: transparent;
  color: var(--ink-mute);
}

.wizard-btn--ghost:hover,
.wizard-btn--ghost:focus-visible {
  background: transparent;
  color: var(--ink);
  border-color: var(--rule);
}

/* ── Link (text-only) ── */

.wizard-link {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-mute);
  text-decoration: none;
  border-bottom: 1px solid var(--rule);
  padding-bottom: 1px;
  transition: color 150ms;
}

.wizard-link:hover {
  color: var(--ink);
}

/* ── Country setup ── */

.wizard-setup {
  padding-top: 120px;
  padding-bottom: 80px;
}

.wizard-setup-title {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  font-size: 32px;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin-bottom: 8px;
}

.wizard-setup-sub {
  font-family: 'Inter Variable', sans-serif;
  font-size: 14px;
  color: var(--ink-mute);
  margin-bottom: 48px;
}

.wizard-field {
  margin-bottom: 32px;
}

.wizard-label {
  display: block;
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin-bottom: 8px;
}

.wizard-select,
.wizard-input {
  font-family: 'Inter Variable', sans-serif;
  font-size: 15px;
  color: var(--ink);
  background: var(--paper);
  border: 1px solid var(--rule);
  padding: 10px 14px;
  border-radius: 2px;
  width: 100%;
  max-width: 400px;
  outline: none;
  transition: border-color 150ms;
}

.wizard-select:focus,
.wizard-input:focus {
  border-color: var(--ink-mute);
}

.wizard-path-toggle {
  display: flex;
  gap: 12px;
  margin-bottom: 40px;
}

.wizard-path-btn {
  flex: 1;
  max-width: 280px;
  padding: 20px;
  border: 1px solid var(--rule);
  background: transparent;
  cursor: pointer;
  text-align: left;
  border-radius: 2px;
  transition: border-color 150ms;
}

.wizard-path-btn[aria-pressed='true'] {
  border-color: var(--ink);
}

.wizard-path-btn:hover {
  border-color: var(--ink-mute);
}

.wizard-path-label {
  display: block;
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin-bottom: 6px;
}

.wizard-path-name {
  display: block;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 18px;
  color: var(--ink);
  margin-bottom: 4px;
}

.wizard-path-desc {
  display: block;
  font-family: 'Inter Variable', sans-serif;
  font-size: 12px;
  color: var(--ink-mute);
  line-height: 1.4;
}

/* ── Progress bar ── */

.wizard-progress {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
  padding: 12px 0;
}

.wizard-progress-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.wizard-progress-label {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-mute);
  white-space: nowrap;
}

.wizard-progress-bar {
  flex: 1;
  height: 2px;
  background: var(--rule);
  border-radius: 1px;
  overflow: hidden;
}

.wizard-progress-fill {
  height: 100%;
  background: var(--ink);
  transition: width 300ms ease;
}

.wizard-progress-count {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--ink-mute);
  font-variant-numeric: tabular-nums;
}

/* ── Dimension screen ── */

.wizard-dimension {
  padding-top: 32px;
  padding-bottom: 80px;
}

.wizard-dimension-header {
  margin-bottom: 48px;
}

.wizard-dimension-marker {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin-bottom: 12px;
}

.wizard-dimension-name {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  font-size: 28px;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--ink);
}

/* ── Indicator card ── */

.indicator-card {
  border-top: 1px solid var(--rule);
  padding: 28px 0;
}

.indicator-card-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 6px;
}

.indicator-card-code {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--ink-mute);
  flex-shrink: 0;
}

.indicator-card-name {
  font-family: 'Inter Variable', sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.4;
}

.indicator-card-fields {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px 24px;
  margin-top: 16px;
  align-items: start;
}

/* ── Score toggle ── */

.score-toggle {
  display: flex;
  gap: 0;
}

.score-toggle-btn {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  width: 44px;
  height: 36px;
  border: 1px solid var(--rule);
  background: transparent;
  color: var(--ink-mute);
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms;
}

.score-toggle-btn:first-child {
  border-radius: 2px 0 0 2px;
}

.score-toggle-btn:last-child {
  border-radius: 0 2px 2px 0;
}

.score-toggle-btn + .score-toggle-btn {
  border-left: none;
}

.score-toggle-btn:hover {
  background: var(--rule);
  color: var(--ink);
}

.score-toggle-btn[aria-pressed='true'] {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}

.score-toggle-btn[aria-pressed='true'] + .score-toggle-btn {
  border-left-color: var(--ink);
}

.score-toggle-label {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 9px;
  letter-spacing: 0.04em;
  color: var(--ink-mute);
  margin-top: 4px;
}

/* ── Evidence + confidence fields ── */

.indicator-evidence {
  font-family: 'Inter Variable', sans-serif;
  font-size: 13px;
  color: var(--ink);
  background: var(--paper);
  border: 1px solid var(--rule);
  padding: 8px 12px;
  border-radius: 2px;
  width: 100%;
  resize: vertical;
  min-height: 36px;
  outline: none;
  transition: border-color 150ms;
}

.indicator-evidence:focus {
  border-color: var(--ink-mute);
}

.indicator-source {
  font-family: 'Inter Variable', sans-serif;
  font-size: 13px;
  color: var(--ink-mute);
  background: var(--paper);
  border: 1px solid var(--rule);
  padding: 8px 12px;
  border-radius: 2px;
  width: 100%;
  outline: none;
  transition: border-color 150ms;
}

.indicator-source:focus {
  border-color: var(--ink-mute);
}

.confidence-toggle {
  display: flex;
  gap: 0;
}

.confidence-btn {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 5px 10px;
  border: 1px solid var(--rule);
  background: transparent;
  color: var(--ink-mute);
  cursor: pointer;
  transition: background 150ms, color 150ms;
}

.confidence-btn:first-child {
  border-radius: 2px 0 0 2px;
}

.confidence-btn:last-child {
  border-radius: 0 2px 2px 0;
}

.confidence-btn + .confidence-btn {
  border-left: none;
}

.confidence-btn[aria-pressed='true'] {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}

/* ── Dimension footer ── */

.wizard-dimension-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 32px;
  border-top: 1px solid var(--rule);
  margin-top: 16px;
}

/* ── Review screen ── */

.wizard-review {
  padding-top: 32px;
  padding-bottom: 120px;
}

.wizard-review-title {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 400;
  font-size: 32px;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin-bottom: 48px;
}

.review-scores {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 48px;
}

.review-score-card {
  padding: 20px;
  border: 1px solid var(--rule);
  border-radius: 2px;
}

.review-score-label {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin-bottom: 8px;
}

.review-score-value {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 28px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  line-height: 1;
}

.review-score-unit {
  font-size: 14px;
  font-weight: 400;
  color: var(--ink-mute);
}

.review-quadrant-pill {
  display: inline-block;
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 2px;
  color: #fafaf9;
  margin-top: 4px;
}

/* ── Result plane ── */

.result-plane-container {
  margin-bottom: 48px;
}

.result-plane-label {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin-bottom: 12px;
}

/* ── Interpretation ── */

.review-interpretation {
  border: 1px solid var(--rule);
  border-radius: 2px;
  margin-bottom: 48px;
}

.review-interpretation-toggle {
  width: 100%;
  padding: 16px 20px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.review-interpretation-title {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 18px;
  color: var(--ink);
}

.review-interpretation-chevron {
  font-size: 14px;
  color: var(--ink-mute);
  transition: transform 200ms;
}

.review-interpretation-chevron[data-open='true'] {
  transform: rotate(180deg);
}

.review-interpretation-body {
  padding: 0 20px 20px;
}

.review-interpretation-text {
  font-family: 'Inter Variable', sans-serif;
  font-size: 14px;
  color: var(--ink-2);
  line-height: 1.6;
  margin-bottom: 16px;
}

.review-advice-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.review-advice-item {
  font-family: 'Inter Variable', sans-serif;
  font-size: 13px;
  color: var(--ink-2);
  line-height: 1.5;
  padding: 6px 0;
  padding-left: 16px;
  position: relative;
}

.review-advice-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 13px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ink-mute);
}

/* ── Review actions ── */

.review-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* ── Saved sessions list ── */

.wizard-saved-sessions {
  margin-top: 40px;
  border-top: 1px solid var(--rule);
  padding-top: 32px;
}

.wizard-saved-title {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-mute);
  margin-bottom: 12px;
}

.wizard-saved-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--rule);
}

.wizard-saved-name {
  font-family: 'Inter Variable', sans-serif;
  font-size: 14px;
  color: var(--ink);
}

.wizard-saved-date {
  font-family: 'JetBrains Mono Variable', monospace;
  font-size: 10px;
  color: var(--ink-mute);
}

.wizard-saved-actions {
  display: flex;
  gap: 8px;
}

/* ── Responsive ── */

@media (max-width: 1100px) {
  .wizard {
    padding-left: 32px;
    padding-right: 32px;
  }

  .wizard-landing {
    padding-top: 100px;
  }

  .review-scores {
    grid-template-columns: repeat(2, 1fr);
  }

  .indicator-card-fields {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .wizard-path-toggle {
    flex-direction: column;
  }

  .wizard-path-btn {
    max-width: none;
  }

  .review-scores {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/scoring.css
git commit -m "feat(wizard): add wizard stylesheet"
```

---

## Task 4: ScoreToggle component

**Files:**
- Create: `src/components/scoring/ScoreToggle.tsx`

- [ ] **Step 1: Create the score toggle**

The 0/1/2/3 button group for each indicator. Not a native `<select>` -- four styled buttons.

Create `src/components/scoring/ScoreToggle.tsx`:

```tsx
interface Props {
  value: number | null;
  onChange: (score: number) => void;
}

const LABELS = ['Absent', 'Nascent', 'Enacted', 'Operational'];

export default function ScoreToggle({ value, onChange }: Props) {
  return (
    <div>
      <div className="score-toggle" role="group" aria-label="Score">
        {[0, 1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            className="score-toggle-btn"
            aria-pressed={value === n}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="score-toggle-label">
        {value !== null ? LABELS[value] : 'Not scored'}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/scoring/ScoreToggle.tsx
git commit -m "feat(wizard): add ScoreToggle 0-3 button group"
```

---

## Task 5: IndicatorCard component

**Files:**
- Create: `src/components/scoring/IndicatorCard.tsx`

- [ ] **Step 1: Create the indicator card**

Each indicator card shows the code, name, score toggle, evidence textarea, optional source URL, and confidence toggle.

Create `src/components/scoring/IndicatorCard.tsx`:

```tsx
import ScoreToggle from './ScoreToggle';
import type { IndicatorDef, IndicatorScore } from '../../lib/scoring';

interface Props {
  indicator: IndicatorDef;
  value: IndicatorScore;
  onChange: (update: Partial<IndicatorScore>) => void;
}

const CONFIDENCE_LEVELS = ['High', 'Medium', 'Low'] as const;

export default function IndicatorCard({ indicator, value, onChange }: Props) {
  return (
    <div className="indicator-card">
      <div className="indicator-card-header">
        <span className="indicator-card-code">{indicator.indicator_code}</span>
        <span className="indicator-card-name">{indicator.indicator}</span>
      </div>

      <div className="indicator-card-fields">
        <label className="wizard-label" style={{ gridColumn: '1 / -1' }}>Score</label>
        <div style={{ gridColumn: '1 / -1' }}>
          <ScoreToggle
            value={value.score}
            onChange={(score) => onChange({ score })}
          />
        </div>

        <label className="wizard-label" style={{ gridColumn: '1 / -1' }}>
          Evidence note
        </label>
        <textarea
          className="indicator-evidence"
          style={{ gridColumn: '1 / -1' }}
          value={value.evidence}
          onChange={(e) => onChange({ evidence: e.target.value })}
          placeholder="Brief evidence supporting this score..."
          maxLength={500}
          rows={2}
        />

        <label className="wizard-label" style={{ gridColumn: '1 / -1' }}>
          Source URL <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          className="indicator-source"
          style={{ gridColumn: '1 / -1' }}
          type="url"
          value={value.source_url}
          onChange={(e) => onChange({ source_url: e.target.value })}
          placeholder="https://..."
        />

        <label className="wizard-label" style={{ gridColumn: '1 / -1' }}>Confidence</label>
        <div className="confidence-toggle" style={{ gridColumn: '1 / -1' }} role="group" aria-label="Confidence level">
          {CONFIDENCE_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className="confidence-btn"
              aria-pressed={value.confidence === level}
              onClick={() => onChange({ confidence: level })}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/scoring/IndicatorCard.tsx
git commit -m "feat(wizard): add IndicatorCard with score, evidence, and confidence"
```

---

## Task 6: WizardProgress component

**Files:**
- Create: `src/components/scoring/WizardProgress.tsx`

- [ ] **Step 1: Create the progress bar**

Shows which dimension the user is on, with a thin fill bar and indicator count.

Create `src/components/scoring/WizardProgress.tsx`:

```tsx
import { useScoringStore, STEP_FIRST_DIMENSION, STEP_LAST_DIMENSION, STEP_REVIEW, dimensionForStep } from '../../stores/scoring';
import type { IndicatorDef, IndicatorScore } from '../../lib/scoring';

interface Props {
  indicators: IndicatorDef[];
  scores: Record<string, IndicatorScore>;
}

export default function WizardProgress({ indicators, scores }: Props) {
  const step = useScoringStore((s) => s.step);

  if (step < STEP_FIRST_DIMENSION) return null;

  const dimCode = dimensionForStep(step);
  const isReview = step === STEP_REVIEW;

  // Count scored indicators
  const scored = indicators.filter((ind) => {
    const s = scores[ind.indicator_code];
    return s && s.score !== null;
  }).length;

  // Progress fraction: dimension steps only
  const dimSteps = STEP_LAST_DIMENSION - STEP_FIRST_DIMENSION + 1;
  const currentDimStep = isReview ? dimSteps : step - STEP_FIRST_DIMENSION;
  const pct = (currentDimStep / dimSteps) * 100;

  // Axis label
  const currentIndicator = dimCode ? indicators.find((i) => i.dimension_code === dimCode) : null;
  const axisLabel = isReview
    ? 'Review'
    : currentIndicator
      ? `${currentIndicator.axis} axis · ${dimCode}`
      : '';

  return (
    <div className="wizard-progress" role="progressbar" aria-valuenow={scored} aria-valuemax={indicators.length}>
      <div className="wizard-progress-inner">
        <span className="wizard-progress-label">{axisLabel}</span>
        <div className="wizard-progress-bar">
          <div className="wizard-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="wizard-progress-count" aria-live="polite">
          {scored} / {indicators.length} scored
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/scoring/WizardProgress.tsx
git commit -m "feat(wizard): add WizardProgress bar with indicator count"
```

---

## Task 7: DimensionScreen component

**Files:**
- Create: `src/components/scoring/DimensionScreen.tsx`

- [ ] **Step 1: Create the reusable dimension screen**

One instance renders all four indicators for a given dimension. Used for screens 3-13 (F1 through S5).

Create `src/components/scoring/DimensionScreen.tsx`:

```tsx
import IndicatorCard from './IndicatorCard';
import { useScoringStore, dimensionForStep, STEP_FIRST_DIMENSION } from '../../stores/scoring';
import type { IndicatorDef, IndicatorScore } from '../../lib/scoring';

interface Props {
  indicators: IndicatorDef[];
}

export default function DimensionScreen({ indicators }: Props) {
  const step = useScoringStore((s) => s.step);
  const session = useScoringStore((s) => s.session);
  const setIndicatorScore = useScoringStore((s) => s.setIndicatorScore);
  const nextStep = useScoringStore((s) => s.nextStep);
  const prevStep = useScoringStore((s) => s.prevStep);

  const dimCode = dimensionForStep(step);
  if (!dimCode || !session) return null;

  const dimIndicators = indicators.filter((ind) => ind.dimension_code === dimCode);
  if (dimIndicators.length === 0) return null;

  const dimName = dimIndicators[0].dimension;
  const axisLabel = dimIndicators[0].axis;
  const dimIndex = step - STEP_FIRST_DIMENSION; // 0-10

  return (
    <div className="wizard-dimension">
      <div className="wizard-dimension-header">
        <div className="wizard-dimension-marker">
          &sect; {axisLabel} axis &middot; {dimCode}
        </div>
        <h2 className="wizard-dimension-name">{dimName}</h2>
      </div>

      {dimIndicators.map((ind) => {
        const value = session.scores[ind.indicator_code] || {
          score: null,
          evidence: '',
          source_url: '',
          confidence: 'Medium' as const,
        };
        return (
          <IndicatorCard
            key={ind.indicator_code}
            indicator={ind}
            value={value}
            onChange={(update) => setIndicatorScore(ind.indicator_code, update)}
          />
        );
      })}

      <div className="wizard-dimension-footer">
        <button type="button" className="wizard-btn wizard-btn--ghost" onClick={prevStep}>
          Previous
        </button>
        <button type="button" className="wizard-btn wizard-btn--primary" onClick={nextStep}>
          {dimIndex < 10 ? 'Next dimension' : 'Review results'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/scoring/DimensionScreen.tsx
git commit -m "feat(wizard): add DimensionScreen for indicator walkthrough"
```

---

## Task 8: LandingScreen component

**Files:**
- Create: `src/components/scoring/LandingScreen.tsx`

- [ ] **Step 1: Create the landing screen**

Screen 1: hero question, description, time estimate chip, "Get started" button, and a list of saved sessions (resume).

Create `src/components/scoring/LandingScreen.tsx`:

```tsx
import { useScoringStore, STEP_COUNTRY_SETUP } from '../../stores/scoring';
import { getSavedSessionIds, loadSession, deleteSession } from '../../lib/scoring';
import type { ScoringSession } from '../../lib/scoring';
import { useState, useEffect } from 'react';

export default function LandingScreen() {
  const setStep = useScoringStore((s) => s.setStep);
  const startSession = useScoringStore((s) => s.startSession);
  const [savedSessions, setSavedSessions] = useState<{ id: string; session: ScoringSession }[]>([]);

  useEffect(() => {
    const ids = getSavedSessionIds();
    const sessions = ids
      .map((id) => ({ id, session: loadSession(id) }))
      .filter((s): s is { id: string; session: ScoringSession } => s.session !== null);
    setSavedSessions(sessions);
  }, []);

  const handleResume = (session: ScoringSession) => {
    startSession(session);
  };

  const handleDelete = (id: string) => {
    deleteSession(id);
    setSavedSessions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="wizard-landing">
      <h1 className="wizard-landing-question">
        Where does your country<br />
        sit on the <em>Sovereignty Plane?</em>
      </h1>
      <p className="wizard-landing-body">
        Walk through forty-four indicators across eleven dimensions of formal and
        substantive sovereignty. Score each indicator, add evidence, and see your
        country plotted on the Plane alongside the existing nineteen-country cohort.
      </p>
      <div className="wizard-landing-meta">
        <span className="wizard-chip">Approx. 45 minutes</span>
        <span className="wizard-chip">44 indicators</span>
        <span className="wizard-chip">Framework v2.2</span>
      </div>
      <div className="wizard-actions">
        <button
          type="button"
          className="wizard-btn wizard-btn--primary"
          onClick={() => setStep(STEP_COUNTRY_SETUP)}
        >
          Get started
        </button>
        <a href="/methodology" className="wizard-link">
          Learn the methodology first
        </a>
      </div>

      {savedSessions.length > 0 && (
        <div className="wizard-saved-sessions">
          <h3 className="wizard-saved-title">Resume a saved session</h3>
          {savedSessions.map(({ id, session }) => (
            <div key={id} className="wizard-saved-item">
              <div>
                <div className="wizard-saved-name">{session.session_id}</div>
                <div className="wizard-saved-date">
                  {session.country} &middot; Last saved{' '}
                  {new Date(session.last_saved_at).toLocaleDateString()}
                </div>
              </div>
              <div className="wizard-saved-actions">
                <button
                  type="button"
                  className="wizard-btn"
                  onClick={() => handleResume(session)}
                >
                  Resume
                </button>
                <button
                  type="button"
                  className="wizard-btn wizard-btn--ghost"
                  onClick={() => handleDelete(id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/scoring/LandingScreen.tsx
git commit -m "feat(wizard): add LandingScreen with hero and saved session resume"
```

---

## Task 9: CountrySetup component

**Files:**
- Create: `src/components/scoring/CountrySetup.tsx`

- [ ] **Step 1: Create the country setup screen**

Screen 2: choose between Path A (existing country with pre-populated baseline) or Path B (new country, blank slate). Then enter a session name.

Create `src/components/scoring/CountrySetup.tsx`:

```tsx
import { useState } from 'react';
import { useScoringStore } from '../../stores/scoring';
import { buildBaselineScores } from '../../lib/scoring';
import type { BaselineScore, ScoringSession } from '../../lib/scoring';

interface CountryOption {
  country: string;
  iso3: string;
}

interface Props {
  countries: CountryOption[];
  baselineScores: BaselineScore[];
}

export default function CountrySetup({ countries, baselineScores }: Props) {
  const startSession = useScoringStore((s) => s.startSession);
  const prevStep = useScoringStore((s) => s.prevStep);

  const [path, setPath] = useState<'existing' | 'new'>('existing');
  const [selectedIso, setSelectedIso] = useState(countries[0]?.iso3 || '');
  const [newCountryName, setNewCountryName] = useState('');
  const [newCountryIso, setNewCountryIso] = useState('');
  const [sessionName, setSessionName] = useState('');

  const handleStart = () => {
    const isNew = path === 'new';
    const country = isNew
      ? newCountryName.trim()
      : countries.find((c) => c.iso3 === selectedIso)?.country || '';
    const iso3 = isNew ? newCountryIso.trim().toUpperCase() : selectedIso;

    if (!country) return;

    const slug = country.toLowerCase().replace(/\s+/g, '-');
    const id = sessionName.trim() || `${slug}-${new Date().getFullYear()}`;

    const scores = isNew ? {} : buildBaselineScores(iso3, baselineScores);

    const session: ScoringSession = {
      session_id: id,
      country,
      iso3,
      is_new_country: isNew,
      started_at: new Date().toISOString(),
      last_saved_at: new Date().toISOString(),
      scores,
    };

    startSession(session);
  };

  const canStart =
    path === 'existing'
      ? !!selectedIso
      : newCountryName.trim().length > 0;

  return (
    <div className="wizard-setup">
      <h2 className="wizard-setup-title">Choose your country</h2>
      <p className="wizard-setup-sub">
        Start from an existing baseline or score a new country from scratch.
      </p>

      <div className="wizard-path-toggle">
        <button
          type="button"
          className="wizard-path-btn"
          aria-pressed={path === 'existing'}
          onClick={() => setPath('existing')}
        >
          <span className="wizard-path-label">Path A</span>
          <span className="wizard-path-name">Update an existing country</span>
          <span className="wizard-path-desc">
            Pre-populated with v2.2 baseline scores. Adjust based on local knowledge.
          </span>
        </button>
        <button
          type="button"
          className="wizard-path-btn"
          aria-pressed={path === 'new'}
          onClick={() => setPath('new')}
        >
          <span className="wizard-path-label">Path B</span>
          <span className="wizard-path-name">Score a new country</span>
          <span className="wizard-path-desc">
            Start from scratch. All indicators begin at "Not yet scored."
          </span>
        </button>
      </div>

      {path === 'existing' ? (
        <div className="wizard-field">
          <label className="wizard-label" htmlFor="country-select">Country</label>
          <select
            id="country-select"
            className="wizard-select"
            value={selectedIso}
            onChange={(e) => setSelectedIso(e.target.value)}
          >
            {countries.map((c) => (
              <option key={c.iso3} value={c.iso3}>{c.country}</option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className="wizard-field">
            <label className="wizard-label" htmlFor="new-country-name">Country name</label>
            <input
              id="new-country-name"
              className="wizard-input"
              type="text"
              value={newCountryName}
              onChange={(e) => setNewCountryName(e.target.value)}
              placeholder="e.g. Botswana"
            />
          </div>
          <div className="wizard-field">
            <label className="wizard-label" htmlFor="new-country-iso">
              ISO 3166-1 alpha-3 code <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="new-country-iso"
              className="wizard-input"
              type="text"
              value={newCountryIso}
              onChange={(e) => setNewCountryIso(e.target.value)}
              placeholder="e.g. BWA"
              maxLength={3}
              style={{ maxWidth: 120 }}
            />
          </div>
        </>
      )}

      <div className="wizard-field">
        <label className="wizard-label" htmlFor="session-name">
          Session name <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          id="session-name"
          className="wizard-input"
          type="text"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          placeholder={`e.g. Ghana 2026 baseline`}
        />
      </div>

      <div className="wizard-dimension-footer">
        <button type="button" className="wizard-btn wizard-btn--ghost" onClick={prevStep}>
          Back
        </button>
        <button
          type="button"
          className="wizard-btn wizard-btn--primary"
          onClick={handleStart}
          disabled={!canStart}
        >
          Begin scoring
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/scoring/CountrySetup.tsx
git commit -m "feat(wizard): add CountrySetup with existing/new country paths"
```

---

## Task 10: ResultPlane (mini scatter plot)

**Files:**
- Create: `src/components/scoring/ResultPlane.tsx`

- [ ] **Step 1: Create the result scatter plot**

A simplified version of the home-page Plane scatter. Shows the 19-country cohort as muted dots and the user's scored country as a highlighted dot. Uses the same coordinate system: x = substantive, y = formal.

Create `src/components/scoring/ResultPlane.tsx`:

```tsx
import { PLANE as P, quadrantColor, quadrantWashColor } from '../../lib/plane-geometry';
import type { Quadrant } from '../../data/types';

interface CohortPoint {
  country: string;
  iso3: string;
  formal_pct: number;
  substantive_pct: number;
  quadrant: Quadrant;
}

interface UserPoint {
  country: string;
  formal_pct: number;
  substantive_pct: number;
  quadrant: Quadrant;
}

interface Props {
  cohort: CohortPoint[];
  user: UserPoint;
}

export default function ResultPlane({ cohort, user }: Props) {
  const l = P.ml;
  const r = P.ml + P.iw;
  const t = P.mt;
  const b = P.mt + P.ih;
  const mid = P.x(50);
  const midY = P.y(50);

  const quadrants: { key: Quadrant; x: number; y: number; w: number; h: number }[] = [
    { key: 'theatre', x: l, y: t, w: mid - l, h: midY - t },
    { key: 'interdep', x: mid, y: t, w: r - mid, h: midY - t },
    { key: 'adhoc', x: mid, y: midY, w: r - mid, h: b - midY },
    { key: 'depend', x: l, y: midY, w: mid - l, h: b - midY },
  ];

  return (
    <div className="result-plane-container">
      <div className="result-plane-label">Position on the Sovereignty Plane</div>
      <svg
        viewBox={`0 0 ${P.W} ${P.H}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Sovereignty Plane showing ${user.country} at formal ${user.formal_pct}%, substantive ${user.substantive_pct}%`}
        style={{ width: '100%', maxWidth: 760 }}
      >
        {/* Quadrant backgrounds */}
        {quadrants.map((q) => (
          <rect
            key={q.key}
            x={q.x} y={q.y} width={q.w} height={q.h}
            fill={quadrantWashColor(q.key)}
          />
        ))}

        {/* Axes */}
        <line x1={l} y1={t} x2={l} y2={b} stroke="#0f0f0f" strokeWidth={1} />
        <line x1={l} y1={b} x2={r} y2={b} stroke="#0f0f0f" strokeWidth={1} />
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={P.x(v)} y1={b} x2={P.x(v)} y2={b + 4} stroke="#0f0f0f" strokeWidth={1} />
            <text x={P.x(v)} y={b + 18} textAnchor="middle"
              fontFamily="'JetBrains Mono Variable', monospace" fontSize="10" fill="#8a8680">{v}</text>
            <line x1={l - 4} y1={P.y(v)} x2={l} y2={P.y(v)} stroke="#0f0f0f" strokeWidth={1} />
            <text x={l - 9} y={P.y(v) + 3.5} textAnchor="end"
              fontFamily="'JetBrains Mono Variable', monospace" fontSize="10" fill="#8a8680">{v}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={l + P.iw / 2} y={P.H - 38} textAnchor="middle"
          fontFamily="'Inter Variable', sans-serif" fontSize="12" fill="#5a564b">
          Substantive sovereignty
        </text>
        <text x={22} y={t + P.ih / 2} textAnchor="middle"
          fontFamily="'Inter Variable', sans-serif" fontSize="12" fill="#5a564b"
          transform={`rotate(-90, 22, ${t + P.ih / 2})`}>
          Formal sovereignty
        </text>

        {/* Grid lines */}
        <line x1={mid} y1={t} x2={mid} y2={b} stroke="#8a8680" strokeWidth={0.5} strokeDasharray="1 3" />
        <line x1={l} y1={midY} x2={r} y2={midY} stroke="#8a8680" strokeWidth={0.5} strokeDasharray="1 3" />

        {/* Coherence line */}
        <line x1={P.x(0)} y1={P.y(0)} x2={P.x(100)} y2={P.y(100)}
          stroke="#0f0f0f" strokeWidth={0.75} strokeDasharray="2 4" />

        {/* Cohort dots (muted) */}
        {cohort.map((c) => (
          <circle
            key={c.iso3}
            cx={P.x(c.substantive_pct)}
            cy={P.y(c.formal_pct)}
            r={5}
            fill={quadrantColor(c.quadrant)}
            opacity={0.25}
          />
        ))}

        {/* Cohort labels (muted) */}
        {cohort.map((c) => (
          <text
            key={`label-${c.iso3}`}
            x={P.x(c.substantive_pct) + 9}
            y={P.y(c.formal_pct) + 3.5}
            fontFamily="'JetBrains Mono Variable', monospace"
            fontSize="9"
            fill="#8a8680"
            opacity={0.4}
          >
            {c.iso3}
          </text>
        ))}

        {/* User's country — highlighted */}
        <circle
          cx={P.x(user.substantive_pct)}
          cy={P.y(user.formal_pct)}
          r={12}
          fill="none"
          stroke={quadrantColor(user.quadrant)}
          strokeWidth={1.5}
          opacity={0.5}
        />
        <circle
          cx={P.x(user.substantive_pct)}
          cy={P.y(user.formal_pct)}
          r={7}
          fill={quadrantColor(user.quadrant)}
        />
        <text
          x={P.x(user.substantive_pct) + 14}
          y={P.y(user.formal_pct) + 4}
          fontFamily="'JetBrains Mono Variable', monospace"
          fontSize="11"
          fontWeight="600"
          fill="#0f0f0f"
        >
          {user.country}
        </text>
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/scoring/ResultPlane.tsx
git commit -m "feat(wizard): add ResultPlane scatter plot with cohort and user dot"
```

---

## Task 11: ReviewScreen component

**Files:**
- Create: `src/components/scoring/ReviewScreen.tsx`

- [ ] **Step 1: Create the review screen**

Screen 14: computed scores, quadrant pill, the ResultPlane, interpretation section, and export/save actions.

Create `src/components/scoring/ReviewScreen.tsx`:

```tsx
import { useState, useMemo } from 'react';
import { useScoringStore, STEP_LAST_DIMENSION } from '../../stores/scoring';
import { computeResult, saveSession, exportSessionAsJson, downloadJson } from '../../lib/scoring';
import { quadrantColor } from '../../lib/plane-geometry';
import { getQuadrantDescription, getCoherenceAdvice } from '../../lib/coherence';
import ResultPlane from './ResultPlane';
import type { IndicatorDef, CohortSummary } from '../../lib/scoring';
import type { Country, Quadrant } from '../../data/types';

interface Props {
  indicators: IndicatorDef[];
  cohort: CohortSummary[];
}

export default function ReviewScreen({ indicators, cohort }: Props) {
  const session = useScoringStore((s) => s.session);
  const setStep = useScoringStore((s) => s.setStep);
  const clearSession = useScoringStore((s) => s.clearSession);

  const [interpretOpen, setInterpretOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!session) return null;

  const result = useMemo(
    () => computeResult(session.scores, indicators),
    [session.scores, indicators],
  );

  const handleSave = () => {
    saveSession(session);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportJson = () => {
    const json = exportSessionAsJson(session, result);
    const filename = `${session.session_id.replace(/\s+/g, '_')}.json`;
    downloadJson(filename, json);
  };

  const handleNewScoring = () => {
    clearSession();
  };

  // Build a mock Country object for coherence advice
  const mockCountry: Country = {
    id: session.iso3 || 'NEW',
    iso_code: session.iso3 || 'NEW',
    name: session.country,
    short_name: session.country,
    region: '',
    is_reference: false,
    in_africa_scope: true,
    in_frontier_scope: false,
    formal_score: result.formal_pct,
    substantive_score: result.substantive_pct,
    gap: result.gap_pp,
    quadrant: result.quadrant,
    label_dx: 0,
    label_dy: 0,
    label_anchor: 'start',
    map_topojson_id: null,
    map_cx: null,
    map_cy: null,
    narrative: null,
  };

  const advice = getCoherenceAdvice(mockCountry);
  const description = getQuadrantDescription(result.quadrant);

  return (
    <div className="wizard-review">
      <h2 className="wizard-review-title">
        {session.country}: your results
      </h2>

      {/* Score cards */}
      <div className="review-scores">
        <div className="review-score-card">
          <div className="review-score-label">Formal</div>
          <div className="review-score-value">
            {result.formal_pct}<span className="review-score-unit">%</span>
          </div>
        </div>
        <div className="review-score-card">
          <div className="review-score-label">Substantive</div>
          <div className="review-score-value">
            {result.substantive_pct}<span className="review-score-unit">%</span>
          </div>
        </div>
        <div className="review-score-card">
          <div className="review-score-label">Gap</div>
          <div className="review-score-value">
            {result.gap_pp}<span className="review-score-unit"> pp</span>
          </div>
        </div>
        <div className="review-score-card">
          <div className="review-score-label">Quadrant</div>
          <div>
            <span
              className="review-quadrant-pill"
              style={{ background: quadrantColor(result.quadrant) }}
            >
              {result.position_label}
            </span>
          </div>
        </div>
      </div>

      {/* Completion status */}
      {(result.scored_formal < result.total_formal || result.scored_substantive < result.total_substantive) && (
        <p style={{
          fontFamily: "'JetBrains Mono Variable', monospace",
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: 'var(--ink-mute)',
          marginBottom: 32,
        }}>
          {result.scored_formal}/{result.total_formal} formal and{' '}
          {result.scored_substantive}/{result.total_substantive} substantive indicators scored.
          Unscored indicators are excluded from the computation.
        </p>
      )}

      {/* Plane scatter */}
      <ResultPlane
        cohort={cohort}
        user={{
          country: session.country,
          formal_pct: result.formal_pct,
          substantive_pct: result.substantive_pct,
          quadrant: result.quadrant,
        }}
      />

      {/* Interpretation */}
      <div className="review-interpretation">
        <button
          type="button"
          className="review-interpretation-toggle"
          onClick={() => setInterpretOpen(!interpretOpen)}
          aria-expanded={interpretOpen}
        >
          <span className="review-interpretation-title">What does this mean?</span>
          <span className="review-interpretation-chevron" data-open={interpretOpen}>
            &#9660;
          </span>
        </button>
        {interpretOpen && (
          <div className="review-interpretation-body">
            <p className="review-interpretation-text">{description}</p>
            <p className="review-interpretation-text" style={{ fontStyle: 'italic' }}>
              {advice.direction}
            </p>
            <ul className="review-advice-list">
              {advice.actions.map((action, i) => (
                <li key={i} className="review-advice-item">{action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="review-actions">
        <button type="button" className="wizard-btn wizard-btn--primary" onClick={handleExportJson}>
          Export JSON
        </button>
        <button type="button" className="wizard-btn" onClick={handleSave}>
          {saved ? 'Saved' : 'Save to browser'}
        </button>
        <button
          type="button"
          className="wizard-btn wizard-btn--ghost"
          onClick={() => setStep(STEP_LAST_DIMENSION)}
        >
          Back to scoring
        </button>
        <button type="button" className="wizard-btn wizard-btn--ghost" onClick={handleNewScoring}>
          Start a new scoring
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/scoring/ReviewScreen.tsx
git commit -m "feat(wizard): add ReviewScreen with scores, plane, interpretation, and export"
```

---

## Task 12: ScoringWizard orchestrator

**Files:**
- Create: `src/components/scoring/ScoringWizard.tsx`

- [ ] **Step 1: Create the wizard root component**

The main React island. Routes between screens based on the current step. Passes data down.

Create `src/components/scoring/ScoringWizard.tsx`:

```tsx
import { useEffect, useCallback } from 'react';
import { useScoringStore, STEP_LANDING, STEP_COUNTRY_SETUP, STEP_FIRST_DIMENSION, STEP_LAST_DIMENSION, STEP_REVIEW } from '../../stores/scoring';
import { saveSession } from '../../lib/scoring';
import LandingScreen from './LandingScreen';
import CountrySetup from './CountrySetup';
import DimensionScreen from './DimensionScreen';
import WizardProgress from './WizardProgress';
import ReviewScreen from './ReviewScreen';
import type { IndicatorDef, BaselineScore, CohortSummary } from '../../lib/scoring';

interface Props {
  indicators: IndicatorDef[];
  baselineScores: BaselineScore[];
  cohort: CohortSummary[];
  countries: { country: string; iso3: string }[];
}

export default function ScoringWizard({ indicators, baselineScores, cohort, countries }: Props) {
  const step = useScoringStore((s) => s.step);
  const session = useScoringStore((s) => s.session);

  // Auto-save on step change (when session exists)
  useEffect(() => {
    if (session && step >= STEP_FIRST_DIMENSION) {
      saveSession(session);
    }
  }, [step, session]);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  return (
    <div className="wizard">
      {session && step >= STEP_FIRST_DIMENSION && (
        <WizardProgress
          indicators={indicators}
          scores={session.scores}
        />
      )}

      {step === STEP_LANDING && <LandingScreen />}

      {step === STEP_COUNTRY_SETUP && (
        <CountrySetup
          countries={countries}
          baselineScores={baselineScores}
        />
      )}

      {step >= STEP_FIRST_DIMENSION && step <= STEP_LAST_DIMENSION && (
        <DimensionScreen indicators={indicators} />
      )}

      {step === STEP_REVIEW && (
        <ReviewScreen indicators={indicators} cohort={cohort} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/scoring/ScoringWizard.tsx
git commit -m "feat(wizard): add ScoringWizard root orchestrator"
```

---

## Task 13: Astro page and wiring

**Files:**
- Create: `src/pages/score.astro`

- [ ] **Step 1: Create the /score page**

The Astro page imports the JSON data at build time and passes it as props to the ScoringWizard React island.

Create `src/pages/score.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import ScoringWizard from '../components/scoring/ScoringWizard';

import indicatorsData from '../data/indicators.json';
import scoresData from '../data/scores.json';
import summaryData from '../data/summary.json';
import countriesData from '../data/countries.json';

// Build the props for the wizard
const indicators = indicatorsData.map((ind: any) => ({
  axis: ind.axis,
  dimension_code: ind.dimension_code,
  dimension: ind.dimension,
  indicator_code: ind.indicator_code,
  indicator: ind.indicator,
  max_score: ind.max_score,
}));

const baselineScores = scoresData.map((s: any) => ({
  row_id: s.row_id,
  country: s.country,
  iso3: s.iso3,
  indicator_code: s.indicator_code,
  score: s.score,
  confidence: s.confidence,
  evidence_note: s.evidence_note || '',
  primary_source_url: s.primary_source_url || '',
}));

const cohort = summaryData.map((s: any) => ({
  country: s.country,
  iso3: s.iso3,
  formal_pct: s.formal_pct,
  substantive_pct: s.substantive_pct,
  quadrant: s.quadrant,
}));

const countries = countriesData
  .map((c: any) => ({ country: c.country, iso3: c.iso3 }))
  .sort((a: any, b: any) => a.country.localeCompare(b.country));
---

<Base>
  <ScoringWizard
    client:load
    indicators={indicators}
    baselineScores={baselineScores}
    cohort={cohort}
    countries={countries}
  />
</Base>

<style>
  /* Import wizard styles */
</style>
```

Note: the `<style>` tag above is a placeholder. The actual wizard CSS is in `src/styles/scoring.css`. You need to import it. Check how the existing site imports `tokens.css` and `plane.css` — likely via the `Base.astro` layout or a global import. Add `scoring.css` the same way.

- [ ] **Step 2: Wire up the CSS import**

Read `src/layouts/Base.astro` to see how global CSS is imported. Add `import '../styles/scoring.css';` to either `Base.astro` or `score.astro`, following the existing pattern.

- [ ] **Step 3: Run the dev server and verify**

```bash
pnpm dev
```

Open `http://localhost:4321/score` in a browser. Verify:
- Landing screen renders with the hero question
- "Get started" navigates to country setup
- Country picker shows 19 countries sorted alphabetically
- Path A pre-populates scores
- Path B starts with blank slate
- Dimension screens show 4 indicators each
- Score toggles work (0/1/2/3 highlight)
- Evidence and confidence fields save
- Progress bar updates across dimensions
- Review screen shows computed scores
- ResultPlane shows cohort + user dot
- "What does this mean?" expands
- Export JSON downloads a file
- Save to browser persists, and resume works from landing screen

- [ ] **Step 4: Run the build**

```bash
pnpm build
```

Confirm no errors beyond the known Supabase build warning.

- [ ] **Step 5: Commit**

```bash
git add src/pages/score.astro
git commit -m "feat(wizard): add /score page wiring data to wizard island"
```

---

## Task 14: Polish and final verification

- [ ] **Step 1: Fix any visual issues found during testing**

Check alignment, spacing, and typography against the existing home page. The wizard should feel like part of the same site. Common issues to watch for:
- Font loading (Instrument Serif, Inter Variable, JetBrains Mono must load on `/score`)
- CSS variable scoping (ensure `tokens.css` loads before `scoring.css`)
- SVG viewBox sizing on the ResultPlane at different viewport widths
- Score toggle button borders collapsing correctly

- [ ] **Step 2: Test save/resume flow**

1. Open `/score` in incognito
2. Start scoring Ghana (Path A)
3. Score two dimensions
4. Close the tab
5. Reopen `/score`
6. Verify "Resume a saved session" shows the Ghana session
7. Click Resume
8. Verify scores are preserved and you land on the correct step

Note: the current implementation always resumes at `STEP_FIRST_DIMENSION`. To resume at the exact step, the step should be saved in the session and restored. If this is missing, add `step: number` to `ScoringSession` and save/restore it in `startSession`.

- [ ] **Step 3: Test JSON export**

1. Complete all 44 indicators for a country
2. Click "Export JSON"
3. Verify the downloaded file contains all scores, the computed result, and session metadata
4. Verify the computed `formal_pct` and `substantive_pct` match the review screen

- [ ] **Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(wizard): polish visual identity and fix save/resume flow"
```

- [ ] **Step 5: Final build and push**

```bash
pnpm build
git push origin main
```

Report the commit SHA.

---

## Verification checklist (run after all tasks)

- [ ] `/score` loads in incognito without errors
- [ ] Landing screen hero, chips, and CTA render correctly
- [ ] Country picker shows all 19 countries alphabetically
- [ ] Path A pre-populates with v2.2 baseline data
- [ ] Path B starts blank
- [ ] All 11 dimension screens render with 4 indicators each
- [ ] Score toggles, evidence, source URL, and confidence all save
- [ ] Progress bar tracks dimension progress and scored count
- [ ] Review screen shows correct formal%, substantive%, gap, quadrant
- [ ] ResultPlane renders cohort as muted dots + user as highlighted dot
- [ ] "What does this mean?" expands with quadrant-specific interpretation
- [ ] Export JSON downloads valid JSON
- [ ] Save to browser + resume works across tab close/reopen
- [ ] `pnpm build` succeeds
- [ ] No console errors on `/score`
