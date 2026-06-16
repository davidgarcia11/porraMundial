import { sign } from '../scoring/engine.js';
import { teamName } from '../data/teams.js';

const matchday = (idx) => Math.floor(idx / 24) + 1;

const KNOCKOUT_LABELS = {
  dieciseisavos: 'Dieciseisavos',
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semifinales: 'Semifinales',
  tercer_puesto: '3º y 4º puesto',
  final: 'Final',
};

export default function MatchesView({ predictions, results }) {
  const jornadas = [1, 2, 3];

  return (
    <section>
      <h2>Partidos y resultados</h2>

      {jornadas.map((md) => (
        <div key={md}>
          <h3>Grupos · Jornada {md}</h3>
          <div className="table-wrap">
            <table className="matches">
              <thead>
                <tr>
                  <th>Partido</th>
                  <th className="num">Resultado</th>
                  <th className="num">Aciertan signo</th>
                  <th className="num">Exactos</th>
                </tr>
              </thead>
              <tbody>
                {predictions.groupMatches
                  .map((m, idx) => ({ m, idx }))
                  .filter(({ idx }) => matchday(idx) === md)
                  .map(({ m }) => {
                    const actual = results.groupMatches?.[m.id];
                    let signos = 0;
                    let exactos = 0;
                    if (actual) {
                      const aSign = sign(actual.h, actual.a);
                      for (const p of m.preds) {
                        if (p.sign === aSign) signos++;
                        if (p.h === actual.h && p.a === actual.a) exactos++;
                      }
                    }
                    return (
                      <tr key={m.id} className={actual ? '' : 'pending'}>
                        <td>
                          {teamName(m.home)} <span className="vs">vs</span> {teamName(m.away)}
                        </td>
                        <td className="num mono">{actual ? `${actual.h}-${actual.a}` : '—'}</td>
                        <td className="num">{actual ? signos : ''}</td>
                        <td className="num">{actual ? exactos : ''}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {Object.entries(KNOCKOUT_LABELS).map(([round, label]) => {
        const actuals = results.knockoutResults?.[round] || [];
        if (!actuals.length) return null;
        return (
          <div key={round}>
            <h3>{label}</h3>
            <div className="table-wrap">
              <table className="matches">
                <thead>
                  <tr>
                    <th>Partido</th>
                    <th className="num">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {actuals.map((a, i) => (
                    <tr key={i}>
                      <td>
                        {teamName(a.home)} <span className="vs">vs</span> {teamName(a.away)}
                      </td>
                      <td className="num mono">
                        {a.h}-{a.a}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
}
