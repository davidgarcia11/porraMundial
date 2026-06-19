import Team from './Team.jsx';
import { pointsInPlay } from '../services/analysis.js';

// Puntos aún en juego: estado del campeón de cada uno y puntos extra posibles.
export default function PointsInPlayView({ predictions, scores, tournament, me }) {
  const rows = pointsInPlay(predictions, scores, tournament).sort((a, b) => b.current - a.current);

  return (
    <div>
      <p className="muted small">
        El campeón vale <b>1000</b> puntos, así que decide la porra. Aquí ves si el campeón de cada
        uno sigue vivo y cuántos puntos del cuadro de honor puede aún conseguir.
      </p>
      <div className="table-wrap">
        <table className="standings">
          <thead>
            <tr>
              <th>Participante</th>
              <th className="num">Puntos</th>
              <th>Su campeón</th>
              <th className="num">Extra en juego</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className={me === r.name ? 'me' : ''}>
                <td className="name">{r.name}</td>
                <td className="num total">{r.current}</td>
                <td>
                  {r.champion.code ? <Team code={r.champion.code} /> : '—'}{' '}
                  {r.champion.code && (
                    <span className={`status ${r.champion.alive ? 'alive' : 'out'}`}>
                      {r.champion.alive ? 'vivo' : 'eliminado'}
                    </span>
                  )}
                </td>
                <td className="num">{r.extraInPlay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        "Extra en juego" = puntos de campeón/subcampeón/3º que todavía son posibles (sus equipos
        siguen vivos). Durante la fase de grupos nadie está eliminado todavía.
      </p>
    </div>
  );
}
