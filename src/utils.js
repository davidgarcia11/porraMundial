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

export const medal = (rank) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '');

// short display name for tight columns
export const shortName = (name) => {
  const parts = name.split(' ');
  if (parts.length === 1) return name;
  return parts[0];
};
