import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { usePlaneStore } from '../stores/plane';
import Plane from './Plane';
import AfricaMap from './Map';
import DetailPanel from './DetailPanel';
import type { Country } from '../data/types';

const Plane3D = lazy(() => import('./Plane3D'));

interface Props {
  countries: Country[];
}

export default function PlaneIsland({ countries }: Props) {
  const view = usePlaneStore((s) => s.view);
  const scope = usePlaneStore((s) => s.scope);
  const setView = usePlaneStore((s) => s.setView);
  const setScope = usePlaneStore((s) => s.setScope);

  const vizRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!vizRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const el = vizRef.current as HTMLElement & { webkitRequestFullscreen?: () => void };
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleFullscreen]);

  const caption =
    view === 'plane'
      ? scope === 'africa'
        ? '<b>Figure 1.</b> Fifteen African states and four reference countries plotted by formal sovereignty (vertical axis) and substantive sovereignty (horizontal axis). The dashed diagonal marks the line where what a state declares matches what it can do. Click up to four countries to compare.'
        : '<b>Figure 2.</b> Seven of the ten proposed frontier anchor states, plotted using existing scores. Three states — India, Singapore, Indonesia — are currently unscored and would be assessed during the proposed Astra fellowship.'
      : view === 'plane3d'
        ? scope === 'africa'
          ? '<b>3D view.</b> Interactive three-dimensional view of the Sovereignty Plane. Drag to orbit, scroll to zoom. Countries plotted by formal (x) and substantive (z) sovereignty. Click up to four countries to compare.'
          : '<b>3D view · frontier scope.</b> Frontier anchor states rendered in the interactive 3D plane. Drag to orbit, scroll to zoom.'
        : scope === 'africa'
          ? '<b>Map view.</b> Geographic index into the Sovereignty Plane. Fifteen African states shaded by quadrant assignment. Reference countries (France, Japan, UAE, Brazil) are omitted from the map view. Click up to four countries to compare.'
          : '<b>Map view · frontier scope.</b> Anchor states for the proposed frontier extension. The map shows African anchors only; UAE and Brazil appear in the plane view as external reference points.';

  return (
    <>
      {/* View toggle */}
      <div className="view-toggle">
        <div className="view-toggle-label">View</div>
        <div className="view-toggle-buttons" role="tablist">
          <button
            className={view === 'plane' ? 'active' : ''}
            onClick={() => setView('plane')}
            role="tab"
            aria-selected={view === 'plane'}
          >
            The <span className="it">Plane</span>
          </button>
          <button
            className={view === 'plane3d' ? 'active' : ''}
            onClick={() => setView('plane3d')}
            role="tab"
            aria-selected={view === 'plane3d'}
          >
            3D <span className="it">Plane</span>
          </button>
          <button
            className={view === 'map' ? 'active' : ''}
            onClick={() => setView('map')}
            role="tab"
            aria-selected={view === 'map'}
          >
            The <span className="it">Map</span>
          </button>
        </div>
      </div>

      {/* Scope toggle */}
      <div className="scope-toggle">
        <div className="scope-toggle-label">Scope</div>
        <div className="scope-toggle-buttons">
          <button
            className={scope === 'africa' ? 'active' : ''}
            onClick={() => setScope('africa')}
          >
            Africa <span className="count">15+4</span>
          </button>
          <button
            className={scope === 'frontier' ? 'active' : ''}
            onClick={() => setScope('frontier')}
          >
            Frontier anchor states <span className="count">10</span>
          </button>
        </div>
      </div>

      {/* Viz area */}
      <div className="viz-area" ref={vizRef}>
        {/* Fullscreen toggle */}
        <button
          className="fullscreen-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="6,1 1,1 1,6" />
              <polyline points="10,15 15,15 15,10" />
              <polyline points="15,6 15,1 10,1" />
              <polyline points="1,10 1,15 6,15" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="1,6 1,1 6,1" />
              <polyline points="15,10 15,15 10,15" />
              <polyline points="10,1 15,1 15,6" />
              <polyline points="6,15 1,15 1,10" />
            </svg>
          )}
        </button>

        <div className="viz-canvas">
          <Plane countries={countries} />
          {view === 'plane3d' && (
            <Suspense fallback={<div style={{ height: 560, background: '#0d0d14', borderRadius: 4 }} />}>
              <Plane3D countries={countries} />
            </Suspense>
          )}
          <AfricaMap countries={countries} />
          <div
            className="viz-caption"
            dangerouslySetInnerHTML={{ __html: caption }}
          />
        </div>
        <DetailPanel />
      </div>
    </>
  );
}
