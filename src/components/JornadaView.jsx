import { useMemo, useState } from 'react';
import { medal } from '../utils.js';

export default function JornadaView({ scores }) {
  const { jornadas, standingsByJornada, participants } = scores;
  const pointsByName = Object.fromEntries(participants.map((p) => [p.name, p.jornada]));

  // default to the last jornada with any points scored
  const defaultKey = useMemo(() => {
    for (let i = jornadas.length - 1; i >= 0; i--) {
      const k = jornadas[i].key;
      if (participants.some((p) => p.jornada[k] > 0)) return k;
    }
    return jornadas[0].key;
  }, [jornadas, participants]);

  const [key, setKey] = useState(defaultKey);
  const current = jornadas.find((j) => j.key === key) || jornadas[0];
  const standings = standingsByJornada[key] || [];

  return (
    <section>
      <h2>Clasificación por jornada</h2>
      <div className="jornada-picker">
        {jornadas.map((j) => (
          <button
            key={j.key}
            className={j.key === key ? 'chip active' : 'chip'}
            onClick={() => setKey(j.key)}
          >
            {j.label}
          </button>
        ))}
      </div>

      <h3 className="jornada-title">{current.label} · acumulado</h3>
      <div className="table-wrap">
        <table className="standings">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Participante</th>
              <th className="num">Pts. jornada</th>
              <th className="num total">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr key={row.name} className={row.rank <= 3 ? `podium r${row.rank}` : ''}>
                <td className="num rank">{medal(row.rank) || row.rank}</td>
                <td className="name">{row.name}</td>
                <td className="num gained">+{pointsByName[row.name][key] || 0}</td>
                <td className="num total">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        "Acumulado" suma todas las jornadas hasta {current.label.toLowerCase()} incluida. Las
        posiciones de grupo y los clasificados a dieciseisavos se contabilizan en la Jornada 3.
      </p>
    </section>
  );
}
