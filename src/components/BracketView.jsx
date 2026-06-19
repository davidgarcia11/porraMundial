import Team from './Team.jsx';
import { provisionalR32 } from '../services/tournamentUtils.js';

const STAGES = [
  ['LAST_32', 'Dieciseisavos'],
  ['LAST_16', 'Octavos'],
  ['QUARTER_FINALS', 'Cuartos'],
  ['SEMI_FINALS', 'Semifinales'],
  ['THIRD_PLACE', '3º y 4º'],
  ['FINAL', 'Final'],
];

function Side({ team, score, winner }) {
  return (
    <div className={`bk-team${winner ? ' win' : ''}`}>
      <span className="bk-name">{team?.code ? <Team code={team.code} /> : <span className="tbd">Por determinar</span>}</span>
      <span className="bk-score">{score ?? ''}</span>
    </div>
  );
}

function ProvSide({ side }) {
  return (
    <div className="bk-team">
      <span className="bk-name">{side.code ? <Team code={side.code} /> : <span className="tbd">Por determinar</span>}</span>
      <span className="bk-pos">{side.label}</span>
    </div>
  );
}

// Cuadro de eliminatorias (se completa solo según avanza el torneo).
export default function BracketView({ tournament }) {
  const matches = tournament?.matches || [];
  const knockout = matches.filter((m) => m.stage !== 'GROUP_STAGE');

  if (!knockout.length) {
    return <p className="muted small">El cuadro de eliminatorias aparecerá cuando la organización publique los cruces.</p>;
  }

  const hasRealKnockout = knockout.some((m) => m.home?.code || m.away?.code);
  const provR32 = !hasRealKnockout ? provisionalR32(tournament?.groups || {}) : null;

  return (
    <div>
      {provR32 && (
        <p className="muted small">
          Dieciseisavos <b>provisionales</b> según la clasificación actual; los cruces reales se
          rellenan solos al terminar los grupos.
        </p>
      )}
      <div className="bracket">
        {STAGES.map(([stage, label]) => {
          // dieciseisavos provisionales mientras no haya equipos reales
          if (stage === 'LAST_32' && provR32) {
            return (
              <div key={stage} className="bracket-col">
                <h4 className="bracket-h">{label} <span className="prov-tag">prov.</span></h4>
                {provR32.map((m, i) => (
                  <div key={i} className="bracket-match prov">
                    <ProvSide side={m.a} />
                    <ProvSide side={m.b} />
                  </div>
                ))}
              </div>
            );
          }
          const ms = knockout.filter((m) => m.stage === stage);
          if (!ms.length) return null;
          return (
            <div key={stage} className="bracket-col">
              <h4 className="bracket-h">{label}</h4>
              {ms.map((m) => {
                const played = m.score.home != null && m.score.away != null;
                return (
                  <div key={m.id} className="bracket-match">
                    <Side team={m.home} score={played ? m.score.home : null} winner={m.winner === 'HOME_TEAM'} />
                    <Side team={m.away} score={played ? m.score.away : null} winner={m.winner === 'AWAY_TEAM'} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="muted small">Desliza horizontalmente para ver todas las rondas.</p>
    </div>
  );
}
