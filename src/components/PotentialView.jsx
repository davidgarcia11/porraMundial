import { useMemo } from 'react';
import { potentialIndex } from '../services/analysis.js';

// Índice de potencial: techo realista de cada participante (si acierta lo que le
// queda con sus picks aún vivos). No es una probabilidad.
export default function PotentialView({ predictions, results, scores, me }) {
  const rows = useMemo(() => potentialIndex(predictions, results, scores), [predictions, results, scores]);
  const max = rows[0]?.potential || 1;

  return (
    <div>
      <p className="muted small">
        "Potencial" = lo máximo que aún podría sumar cada uno <b>si acierta lo que le queda</b>, pero
        contando solo lo que <b>sigue siendo posible</b>: campeones/equipos aún vivos y las botas según
        la <b>posición actual</b> de su goleador (si tu goleador va 1º, suma más). No es una
        probabilidad: es el techo realista de cada uno.
      </p>
      <div className="table-wrap">
        <table className="standings">
          <thead>
            <tr>
              <th>Participante</th>
              <th className="num">Puntos</th>
              <th className="num">Potencial</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className={me === r.name ? 'me' : ''}>
                <td className="name"><span className="pname" title={r.name}>{r.name}</span></td>
                <td className="num total">{r.current}</td>
                <td className="num prob-cell">
                  <span className="prob-bar" style={{ width: `${(r.potential / max) * 100}%` }} />
                  <span className="prob-val">{r.potential}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
