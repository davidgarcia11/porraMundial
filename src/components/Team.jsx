import { teamName, teamFlag } from '../data/teams.js';

// Bandera + nombre de una selección. En móvil se muestra el código corto
// (CDS, RPC…) y en pantallas grandes el nombre completo (CSS decide cuál).
export default function Team({ code }) {
  const flag = teamFlag(code);
  return (
    <span className="team">
      {flag && <span className="flag" aria-hidden="true">{flag}</span>}
      <span className="team-code">{code}</span>
      <span className="team-name">{teamName(code)}</span>
    </span>
  );
}
