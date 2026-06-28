import { breakdownTotals } from '../utils.js';

const CATS = [
  { key: 'grupos', label: 'Grupos', color: '#2dd4a7' },
  { key: 'posiciones', label: 'Posiciones', color: '#4f9dff' },
  { key: 'clasificados', label: 'Clasificados', color: '#f5c518' },
  { key: 'eliminatorias', label: 'Eliminatorias', color: '#a78bfa' },
  { key: 'extra', label: 'Extra', color: '#ff6b6b' },
];

// De dónde saca los puntos cada participante: barras apiladas por categoría.
// La barra de cada uno es proporcional a su total respecto al líder, y cada
// tramo de color es proporcional a los puntos de esa categoría.
export default function DesgloseView({ scores, me }) {
  const rows = scores.participants
    .map((p) => ({ name: p.name, total: p.total, ...breakdownTotals(p) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const max = Math.max(1, ...rows.map((r) => r.total));

  return (
    <div className="dsg">
      <p className="muted small">
        De dónde sale cada punto. Cada color es una categoría; la longitud de la barra es
        proporcional al total del líder. Pasa el ratón o toca un tramo para ver sus puntos.
      </p>
      <div className="dsg-legend">
        {CATS.map((c) => (
          <span key={c.key} className="dsg-leg">
            <span className="dsg-dot" style={{ background: c.color }} /> {c.label}
          </span>
        ))}
      </div>
      <div className="dsg-list">
        {rows.map((r, i) => (
          <div key={r.name} className={`dsg-row${me === r.name ? ' me' : ''}`}>
            <span className="dsg-rank">{i + 1}</span>
            <span className="dsg-name" title={r.name}>{r.name}</span>
            <span className="dsg-track" style={{ width: `${(r.total / max) * 100}%` }}>
              {CATS.map((c) => {
                const v = r[c.key];
                if (v <= 0) return null;
                const w = (v / r.total) * 100;
                return (
                  <span
                    key={c.key}
                    className="dsg-seg"
                    style={{ width: `${w}%`, background: c.color }}
                    title={`${c.label}: ${v}`}
                  >
                    {w >= 12 ? v : ''}
                  </span>
                );
              })}
            </span>
            <span className="dsg-total">{r.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
