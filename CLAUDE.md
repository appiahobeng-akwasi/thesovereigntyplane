# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Sovereignty Plane is a static data visualization site that maps African countries across two axes — formal sovereignty (legal/institutional frameworks) and substantive sovereignty (real-world capacity/outcomes) — producing a 2x2 quadrant classification (theatre, interdependent, ad hoc, dependent). Built as a companion to the research paper "Negotiating Intelligence" (Appiah 2026).

Live at: https://thesovereigntyplane.report

## Commands

```bash
pnpm dev          # Dev server (localhost:4321)
pnpm build        # Static build to dist/
pnpm preview      # Preview the built site
pnpm check        # Astro type checking
pnpm seed         # Seed Supabase from seed_data.json (requires SUPABASE_SERVICE_ROLE_KEY)
```

## Tech Stack

- **Framework**: Astro 5 (static output) + React 19 islands
- **Language**: TypeScript (strict, react-jsx)
- **State**: Zustand
- **Visualization**: D3-geo + TopoJSON (globe/map), SVG (scatter plot)
- **Database**: Supabase (Postgres 15+), queried at build time only
- **Styling**: CSS custom properties in `src/styles/tokens.css` (no Tailwind)
- **Fonts**: Instrument Serif (headings), Inter Variable (body), JetBrains Mono Variable (labels)
- **Deploy**: Vercel via `@astrojs/vercel` adapter
- **Package manager**: pnpm

## Architecture

### Static-first with React islands

The site is fully static HTML — Supabase is queried once at build time via `getCountries()` in `src/data/queries.ts`. No runtime database calls or API keys reach the browser. The interactive visualization is a React island hydrated via `client:visible` on `PlaneIsland`.

### Data flow

1. `src/pages/index.astro` calls `getCountries()` at build time
2. Country data (with joined narratives) is passed as props to `PlaneSection.astro` → `PlaneIsland.tsx`
3. `PlaneIsland` renders either `Plane.tsx` (SVG scatter plot) or `Map.tsx` (D3 animated globe) based on Zustand store state
4. `DetailPanel.tsx` shows selected countries (max 4) with narrative text and coherence advice

### Zustand store (`src/stores/plane.ts`)

Global client state: `view` (plane/map), `scope` (africa/frontier), `selected` countries (max 4, FIFO eviction), `hoveredQuadrant`.

### Key source paths

- `src/pages/index.astro` — single page, orchestrates all sections
- `src/components/PlaneIsland.tsx` — main React island (view toggle, scope toggle, visualization + detail panel)
- `src/components/Plane.tsx` — SVG scatter plot with quadrant coloring and country labels
- `src/components/Map.tsx` — D3-geo animated globe that transitions to Africa zoom
- `src/components/DetailPanel.tsx` — selected country cards with narrative and download
- `src/lib/plane-geometry.ts` — rendering constants, quadrant color map, axis scale helpers
- `src/lib/coherence.ts` — quadrant descriptions and policy advice text
- `src/lib/countries.ts` — `filterByScope()` utility
- `src/data/types.ts` — core TypeScript types (`Country`, `Quadrant`, `Scope`, `View`)

### Database schema

Six core tables with RLS (anon = read-only, authenticated = full access):
- `countries` — 19 rows (15 African + 4 reference), stores formal/substantive scores and quadrant
- `narratives` — 1:1 with countries, italic prose for detail panel
- `sub_dimensions`, `indicators`, `scores`, `sources` — v2 indicator-level scoring (not yet populated)
- `country_scores_computed` — view that will compute scores from indicators in v2

Schema lives in `supabase/migrations/20260408000001_schema.sql`. Seed data in `seed_data.json`.

### Quadrant system

Four quadrants based on formal (x) and substantive (y) scores crossing at 50:
- `theatre` — high formal, low substantive (color: `#8a3a2a`)
- `interdep` — high formal, high substantive (color: `#2d5a3a`)
- `adhoc` — low formal, low substantive (color: `#8a6a1f`)
- `depend` — low formal, high substantive (color: `#6b6862`)

## Environment Variables

See `.env.example`. `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are required for builds. `SUPABASE_SERVICE_ROLE_KEY` is only needed for seeding.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
