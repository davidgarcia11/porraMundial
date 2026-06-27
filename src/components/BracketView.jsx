import Team from './Team.jsx';
import ConnectedBracket from './ConnectedBracket.jsx';
import { provisionalR32, provisionalQualifiers } from '../services/tournamentUtils.js';

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

function QualCol({ title, items, highlight }) {
  return (
    <div className={`qual-col${highlight ? ' hl' : ''}`}>
      <h5>{title}</h5>
      <ul>
        {items.map((t) => (
          <li key={(t.group || '') + (t.code || t.name)}>
            <span className="qg">{t.group}</span>
            {t.code ? <Team code={t.code} /> : <span className="tbd">{t.name}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BracketView({ tournament }) {
  const matches = tournament?.matches || [];
  const knockout = matches.filter((m) => m.stage !== 'GROUP_STAGE');
  const groupMatches = matches.filter((m) => m.stage === 'GROUP_STAGE');
  const groupStageComplete = groupMatches.length > 0 && groupMatches.every((m) => m.status === 'FINISHED');
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

  // 2) Fase de grupos TERMINADA -> cuadro provisional completo (árbol).
  const provR32 = groupStageComplete ? provisionalR32(groups) : null;
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
          Cuadro <b>provisional</b> según la clasificación final de grupos. Los cruces reales se
          confirmarán en cuanto la organización los publique.
        </p>
        <ConnectedBracket rounds={rounds} />
      </div>
    );
  }

  // 3) Grupos en juego -> clasificados provisionales (el cuadro aún no tiene sentido).
  if (Object.keys(groups).length) {
    const q = provisionalQualifiers(groups);
    return (
      <div className="prov-qual">
        <h4>Clasificados a dieciseisavos (provisional)</h4>
        <div className="qual-cols">
          <QualCol title="Primeros" items={q.firsts} />
          <QualCol title="Segundos" items={q.seconds} />
          <QualCol title="Mejores terceros" items={q.thirds} highlight />
        </div>
        <p className="muted small">
          Según la clasificación actual. El <b>cuadro</b> se dibujará cuando termine la fase de grupos
          (cuando el orden de cada grupo esté cerrado).
        </p>
      </div>
    );
  }

  return <p className="muted small">El cuadro aparecerá cuando avance el torneo.</p>;
}
