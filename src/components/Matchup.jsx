import Team from './Team.jsx';

// Cruce apilado: local arriba, visitante abajo (más limpio que "vs" en medio,
// sobre todo en móvil con nombres largos).
export default function Matchup({ home, away }) {
  return (
    <span className="matchup">
      <Team code={home} />
      <Team code={away} />
    </span>
  );
}
