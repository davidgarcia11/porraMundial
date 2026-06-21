import { teamFlag, teamName } from '../data/teams.js';
import { pointsInPlay } from '../services/analysis.js';

// Puntos máximos posibles de cada participante (objetivo): puntos actuales + todo
// lo que aún puede conseguir si lo acierta, contando solo lo que sigue siendo posible.
export default function PointsInPlayView({ predictions, results, scores, me }) {
  const rows = pointsInPlay(predictions, results, scores).sort(
    (a, b) => b.maxAchievable - a.maxAchievable || b.current - a.current
  );
  const leaderNow = rows.reduce((mx, r) => Math.max(mx, r.current), 0);

  return (
    <div>
      <p className="muted small">
        <b>Máximo posible</b> = puntos actuales + todo lo que aún podría sumar si lo acierta todo,
        contando solo lo que <b>sigue siendo posible</b> (sin equipos ya eliminados). Es objetivo: no
        hay estimaciones. La bandera es su campeón (✗ si está eliminado).
      </p>
      <div className="table-wrap">
        <table className="standings">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Participante</th>
              <th className="num">Ahora</th>
              <th className="num total">Máximo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const out = r.maxAchievable < leaderNow;
              return (
                <tr key={r.name} className={`${me === r.name ? 'me' : ''}${out ? ' faded' : ''}`}>
                  <td className="num rank">{i + 1}</td>
                  <td className="name">
                    <span className="pname" title={r.name}>{r.name}</span>
                    {r.champion.code && (
                      <span
                        className={`champ-mini${r.champion.alive ? '' : ' out'}`}
                        title={`Campeón: ${teamName(r.champion.code)}${r.champion.alive ? '' : ' (eliminado)'}`}
                      >
                        {teamFlag(r.champion.code)}
                        {!r.champion.alive && <span className="champ-x">✗</span>}
                      </span>
                    )}
                  </td>
                  <td className="num">{r.current}</td>
                  <td className="num total">{r.maxAchievable}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Ordenado por máximo posible. Si el máximo de alguien es menor que los puntos del líder actual
        ({leaderNow}), ya no puede ser primero (fila atenuada). En fase de grupos nadie está eliminado.
      </p>
    </div>
  );
}
