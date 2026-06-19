import { useState } from 'react';
import PointsInPlayView from './PointsInPlayView.jsx';
import CompareView from './CompareView.jsx';
import StatsView from './StatsView.jsx';

const SUBS = [
  { key: 'play', label: 'Puntos en juego' },
  { key: 'compare', label: 'Comparador' },
  { key: 'stats', label: 'Estadísticas' },
];

export default function AnalisisView({ predictions, results, scores, me }) {
  const [sub, setSub] = useState('play');
  return (
    <section>
      <h2>Análisis</h2>
      <div className="subnav">
        {SUBS.map((s) => (
          <button key={s.key} className={sub === s.key ? 'chip active' : 'chip'} onClick={() => setSub(s.key)}>
            {s.label}
          </button>
        ))}
      </div>
      {sub === 'play' ? (
        <PointsInPlayView predictions={predictions} scores={scores} tournament={results.tournament} me={me} />
      ) : sub === 'compare' ? (
        <CompareView predictions={predictions} results={results} scores={scores} />
      ) : (
        <StatsView predictions={predictions} results={results} scores={scores} />
      )}
    </section>
  );
}
