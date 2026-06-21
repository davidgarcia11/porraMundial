import { useMemo, useState } from 'react';
import { PALETTE, shortName } from '../utils.js';
import { dailyEvolution } from '../services/analysis.js';

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

const fmtDay = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');

export default function EvolutionChart({ scores, predictions, results }) {
  const { days, series, leaderName } = useMemo(
    () => dailyEvolution(predictions, results, scores),
    [predictions, results, scores]
  );

  const colorByName = useMemo(() => {
    const m = {};
    scores.participants.forEach((p, i) => (m[p.name] = PALETTE[i % PALETTE.length]));
    return m;
  }, [scores]);

  const [active, setActive] = useState(null);
  const [hover, setHover] = useState(null);
  const hl = hover ?? active ?? leaderName;

  if (!days.length) {
    return <p className="muted small">La evolución aparecerá cuando se jueguen partidos.</p>;
  }

  // valores con origen en 0 (para ver la subida desde el principio)
  const legend = scores.finalStandings.map((r) => r.name);
  const valsOf = (name) => [0, ...(series[name] || [])];
  const n = days.length + 1; // origen + días

  const W = 720, H = 300, padL = 30, padR = 14, padT = 26, padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const baseY = padT + plotH;

  let maxY = 10;
  for (const name of legend) for (const v of valsOf(name)) if (v > maxY) maxY = v;
  maxY = Math.ceil(maxY / 10) * 10;

  const x = (i) => padL + (i * plotW) / (n - 1 || 1);
  const y = (v) => padT + plotH - (v / maxY) * plotH;
  const pts = (name) => valsOf(name).map((v, i) => [x(i), y(v)]);

  const hlColor = hl ? colorByName[hl] : null;
  const hlPts = hl ? pts(hl) : null;
  const others = legend.filter((nm) => nm !== hl);

  // etiquetas del eje X (subconjunto si hay muchos días)
  const step = Math.max(1, Math.ceil(days.length / 6));
  const gridVals = [0, 0.5, 1].map((f) => Math.round(maxY * f));

  return (
    <div className="chart">
      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="evolution" role="img" aria-label="Evolución de puntos por día">
          {hlColor && (
            <defs>
              <linearGradient id="evoArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={hlColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={hlColor} stopOpacity="0" />
              </linearGradient>
            </defs>
          )}
          {gridVals.map((v) => (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} className="grid" />
              <text x={padL - 6} y={y(v) + 3} className="axis y">{v}</text>
            </g>
          ))}
          {days.map((d, i) =>
            i % step === 0 || i === days.length - 1 ? (
              <text key={d} x={x(i + 1)} y={H - 9} className="axis x">{fmtDay(d)}</text>
            ) : null
          )}

          {others.map((name) => (
            <path
              key={name}
              d={smoothPath(pts(name))}
              fill="none"
              stroke={colorByName[name]}
              strokeWidth={1.4}
              strokeLinecap="round"
              opacity={hl ? 0.16 : 0.7}
            />
          ))}

          {hl && (
            <g>
              <path d={`${smoothPath(hlPts)} L${hlPts[n - 1][0]},${baseY} L${hlPts[0][0]},${baseY} Z`} fill="url(#evoArea)" stroke="none" />
              <path d={smoothPath(hlPts)} fill="none" stroke={hlColor} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
              {hlPts.map((p, i) =>
                i >= 1 && ((i - 1) % step === 0 || i === n - 1) ? (
                  <g key={i} transform={`translate(${p[0]},${p[1]})`}>
                    <rect x={-14} y={-25} width={28} height={16} rx={8} fill={hlColor} />
                    <text x={0} y={-13} className="badge">{valsOf(hl)[i]}</text>
                    <circle cx={0} cy={0} r={3} fill="#0f1216" stroke={hlColor} strokeWidth={2.5} />
                  </g>
                ) : (
                  <circle key={i} cx={p[0]} cy={p[1]} r={2.4} fill={hlColor} />
                )
              )}
            </g>
          )}
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
      <p className="muted small">Puntos acumulados por día (desde 0). Toca un nombre para resaltar su evolución.</p>
    </div>
  );
}
