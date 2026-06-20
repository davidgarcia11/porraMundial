import { useMemo } from 'react';
import Team from './Team.jsx';
import { winProbabilities } from '../services/analysis.js';

const pct = (p) => `${(p * 100).toFixed(1)}%`;

// Estimación de probabilidad de ganar la porra.
export default function ProbabilityView({ predictions, results, scores, me }) {
  const rows = useMemo(() => winProbabilities(predictions, results, scores), [predictions, results, scores]);
  const max = rows[0]?.prob || 1;
  const hasScorers = (results.tournament?.scorers || []).length > 0;

  return (
    <div>
      <p className="muted small">
        Estimación por simulación (Montecarlo): se simulan miles de veces <b>todo lo que queda</b> del
        torneo —partidos de grupos y eliminatorias, posiciones, clasificados, campeón (1000),
        subcampeón (50), 3º (25){hasScorers ? <> y goleadores (Bota de Oro/Plata/Bronce)</> : null}— se
        suma a los <b>puntos actuales</b> y se cuenta quién gana cada vez. Pesan las circunstancias
        actuales: los equipos que van mejor ahora y tener tu goleador 1º te suben. Es aproximada y se
        recalcula sola: si un campeón se elimina, deja de poder salir.
        {!hasScorers && ' (Los goleadores se incluirán cuando la API los proporcione.)'}
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
