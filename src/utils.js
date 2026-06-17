export const sum = (obj) => Object.values(obj || {}).reduce((a, b) => a + (b || 0), 0);

export const breakdownTotals = (p) => ({
  grupos: p.breakdown.groupMatches,
  posiciones: p.breakdown.groupPositions,
  clasificados: sum(p.breakdown.qualifiers),
  eliminatorias: sum(p.breakdown.knockoutMatches),
  extra: sum(p.breakdown.honors),
});

export const signLabel = (s) => (s === '1' ? '1' : s === '2' ? '2' : 'X');

export const fmtPred = (p) => (p && p.h != null ? `${p.h}-${p.a}` : '—');

// short display name for tight columns
export const shortName = (name) => {
  const parts = name.split(' ');
  if (parts.length === 1) return name;
  return parts[0];
};

// Paleta de 13 colores distinguibles para el gráfico de evolución.
export const PALETTE = [
  '#2dd4a7', '#4f9dff', '#f5c518', '#ff6b6b', '#a78bfa', '#f59e0b', '#34d399',
  '#f472b6', '#60a5fa', '#fb923c', '#22d3ee', '#c084fc', '#facc15',
];
