import { useMemo, useState } from 'react';
import { PALETTE } from '../utils.js';

const SHORT = {
  g1: 'J1', g2: 'J2', g3: 'J3', r32: '16avos', r16: 'Octavos',
  qf: 'Cuartos', sf: 'Semis', tp: '3º/4º', fin: 'Final',
};

// Gráfico SVG (sin librerías) de puntos acumulados por jornada.
export default function EvolutionChart({ scores }) {
  const { jornadas, standingsByJornada, participants, finalStandings } = scores;
  const leaderName = finalStandings[0]?.name ?? null;

  const colorByName = useMemo(() => {
    const m = {};
    participants.forEach((p, i) => (m[p.name] = PALETTE[i % PALETTE.length]));
    return m;
  }, [participants]);

  // puntos acumulados por nombre y jornada
  const pointsAt = useMemo(() => {
    const m = {};
    for (const j of jornadas) {
      m[j.key] = {};
      for (const row of standingsByJornada[j.key] || []) m[j.key][row.name] = row.points;
    }
    return m;
  }, [jornadas, standingsByJornada]);

  // última jornada con algún punto
  let lastIdx = -1;
  for (let i = 0; i < jornadas.length; i++) {
    const k = jornadas[i].key;
    if (participants.some((p) => (pointsAt[k]?.[p.name] || 0) > 0)) lastIdx = i;
  }

  const [active, setActive] = useState(leaderName);
  const [hover, setHover] = useState(null);
  const hl = hover ?? active;

  if (lastIdx < 0) {
    return <p className="muted small">Aún no hay datos para el gráfico. Aparecerá cuando se jueguen partidos.</p>;
  }

  const xs = jornadas.slice(0, lastIdx + 1);
  const n = xs.length;

  const W = 720, H = 320, padL = 38, padR = 14, padT = 14, padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  let rawMax = 0;
  for (const j of xs) for (const p of participants) rawMax = Math.max(rawMax, pointsAt[j.key]?.[p.name] || 0);
  const maxY = Math.max(10, Math.ceil(rawMax / 10) * 10);

  const x = (i) => (n === 1 ? padL + plotW / 2 : padL + (i * plotW) / (n - 1));
  const y = (v) => padT + plotH - (v / maxY) * plotH;

  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f));

  // ordenar leyenda por clasificación
  const legend = finalStandings.map((r) => r.name);

  const seriesPoints = (name) => xs.map((j, i) => [x(i), y(pointsAt[j.key]?.[name] || 0)]);

  return (
    <div className="chart">
      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="evolution" role="img" aria-label="Evolución de puntos por jornada">
          {/* rejilla horizontal + etiquetas Y */}
          {gridVals.map((v) => (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className="grid" />
              <text x={padL - 6} y={y(v) + 3} className="axis y">{v}</text>
            </g>
          ))}
          {/* etiquetas X */}
          {xs.map((j, i) => (
            <text key={j.key} x={x(i)} y={H - 10} className="axis x">{SHORT[j.key] || j.label}</text>
          ))}
          {/* líneas por participante */}
          {legend.map((name) => {
            const pts = seriesPoints(name);
            const color = colorByName[name];
            const isHl = hl === name;
            const dim = hl && !isHl;
            const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
            return (
              <g key={name} opacity={dim ? 0.18 : 1}>
                {n > 1 && <path d={path} fill="none" stroke={color} strokeWidth={isHl ? 3 : 1.5} />}
                {pts.map((p, i) => (
                  <circle key={i} cx={p[0]} cy={p[1]} r={isHl ? 3.5 : 2.2} fill={color} />
                ))}
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
            {name}
          </button>
        ))}
      </div>
      <p className="muted small">
        Puntos acumulados por jornada. Pasa el ratón o toca un nombre para resaltarlo.
      </p>
    </div>
  );
}
