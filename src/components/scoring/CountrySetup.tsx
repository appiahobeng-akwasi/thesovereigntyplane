import { useState } from 'react';
import { useScoringStore, STEP_FIRST_DIMENSION } from '../../stores/scoring';
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
      step: STEP_FIRST_DIMENSION,
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
          placeholder="e.g. Ghana 2026 baseline"
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
