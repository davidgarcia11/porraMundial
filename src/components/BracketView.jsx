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

// Orden de árbol de los 16 dieciseisavos (derivado de la estructura W73-W75…).
const LEAF_ORDER = [0, 2, 1, 4, 10, 11, 8, 9, 3, 5, 6, 7, 13, 15, 12, 14];

function Side({ team, score, winner }) {
  return (
    <div className={`bk-team${winner ? ' win' : ''}`}>
      <span className="bk-name">{team?.code ? <Team code={team.code} /> : <span className="tbd">Por determinar</span>}</span>
      <span className="bk-score">{score ?? ''}</span>
    </div>
  );
}

export default function BracketView({ tournament }) {
  const matches = tournament?.matches || [];
  const knockout = matches.filter((m) => m.stage !== 'GROUP_STAGE');
  const hasRealKnockout = knockout.some((m) => m.home?.code || m.away?.code);
  const groups = tournament?.groups || {};

  // 1) La API ya tiene cruces reales -> vista por rondas con los equipos reales.
  if (hasRealKnockout) {
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

  // 2) Cuadro provisional que se va rellenando solo según la clasificación de grupos.
  const provR32 = provisionalR32(groups);
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
          Cuadro <b>provisional</b>: se va rellenando según la clasificación de los grupos. En los
          cruces que aún no tienen equipo se indica qué lo alimenta (p. ej. <i>1º E</i> o
          <i> 3º (A/B/C/D/F)</i>). Los cruces reales aparecerán cuando la organización los publique.
        </p>
        <ConnectedBracket rounds={rounds} />
      </div>
    );
  }

  return <p className="muted small">El cuadro aparecerá cuando empiecen a jugarse los grupos.</p>;
}
