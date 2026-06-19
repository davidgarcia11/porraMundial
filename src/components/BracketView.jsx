import Team from './Team.jsx';
import ConnectedBracket from './ConnectedBracket.jsx';
import { provisionalR32 } from '../services/tournamentUtils.js';

const STAGES = [
  ['LAST_32', 'Dieciseisavos'],
  ['LAST_16', 'Octavos'],
  ['QUARTER_FINALS', 'Cuartos'],
  ['SEMI_FINALS', 'Semifinales'],
  ['THIRD_PLACE', '3º y 4º'],
  ['FINAL', 'Final'],
];

// Orden de árbol de los 16 dieciseisavos (índices de R32_SLOTS) para que cada
// par alimente al mismo octavo. Derivado de la estructura W73-W75…
const LEAF_ORDER = [0, 2, 1, 4, 10, 11, 8, 9, 3, 5, 6, 7, 13, 15, 12, 14];

function Side({ team, score, winner }) {
  return (
    <div className={`bk-team${winner ? ' win' : ''}`}>
      <span className="bk-name">{team?.code ? <Team code={team.code} /> : <span className="tbd">Por determinar</span>}</span>
      <span className="bk-score">{score ?? ''}</span>
    </div>
  );
}

// Cuadro de eliminatorias.
export default function BracketView({ tournament }) {
  const matches = tournament?.matches || [];
  const knockout = matches.filter((m) => m.stage !== 'GROUP_STAGE');

  if (!knockout.length) {
    return <p className="muted small">El cuadro de eliminatorias aparecerá cuando la organización publique los cruces.</p>;
  }

  const hasRealKnockout = knockout.some((m) => m.home?.code || m.away?.code);
  const provR32 = !hasRealKnockout ? provisionalR32(tournament?.groups || {}) : null;

  // Vista provisional: cuadro visual conectado.
  if (provR32) {
    const rounds = [
      LEAF_ORDER.map((i) => provR32[i]),
      Array.from({ length: 8 }, () => null),
      Array.from({ length: 4 }, () => null),
      Array.from({ length: 2 }, () => null),
      Array.from({ length: 1 }, () => null),
    ];
    return (
      <div>
        <p className="muted small">
          Cuadro <b>provisional</b> según la clasificación actual. Las rondas a partir de octavos y el
          partido por el 3º puesto se rellenan solos según avanza el torneo.
        </p>
        <ConnectedBracket rounds={rounds} />
      </div>
    );
  }

  // Vista real (la API ya tiene equipos): columnas por ronda.
  return (
    <div>
      <div className="bracket">
        {STAGES.map(([stage, label]) => {
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
