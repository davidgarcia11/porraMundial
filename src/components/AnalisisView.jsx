import { useState } from 'react';
import PointsInPlayView from './PointsInPlayView.jsx';
import ProjectionView from './ProjectionView.jsx';
import CrucesView from './CrucesView.jsx';
import CompareView from './CompareView.jsx';
import StatsView from './StatsView.jsx';
import DesgloseView from './DesgloseView.jsx';
import { useNewBadge } from '../newFeatures.js';

const SUBS = [
  { key: 'desglose', label: 'Desglose' },
  { key: 'play', label: 'Puntos máximos' },
  { key: 'projection', label: 'Proyección' },
  { key: 'cruces', label: 'Cruces' },
  { key: 'compare', label: 'Comparador' },
  { key: 'stats', label: 'Estadísticas' },
];

export default function AnalisisView({ predictions, results, scores, me }) {
  const [sub, setSub] = useState(() => {
    const saved = localStorage.getItem('porra-sub-analisis');
    return SUBS.some((s) => s.key === saved) ? saved : 'desglose';
  });
  const { isNew, markSeen } = useNewBadge();
  const open = (key) => {
    setSub(key);
    localStorage.setItem('porra-sub-analisis', key);
    markSeen(`analisis:${key}`);
  };
  return (
    <section>
      <h2>Análisis</h2>
      <div className="subnav">
        {SUBS.map((s) => (
          <button key={s.key} className={sub === s.key ? 'chip active' : 'chip'} onClick={() => open(s.key)}>
            {s.label}
            {isNew(`analisis:${s.key}`) && <span className="new-badge">NUEVO</span>}
          </button>
        ))}
      </div>
      {sub === 'desglose' ? (
        <DesgloseView scores={scores} me={me} />
      ) : sub === 'play' ? (
        <PointsInPlayView predictions={predictions} results={results} scores={scores} me={me} />
      ) : sub === 'projection' ? (
        <ProjectionView predictions={predictions} results={results} scores={scores} me={me} />
      ) : sub === 'cruces' ? (
        <CrucesView predictions={predictions} results={results} me={me} />
      ) : sub === 'compare' ? (
        <CompareView predictions={predictions} results={results} scores={scores} me={me} />
      ) : (
        <StatsView predictions={predictions} results={results} scores={scores} />
      )}
    </section>
  );
}
