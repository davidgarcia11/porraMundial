import Team from './Team.jsx';
import { winProbabilities } from '../services/analysis.js';

const pct = (p) => `${(p * 100).toFixed(1)}%`;

// Estimación de probabilidad de ganar la porra.
export default function ProbabilityView({ predictions, results, scores, me }) {
  const rows = winProbabilities(predictions, scores, results.tournament);
  const max = rows[0]?.prob || 1;

  return (
    <div>
      <p className="muted small">
        Estimación: como el campeón vale <b>1000</b>, la porra la decide casi siempre acertarlo. Se
        reparte según los campeones aún vivos (ponderados por cuánta gente los eligió) y, entre
        quienes eligieron el mismo, según los puntos actuales. Es aproximada y se recalcula sola: si
        un campeón se elimina, su probabilidad pasa a 0.
      </p>
      <div className="table-wrap">
        <table className="standings">
          <thead>
            <tr>
              <th>Participante</th>
              <th>Su campeón</th>
              <th className="num">Prob.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className={me === r.name ? 'me' : ''}>
                <td className="name"><span className="pname" title={r.name}>{r.name}</span></td>
                <td>
                  {r.champion ? <Team code={r.champion} /> : '—'}{' '}
                  {r.champion && !r.championAlive && <span className="status out">eliminado</span>}
                </td>
                <td className="num prob-cell">
                  <span className="prob-bar" style={{ width: `${(r.prob / max) * 100}%` }} />
                  <span className="prob-val">{pct(r.prob)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
