import { useState, useEffect } from 'react';
import { useScoringStore, STEP_COUNTRY_SETUP } from '../../stores/scoring';
import { getSavedSessionIds, loadSession, deleteSession } from '../../lib/scoring';
import type { ScoringSession } from '../../lib/scoring';

export default function LandingScreen() {
  const setStep = useScoringStore((s) => s.setStep);
  const resumeSession = useScoringStore((s) => s.resumeSession);
  const [savedSessions, setSavedSessions] = useState<{ id: string; session: ScoringSession }[]>([]);

  useEffect(() => {
    const ids = getSavedSessionIds();
    const sessions = ids
      .map((id) => ({ id, session: loadSession(id) }))
      .filter((s): s is { id: string; session: ScoringSession } => s.session !== null);
    setSavedSessions(sessions);
  }, []);

  const handleResume = (session: ScoringSession) => {
    resumeSession(session);
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
