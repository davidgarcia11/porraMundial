import { useState } from 'react';
import PointsInPlayView from './PointsInPlayView.jsx';
import ProbabilityView from './ProbabilityView.jsx';
import ProjectionView from './ProjectionView.jsx';
import CompareView from './CompareView.jsx';
import StatsView from './StatsView.jsx';
import { useNewBadge } from '../newFeatures.js';

const SUBS = [
  { key: 'play', label: 'Puntos en juego' },
  { key: 'prob', label: 'Probabilidad' },
  { key: 'projection', label: 'Proyección' },
  { key: 'compare', label: 'Comparador' },
  { key: 'stats', label: 'Estadísticas' },
];

export default function AnalisisView({ predictions, results, scores, me }) {
  const [sub, setSub] = useState(() => {
    const saved = localStorage.getItem('porra-sub-analisis');
    return SUBS.some((s) => s.key === saved) ? saved : 'play';
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
      {sub === 'play' ? (
        <PointsInPlayView predictions={predictions} results={results} scores={scores} me={me} />
      ) : sub === 'prob' ? (
        <ProbabilityView predictions={predictions} results={results} scores={scores} me={me} />
      ) : sub === 'projection' ? (
        <ProjectionView predictions={predictions} results={results} scores={scores} me={me} />
      ) : sub === 'compare' ? (
        <CompareView predictions={predictions} results={results} scores={scores} me={me} />
      ) : (
        <StatsView predictions={predictions} results={results} scores={scores} />
      )}
    </section>
  );
}
