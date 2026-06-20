import { useMemo } from 'react';
import { currentProjection } from '../services/analysis.js';

// Proyección con la clasificación de grupos tal como está ahora.
export default function ProjectionView({ predictions, results, scores, me }) {
  const rows = useMemo(() => currentProjection(predictions, results, scores), [predictions, results, scores]);
  const hasGroups = Object.keys(results.tournament?.groups || {}).length > 0;

  return (
    <div>
      <p className="muted small">
        Quién va mejor <b>según lo que ya está acertando</b>: a los puntos actuales se le suman las
        <b> posiciones de grupo</b> y los <b>clasificados a dieciseisavos</b> que acertaría <b>si los
        grupos acabaran como están ahora</b>. Se actualiza al moverse la clasificación.
      </p>
      {!hasGroups && (
        <p className="muted small">Aún no hay clasificación de grupos para proyectar.</p>
      )}
      <div className="table-wrap">
        <table className="standings">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Participante</th>
              <th className="num">Ahora</th>
              <th className="num total">Proyectado</th>
              <th className="num">+</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className={me === r.name ? 'me' : ''}>
                <td className="num rank">{i + 1}</td>
                <td className="name"><span className="pname" title={r.name}>{r.name}</span></td>
                <td className="num">{r.current}</td>
                <td className="num total">{r.projected}</td>
                <td className="num gained">+{r.projected - r.current}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        "+" = lo que ganaría ahora mismo por el orden actual de los grupos (posiciones y clasificados).
        Los puntos de eliminatorias y del cuadro de honor llegarán cuando se jueguen.
      </p>
    </div>
  );
}
