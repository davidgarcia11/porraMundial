import { crucesTracking } from '../services/analysis.js';

// Seguimiento de cruces "habilitados" por participante (acertar los 2 equipos).
export default function CrucesView({ predictions, results, me }) {
  const { names, rounds, totals } = crucesTracking(predictions, results);

  if (!rounds.length) {
    return (
      <p className="muted small">
        Aún no hay cruces de eliminatorias. Cuando se conozcan los enfrentamientos, aquí verás cuántos
        ha acertado cada participante (los dos equipos del cruce), que son los que le pueden puntuar.
      </p>
    );
  }

  // orden por total de cruces acertados
  const order = names
    .map((name, i) => ({ name, total: totals[i], idx: i }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return (
    <div>
      <p className="muted small">
        Cruces <b>acertados</b> (los dos equipos) por ronda: son los únicos partidos de eliminatorias
        que te pueden puntuar. El número es sobre los cruces ya conocidos de cada ronda.
      </p>
      <div className="table-wrap">
        <table className="standings">
          <thead>
            <tr>
              <th>Participante</th>
              {rounds.map((r) => (
                <th key={r.key} className="num" title={`${r.known} cruces conocidos`}>
                  {r.label}
                </th>
              ))}
              <th className="num total">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.map((row) => (
              <tr key={row.name} className={me === row.name ? 'me' : ''}>
                <td className="name"><span className="pname" title={row.name}>{row.name}</span></td>
                {rounds.map((r) => {
                  const v = r.perParticipant[row.idx];
                  return (
                    <td key={r.key} className={`num ${v ? 'pos' : ''}`}>
                      {v}<span className="muted small">/{r.known}</span>
                    </td>
                  );
                })}
                <td className="num total">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
