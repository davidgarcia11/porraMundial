import { teamFlag, teamName } from '../data/teams.js';
import { pointsInPlay } from '../services/analysis.js';

// Puntos aún en juego: máximo alcanzable y estado del campeón de cada uno.
export default function PointsInPlayView({ predictions, results, scores, me }) {
  const rows = pointsInPlay(predictions, results, scores).sort(
    (a, b) => b.current - a.current || b.maxAchievable - a.maxAchievable
  );
  const leaderNow = rows.reduce((mx, r) => Math.max(mx, r.current), 0);

  return (
    <div>
      <p className="muted small">
        "Máx. alcanzable" = puntos actuales + todo lo que aún podría sumar si le saliera perfecto
        (partidos por jugar, posiciones, clasificados, eliminatorias y cuadro de honor). La bandera es
        su campeón (con ✗ si ya está eliminado); como vale <b>1000</b>, es decisivo.
      </p>
      <div className="table-wrap">
        <table className="standings">
          <thead>
            <tr>
              <th>Participante</th>
              <th className="num">Puntos</th>
              <th className="num">Máx. alcanzable</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const out = r.maxAchievable < leaderNow;
              return (
                <tr key={r.name} className={me === r.name ? 'me' : ''}>
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
                  <td className="num total">{r.current}</td>
                  <td className={`num ${out ? 'muted' : ''}`}>{r.maxAchievable}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Si el "Máx. alcanzable" de alguien es menor que los puntos del líder actual, ya no puede ser
        primero (aparece atenuado). Durante la fase de grupos nadie está eliminado todavía.
      </p>
    </div>
  );
}
