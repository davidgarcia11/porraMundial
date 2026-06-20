import { useState } from 'react';
import { breakdownTotals } from '../utils.js';
import LeaderBanner from './LeaderBanner.jsx';
import RulesNote from './RulesNote.jsx';

export default function Standings({ scores, me }) {
  const order = scores.finalStandings; // [{name, points, rank}]
  const byName = Object.fromEntries(scores.participants.map((p) => [p.name, p]));
  const [open, setOpen] = useState(null); // nombre con desglose abierto (móvil)

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
              <th className="num bd">Grupos</th>
              <th className="num bd">Posic.</th>
              <th className="num bd">Clasif.</th>
              <th className="num bd">Elim.</th>
              <th className="num bd">Extra</th>
            </tr>
          </thead>
          <tbody>
            {order.map((row) => {
              const p = byName[row.name];
              const bd = breakdownTotals(p);
              const podium = row.rank <= 3 ? `podium r${row.rank}` : '';
              return [
                <tr
                  key={row.name}
                  className={`${podium}${me === row.name ? ' me' : ''}`}
                  onClick={() => setOpen(open === row.name ? null : row.name)}
                >
                  <td className="num rank">{row.rank}</td>
                  <td className="name"><span className="pname" title={row.name}>{row.name}</span></td>
                  <td className="num total">{row.points}</td>
                  <td className="num bd">{bd.grupos}</td>
                  <td className="num bd">{bd.posiciones}</td>
                  <td className="num bd">{bd.clasificados}</td>
                  <td className="num bd">{bd.eliminatorias}</td>
                  <td className="num bd">{bd.extra}</td>
                </tr>,
                open === row.name ? (
                  <tr key={row.name + '-d'} className="bd-detail">
                    <td colSpan={3}>
                      <span><b>Grupos</b> {bd.grupos}</span>
                      <span><b>Posic.</b> {bd.posiciones}</span>
                      <span><b>Clasif.</b> {bd.clasificados}</span>
                      <span><b>Elim.</b> {bd.eliminatorias}</span>
                      <span><b>Extra</b> {bd.extra}</span>
                    </td>
                  </tr>
                ) : null,
              ];
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Grupos = aciertos de partidos de grupos · Posic. = posiciones exactas de grupo · Clasif. =
        puntos por equipo clasificado · Elim. = partidos de eliminatorias · Extra = cuadro de honor.
        <span className="only-mobile"> En el móvil, toca una fila para ver su desglose.</span>
      </p>
      <RulesNote />
    </section>
  );
}
