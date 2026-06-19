import { MATCH_POINTS, POSITION_POINTS, QUALIFIER_POINTS, HONOR_POINTS } from '../scoring/config.js';

const MATCH_ROWS = [
  ['grupos', 'Fase de grupos'],
  ['dieciseisavos', 'Dieciseisavos'],
  ['octavos', 'Octavos'],
  ['cuartos', 'Cuartos'],
  ['semifinales', 'Semifinales'],
  ['tercer_puesto', '3º y 4º puesto'],
  ['final', 'Final'],
];

const QUAL_ROWS = [
  ['dieciseisavos', 'Dieciseisavos'],
  ['octavos', 'Octavos'],
  ['cuartos', 'Cuartos'],
  ['semifinales', 'Semifinales'],
  ['tercer_cuarto', '3º y 4º puesto'],
  ['final', 'Final'],
];

const HONOR_ROWS = [
  ['campeon', 'Campeón'],
  ['subcampeon', 'Subcampeón'],
  ['tercero', '3º puesto'],
  ['botaOro', 'Bota de Oro (máx. goleador)'],
  ['botaPlata', 'Bota de Plata'],
  ['botaBronce', 'Bota de Bronce'],
  ['balonOro', 'Balón de Oro (mejor jugador)'],
  ['mejorPortero', 'Mejor portero'],
];

export default function RulesNote() {
  return (
    <details className="rules">
      <summary>Sistema de puntuación</summary>

      <h4>Puntos por partido (acumulativos)</h4>
      <p className="muted small">
        El <b>signo</b> (1X2), la <b>diferencia</b> de goles y el <b>resultado exacto</b> suman entre
        sí: acertar el resultado exacto da las tres cosas. Desde dieciseisavos solo puntúas un
        partido si aciertas <b>los dos equipos</b> del cruce.
      </p>
      <div className="table-wrap">
        <table className="rules-tbl">
          <thead>
            <tr><th>Fase</th><th className="num">Signo</th><th className="num">Diferencia</th><th className="num">Exacto</th></tr>
          </thead>
          <tbody>
            {MATCH_ROWS.map(([k, label]) => (
              <tr key={k}>
                <td>{label}</td>
                <td className="num">{MATCH_POINTS[k].signo}</td>
                <td className="num">{MATCH_POINTS[k].diferencia}</td>
                <td className="num">{MATCH_POINTS[k].exacto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>Posición exacta de grupo</h4>
      <p className="muted small">{POSITION_POINTS} puntos por cada equipo colocado en su posición final (1º a 4º) del grupo.</p>

      <h4>Puntos por clasificado</h4>
      <p className="muted small">Por cada equipo que aciertes que alcanza cada ronda:</p>
      <div className="table-wrap">
        <table className="rules-tbl">
          <tbody>
            {QUAL_ROWS.map(([k, label]) => (
              <tr key={k}><td>{label}</td><td className="num">{QUALIFIER_POINTS[k]}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>Puntos extra (cuadro de honor)</h4>
      <div className="table-wrap">
        <table className="rules-tbl">
          <tbody>
            {HONOR_ROWS.map(([k, label]) => (
              <tr key={k}><td>{label}</td><td className="num">{HONOR_POINTS[k]}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
