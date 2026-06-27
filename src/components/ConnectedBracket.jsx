import Team from './Team.jsx';

// Cuadro visual con conectores. `rounds` es un array de columnas (de izquierda a
// derecha); cada columna es un array de cruces en orden de árbol, de forma que
// los cruces 2k y 2k+1 alimentan al cruce k de la siguiente ronda. Un cruce es
// { a:{code,label}, b:{code,label} } o null (por determinar).
const LABELS = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinales', 'Final'];

const ROW_H = 56;
const BOX_W = 156;
const BOX_H = 46;
const COL_GAP = 44;
const COL_W = BOX_W + COL_GAP;

function Side({ side }) {
  if (!side) return <div className="cb-side"><span className="cb-cand">Por determinar</span></div>;
  if (side.code) {
    return (
      <div className={`cb-side${side.win ? ' win' : ''}`}>
        <Team code={side.code} />
        {side.label && <span className="cb-pos">{side.label}</span>}
        {side.score != null && <span className="cb-score">{side.score}</span>}
      </div>
    );
  }
  // sin equipo aún: muestra qué lo alimenta (1º A, 3º (A/B/C/D/F)…)
  return <div className="cb-side"><span className="cb-cand">{side.label || 'Por determinar'}</span></div>;
}

export default function ConnectedBracket({ rounds }) {
  const nLeaves = rounds[0].length;
  const height = nLeaves * ROW_H;
  const width = rounds.length * COL_W - COL_GAP + 4;

  const centerY = (r, k) => {
    const span = 2 ** r;
    return (k * span + span / 2) * ROW_H;
  };

  const paths = [];
  for (let r = 0; r < rounds.length - 1; r++) {
    for (let k = 0; k < rounds[r].length; k++) {
      const x1 = r * COL_W + BOX_W;
      const y1 = centerY(r, k);
      const x2 = (r + 1) * COL_W;
      const y2 = centerY(r + 1, Math.floor(k / 2));
      const midX = x1 + COL_GAP / 2;
      paths.push(`M${x1},${y1} H${midX} V${y2} H${x2}`);
    }
  }

  return (
    <div className="cbracket-wrap">
      <div className="cbracket-head" style={{ width }}>
        {rounds.map((_, r) => (
          <div key={r} className="cbracket-h" style={{ width: BOX_W, marginRight: r < rounds.length - 1 ? COL_GAP : 0 }}>
            {LABELS[r] || ''}
          </div>
        ))}
      </div>
      <div className="cbracket" style={{ width, height }}>
        <svg className="cbracket-lines" width={width} height={height}>
          {paths.map((d, i) => (
            <path key={i} className="cline" d={d} />
          ))}
        </svg>
        {rounds.map((ms, r) =>
          ms.map((m, k) => (
            <div
              key={`${r}-${k}`}
              className="cmatch"
              style={{ left: r * COL_W, top: centerY(r, k) - BOX_H / 2, width: BOX_W, height: BOX_H }}
            >
              <Side side={m?.a} />
              <Side side={m?.b} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
