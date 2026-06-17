import { teamName, teamFlag } from '../data/teams.js';

// Muestra la bandera + el nombre de una selección a partir de su código.
export default function Team({ code, flagOnly = false }) {
  const flag = teamFlag(code);
  return (
    <span className="team">
      {flag && <span className="flag" aria-hidden="true">{flag}</span>}
      {!flagOnly && <span className="team-name">{teamName(code)}</span>}
    </span>
  );
}
