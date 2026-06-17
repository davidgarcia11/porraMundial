import { useMemo, useState } from 'react';
import { PALETTE, shortName } from '../utils.js';

const SHORT = {
  g1: 'J1', g2: 'J2', g3: 'J3', r32: '16avos', r16: 'Octavos',
  qf: 'Cuartos', sf: 'Semis', tp: '3º/4º', fin: 'Final',
};

export default function EvolutionChart({ scores }) {
  const { jornadas, standingsByJornada, participants, finalStandings } = scores;

  const colorByName = useMemo(() => {
    const m = {};
    participants.forEach((p, i) => (m[p.name] = PALETTE[i % PALETTE.length]));
    return m;
  }, [participants]);

  // última jornada en la que ALGUIEN sumó puntos (delta, no acumulado)
  let lastIdx = -1;
  jornadas.forEach((j, i) => {
    if (participants.some((p) => (p.jornada[j.key] || 0) > 0)) lastIdx = i;
  });

  if (lastIdx < 0) {
    return <p className="muted small">Aún no hay datos. El gráfico aparecerá cuando se jueguen partidos.</p>;
  }

  // Con menos de 2 jornadas jugadas, una línea no dice nada -> barras de ranking.
  if (lastIdx < 1) return <RankingBars finalStandings={finalStandings} colorByName={colorByName} />;

  return (
    <LineChart
      jornadas={jornadas.slice(0, lastIdx + 1)}
      standingsByJornada={standingsByJornada}
      participants={participants}
      finalStandings={finalStandings}
      colorByName={colorByName}
    />
  );
}

function RankingBars({ finalStandings, colorByName }) {
  const max = Math.max(1, finalStandings[0]?.points || 1);
  return (
    <div className="chart">
      <div className="bars">
        {finalStandings.map((r) => (
          <div className="bar-row" key={r.name}>
            <span className="bar-name" title={r.name}>{r.name}</span>
            <span className="bar-track">
              <span
                className="bar-fill"
                style={{ width: `${(r.points / max) * 100}%`, background: colorByName[r.name] }}
              />
            </span>
            <span className="bar-val">{r.points}</span>
          </div>
        ))}
      </div>
      <p className="muted small">Puntos totales por participante. Cuando haya más jornadas verás aquí la evolución.</p>
    </div>
  );
}

function LineChart({ jornadas: xs, standingsByJornada, participants, finalStandings, colorByName }) {
  const leaderName = finalStandings[0]?.name ?? null;
  const [active, setActive] = useState(leaderName);
  const [hover, setHover] = useState(null);
  const hl = hover ?? active;

  const pointsAt = useMemo(() => {
    const m = {};
    for (const j of xs) {
      m[j.key] = {};
      for (const row of standingsByJornada[j.key] || []) m[j.key][row.name] = row.points;
    }
    return m;
  }, [xs, standingsByJornada]);

  const n = xs.length;
  const W = 720, H = 300, padL = 34, padR = 12, padT = 12, padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  let rawMax = 0;
  for (const j of xs) for (const p of participants) rawMax = Math.max(rawMax, pointsAt[j.key]?.[p.name] || 0);
  const maxY = Math.max(10, Math.ceil(rawMax / 10) * 10);

  const x = (i) => padL + (i * plotW) / (n - 1);
  const y = (v) => padT + plotH - (v / maxY) * plotH;
  const gridVals = [0, 0.5, 1].map((f) => Math.round(maxY * f));
  const legend = finalStandings.map((r) => r.name);
  const seriesPoints = (name) => xs.map((j, i) => [x(i), y(pointsAt[j.key]?.[name] || 0)]);

  return (
    <div className="chart">
      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="evolution" role="img" aria-label="Evolución de puntos por jornada">
          {gridVals.map((v) => (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className="grid" />
              <text x={padL - 6} y={y(v) + 3} className="axis y">{v}</text>
            </g>
          ))}
          {xs.map((j, i) => (
            <text key={j.key} x={x(i)} y={H - 9} className="axis x">{SHORT[j.key] || j.label}</text>
          ))}
          {legend.map((name) => {
            const pts = seriesPoints(name);
            const color = colorByName[name];
            const isHl = hl === name;
            const dim = hl && !isHl;
            const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
            return (
              <g key={name} opacity={dim ? 0.15 : 1}>
                <path d={path} fill="none" stroke={color} strokeWidth={isHl ? 3 : 1.5} strokeLinejoin="round" />
                {isHl && pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill={color} />)}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="legend">
        {legend.map((name) => (
          <button
            key={name}
            className={`legend-item${hl === name ? ' on' : ''}`}
            onMouseEnter={() => setHover(name)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setActive((a) => (a === name ? null : name))}
            title={name}
          >
            <span className="swatch" style={{ background: colorByName[name] }} />
            {shortName(name)}
          </button>
        ))}
      </div>
    </div>
  );
}
