import Team from './Team.jsx';
import { rankThirds } from '../services/tournamentUtils.js';

// Tablas de los grupos del Mundial (en vivo desde la API).
export default function GroupsView({ tournament }) {
  const groups = tournament?.groups || {};
  const letters = Object.keys(groups).sort();

  if (!letters.length) {
    return <p className="muted small">No hay clasificación de grupos disponible todavía.</p>;
  }

  const thirds = rankThirds(groups);
  const qualifiedThirds = new Set(thirds.slice(0, 8).map((t) => t.code).filter(Boolean));

  return (
    <div>
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
                  {groups[g].map((r, i) => {
                    const cls = [
                      r.position <= 2 ? 'qualify' : '',
                      r.position === 3 && qualifiedThirds.has(r.code) ? 'third-q' : '',
                    ].join(' ').trim();
                    return (
                      <tr key={r.code || r.name || i} className={cls}>
                        <td className="num">{r.position}</td>
                        <td>{r.code ? <Team code={r.code} /> : r.name}</td>
                        <td className="num">{r.playedGames}</td>
                        <td className="num">{r.won}</td>
                        <td className="num">{r.draw}</td>
                        <td className="num">{r.lost}</td>
                        <td className="num">{r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}</td>
                        <td className="num pts">{r.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <p className="muted small">
        <span className="key-dot q" /> 1º y 2º (clasifican) ·{' '}
        <span className="key-dot t" /> mejores terceros (clasifican 8 de 12).
      </p>

      {thirds.length > 0 && (
        <div className="thirds">
          <h4>Mejores terceros</h4>
          <div className="table-wrap">
            <table className="grp thirds-tbl">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th className="num">Gr.</th>
                  <th>Equipo</th>
                  <th className="num">PJ</th>
                  <th className="num">DG</th>
                  <th className="num pts">Pts</th>
                </tr>
              </thead>
              <tbody>
                {thirds.map((t, i) => (
                  <tr key={t.code || t.group} className={i < 8 ? 'tq' : ''}>
                    <td className="num">{i + 1}</td>
                    <td className="num">{t.group}</td>
                    <td>{t.code ? <Team code={t.code} /> : t.name}</td>
                    <td className="num">{t.playedGames}</td>
                    <td className="num">{t.goalDifference > 0 ? `+${t.goalDifference}` : t.goalDifference}</td>
                    <td className="num pts">{t.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Clasificación provisional de terceros; los 8 primeros (resaltados) pasan a dieciseisavos.</p>
        </div>
      )}
    </div>
  );
}
