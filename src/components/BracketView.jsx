import Team from './Team.jsx';
import ConnectedBracket from './ConnectedBracket.jsx';
import { buildBracketRounds } from '../services/tournamentUtils.js';

// Cuadro de eliminatorias: árbol conectado que muestra cada cruce (quién vs
// quién). Se va rellenando con la clasificación de grupos y, cuando la API tiene
// los cruces reales, los coloca en su sitio.
export default function BracketView({ tournament }) {
  const rounds = buildBracketRounds(tournament);
  if (!rounds[0].some(Boolean)) {
    return <p className="muted small">El cuadro aparecerá cuando empiecen a jugarse los grupos.</p>;
  }

  const matches = tournament?.matches || [];
  const anyReal = matches.some((m) => m.stage !== 'GROUP_STAGE' && (m.home?.code || m.away?.code));
  const tp = matches.find((m) => m.stage === 'THIRD_PLACE' && m.home?.code && m.away?.code);
  const played = (m) => m && m.score?.home != null && m.score?.away != null;

  return (
    <div>
      <p className="muted small">
        {anyReal ? (
          <>Cuadro con los <b>cruces reales</b>; las rondas por jugar se completan según avanza el torneo.</>
        ) : (
          <>
            Cuadro <b>provisional</b>: se va rellenando con la clasificación de los grupos. En los cruces
            aún sin equipo se indica qué los alimenta (<i>1º E</i>, <i>3º (A/B/C/D/F)</i>). Los cruces
            reales aparecerán al cerrarse los grupos.
          </>
        )}
      </p>
      <ConnectedBracket rounds={rounds} />
      {tp && (
        <p className="muted small third-place">
          <b>3º y 4º puesto:</b> <Team code={tp.home.code} />{' '}
          {played(tp) ? `${tp.score.home}-${tp.score.away}` : 'vs'} <Team code={tp.away.code} />
        </p>
      )}
    </div>
  );
}
