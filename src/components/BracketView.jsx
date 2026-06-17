import Team from './Team.jsx';

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

// Cuadro de eliminatorias (se completa solo según avanza el torneo).
export default function BracketView({ tournament }) {
  const matches = tournament?.matches || [];
  const knockout = matches.filter((m) => m.stage !== 'GROUP_STAGE');

  if (!knockout.length) {
    return <p className="muted small">El cuadro de eliminatorias aparecerá cuando la organización publique los cruces.</p>;
  }

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
                const homeWin = m.winner === 'HOME_TEAM';
                const awayWin = m.winner === 'AWAY_TEAM';
                return (
                  <div key={m.id} className="bracket-match">
                    <Side team={m.home} score={played ? m.score.home : null} winner={homeWin} />
                    <Side team={m.away} score={played ? m.score.away : null} winner={awayWin} />
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
