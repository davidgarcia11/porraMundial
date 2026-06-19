import Team from './Team.jsx';
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
        (partidos por jugar, posiciones, clasificados, eliminatorias y cuadro de honor). Como el
        campeón vale <b>1000</b>, su estado es decisivo.
      </p>
      <div className="table-wrap">
        <table className="standings">
          <thead>
            <tr>
              <th>Participante</th>
              <th className="num">Puntos</th>
              <th className="num">Máx. alcanzable</th>
              <th>Su campeón</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              // ¿puede aún alcanzar/superar al actual líder?
              const out = r.maxAchievable < leaderNow;
              return (
                <tr key={r.name} className={me === r.name ? 'me' : ''}>
                  <td className="name">{r.name}</td>
                  <td className="num total">{r.current}</td>
                  <td className={`num ${out ? 'muted' : ''}`}>{r.maxAchievable}</td>
                  <td>
                    {r.champion.code ? <Team code={r.champion.code} /> : '—'}{' '}
                    {r.champion.code && (
                      <span className={`status ${r.champion.alive ? 'alive' : 'out'}`}>
                        {r.champion.alive ? 'vivo' : 'eliminado'}
                      </span>
                    )}
                  </td>
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
