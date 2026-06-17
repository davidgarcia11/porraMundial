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

  // La evolución solo aporta con 2+ jornadas; con una sola sería igual que la general.
  if (lastIdx < 1) {
    return (
      <p className="muted small">
        La evolución se mostrará cuando se haya jugado más de una jornada (para comparar el avance
        de cada participante). De momento, consulta la <b>Clasificación general</b>.
      </p>
    );
  }

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

// Catmull-Rom -> curva bézier suave que pasa por todos los puntos.
function smoothPath(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  const d = [`M${pts[0][0]},${pts[0][1]}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`);
  }
  return d.join(' ');
}

function LineChart({ jornadas: xs, standingsByJornada, participants, finalStandings, colorByName }) {
  const leaderName = finalStandings[0]?.name ?? null;
  const [active, setActive] = useState(leaderName);
  const [hover, setHover] = useState(null);
  const hl = hover ?? active;

  const valAt = useMemo(() => {
    const m = {};
    for (const j of xs) {
      m[j.key] = {};
      for (const row of standingsByJornada[j.key] || []) m[j.key][row.name] = row.points;
    }
    return m;
  }, [xs, standingsByJornada]);

  const n = xs.length;
  const W = 720, H = 300, padL = 16, padR = 16, padT = 26, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const baseY = padT + plotH;

  let rawMax = 0;
  for (const j of xs) for (const p of participants) rawMax = Math.max(rawMax, valAt[j.key]?.[p.name] || 0);
  const maxY = Math.max(10, Math.ceil(rawMax / 10) * 10);

  const x = (i) => padL + (i * plotW) / (n - 1);
  const y = (v) => padT + plotH - (v / maxY) * plotH;
  const series = (name) => xs.map((j, i) => [x(i), y(valAt[j.key]?.[name] || 0)]);

  // dibuja primero las líneas de fondo y al final la resaltada (encima)
  const others = finalStandings.map((r) => r.name).filter((nm) => nm !== hl);
  const hlColor = hl ? colorByName[hl] : null;
  const hlPts = hl ? series(hl) : null;

  return (
    <div className="chart">
      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="evolution" role="img" aria-label="Evolución de puntos por jornada">
          {hlColor && (
            <defs>
              <linearGradient id="evoArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={hlColor} stopOpacity="0.45" />
                <stop offset="100%" stopColor={hlColor} stopOpacity="0" />
              </linearGradient>
            </defs>
          )}

          {/* etiquetas de jornada */}
          {xs.map((j, i) => (
            <text key={j.key} x={x(i)} y={H - 8} className="axis x">{SHORT[j.key] || j.label}</text>
          ))}

          {/* líneas de fondo (resto de participantes) */}
          {others.map((name) => (
            <path
              key={name}
              d={smoothPath(series(name))}
              fill="none"
              stroke={colorByName[name]}
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={hl ? 0.18 : 0.7}
            />
          ))}

          {/* participante resaltado: área + línea + badges */}
          {hl && (
            <g>
              <path d={`${smoothPath(hlPts)} L${hlPts[n - 1][0]},${baseY} L${hlPts[0][0]},${baseY} Z`} fill="url(#evoArea)" stroke="none" />
              <path d={smoothPath(hlPts)} fill="none" stroke={hlColor} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
              {hlPts.map((p, i) => {
                const v = valAt[xs[i].key]?.[hl] || 0;
                return (
                  <g key={i} transform={`translate(${p[0]},${p[1]})`}>
                    <rect x={-15} y={-26} width={30} height={17} rx={8} fill={hlColor} />
                    <text x={0} y={-14} className="badge">{v}</text>
                    <circle cx={0} cy={0} r={3.5} fill="#0f1216" stroke={hlColor} strokeWidth={2.5} />
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      </div>

      <div className="legend">
        {finalStandings.map((r) => (
          <button
            key={r.name}
            className={`legend-item${hl === r.name ? ' on' : ''}`}
            onMouseEnter={() => setHover(r.name)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setActive((a) => (a === r.name ? null : r.name))}
            title={r.name}
          >
            <span className="swatch" style={{ background: colorByName[r.name] }} />
            {shortName(r.name)}
          </button>
        ))}
      </div>
      <p className="muted small">Puntos acumulados por jornada. Toca un nombre para resaltar su evolución.</p>
    </div>
  );
}
