import { breakdownTotals } from '../utils.js';
import LeaderBanner from './LeaderBanner.jsx';

export default function Standings({ scores, me }) {
  const order = scores.finalStandings; // [{name, points, rank}]
  const byName = Object.fromEntries(scores.participants.map((p) => [p.name, p]));

  return (
    <section>
      <h2>Clasificación general</h2>
      <LeaderBanner standings={order} />
      <div className="table-wrap">
        <table className="standings">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Participante</th>
              <th className="num total">Total</th>
              <th className="num">Grupos</th>
              <th className="num">Posic.</th>
              <th className="num">Clasif.</th>
              <th className="num">Elim.</th>
              <th className="num">Extra</th>
            </tr>
          </thead>
          <tbody>
            {order.map((row) => {
              const p = byName[row.name];
              const bd = breakdownTotals(p);
              return (
                <tr key={row.name} className={`${row.rank <= 3 ? `podium r${row.rank}` : ''}${me === row.name ? ' me' : ''}`}>
                  <td className="num rank">{row.rank}</td>
                  <td className="name">{row.name}</td>
                  <td className="num total">{row.points}</td>
                  <td className="num">{bd.grupos}</td>
                  <td className="num">{bd.posiciones}</td>
                  <td className="num">{bd.clasificados}</td>
                  <td className="num">{bd.eliminatorias}</td>
                  <td className="num">{bd.extra}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Grupos = aciertos de partidos de grupos · Posic. = posiciones exactas de grupo · Clasif. =
        puntos por equipo clasificado · Elim. = partidos de eliminatorias · Extra = cuadro de honor.
      </p>
    </section>
  );
}
