// Cabecera destacada con el líder actual y el resto del podio.
export default function LeaderBanner({ standings }) {
  if (!standings || !standings.length) return null;
  const [leader, second, third] = standings;

  return (
    <div className="leader-banner">
      <div className="leader-main">
        <span className="leader-tag">Líder</span>
        <span className="leader-name">{leader.name}</span>
        <span className="leader-points">{leader.points} pts</span>
      </div>
      <div className="leader-rest">
        {second && (
          <div className="podium-mini r2">
            <span className="pos">2º</span> {second.name}
            <span className="pts">{second.points}</span>
          </div>
        )}
        {third && (
          <div className="podium-mini r3">
            <span className="pos">3º</span> {third.name}
            <span className="pts">{third.points}</span>
          </div>
        )}
      </div>
    </div>
  );
}
