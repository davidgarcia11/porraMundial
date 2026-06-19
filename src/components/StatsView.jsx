import { computeStats } from '../services/analysis.js';

// "Premios" / estadísticas curiosas.
export default function StatsView({ predictions, results, scores }) {
  const stats = computeStats(predictions, results, scores);

  return (
    <div>
      {!stats.anyResult && (
        <p className="muted small">Aún no hay partidos jugados; las estadísticas aparecerán según avance el torneo.</p>
      )}
      <div className="stat-grid">
        {stats.awards.map((a) => (
          <div key={a.label} className="stat-card">
            <div className="stat-label">{a.label}</div>
            <div className="stat-name">{a.name || '—'}</div>
            <div className="stat-value">
              {a.value ?? 0} <span className="stat-suffix">{a.suffix}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
