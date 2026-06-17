import Team from './Team.jsx';

// Tablas de los grupos del Mundial (en vivo desde la API).
export default function GroupsView({ tournament }) {
  const groups = tournament?.groups || {};
  const letters = Object.keys(groups).sort();

  if (!letters.length) {
    return <p className="muted small">No hay clasificación de grupos disponible todavía.</p>;
  }

  return (
    <div className="groups-grid">
      {letters.map((g) => (
        <div key={g} className="group-card">
          <h4>Grupo {g}</h4>
          <div className="table-wrap">
            <table className="grp">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Equipo</th>
                  <th className="num">PJ</th>
                  <th className="num">G</th>
                  <th className="num">E</th>
                  <th className="num">P</th>
                  <th className="num">DG</th>
                  <th className="num pts">Pts</th>
                </tr>
              </thead>
              <tbody>
                {groups[g].map((r, i) => (
                  <tr key={r.code || r.name || i} className={r.position <= 2 ? 'qualify' : ''}>
                    <td className="num">{r.position}</td>
                    <td>{r.code ? <Team code={r.code} /> : r.name}</td>
                    <td className="num">{r.playedGames}</td>
                    <td className="num">{r.won}</td>
                    <td className="num">{r.draw}</td>
                    <td className="num">{r.lost}</td>
                    <td className="num">{r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}</td>
                    <td className="num pts">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="muted small">Las dos primeras de cada grupo (resaltadas) avanzan; además pasan los mejores terceros.</p>
    </div>
  );
}
