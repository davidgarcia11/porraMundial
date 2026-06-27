// Derivaciones sobre las tablas de grupo (tournament.groups) para las vistas
// del Mundial: ranking de mejores terceros y clasificados provisionales.

// Ordena los terceros de cada grupo por criterios FIFA (puntos, diferencia de
// goles, goles a favor). Devuelve los 12 terceros ordenados.
export function rankThirds(groups) {
  const letters = Object.keys(groups || {}).sort();
  const thirds = [];
  for (const g of letters) {
    const r = (groups[g] || []).find((x) => x.position === 3) || groups[g]?.[2];
    if (r) thirds.push({ group: g, ...r });
  }
  thirds.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      (a.name || '').localeCompare(b.name || '')
  );
  return thirds;
}

// Estructura oficial de los dieciseisavos (WC 2026): cada cruce por posición de
// grupo. "3:XYZ" = un tercero procedente de uno de esos grupos.
const R32_SLOTS = [
  ['2A', '2B'], ['1C', '2F'], ['1E', '3:ABCDF'], ['1F', '2C'],
  ['2E', '2I'], ['1I', '3:CDFGH'], ['1A', '3:CEFHI'], ['1L', '3:EHIJK'],
  ['1G', '3:AEHIJ'], ['1D', '3:BEFIJ'], ['1H', '2J'], ['2K', '2L'],
  ['1B', '3:EFGIJ'], ['2D', '2G'], ['1J', '2H'], ['1K', '3:DEIJL'],
];

const posCode = (groups, pos, letter) => {
  const rows = groups[letter] || [];
  const r = rows.find((x) => x.position === pos) || rows[pos - 1];
  return r?.code ?? null;
};

// Cruces PROVISIONALES de dieciseisavos según la clasificación actual.
// Los 8 mejores terceros se asignan a sus huecos con un emparejamiento bipartito
// válido (cada hueco solo admite terceros de ciertos grupos). Puede no coincidir
// al 100% con la asignación oficial de la FIFA, pero es un cruce válido.
export function provisionalR32(groups) {
  if (!Object.keys(groups || {}).length) return null; // sin grupos no se puede
  const thirds = rankThirds(groups).slice(0, 8);
  const thirdCodeByGroup = {};
  thirds.forEach((t) => (thirdCodeByGroup[t.group] = t.code));

  // huecos de tercero (con grupos permitidos) en orden de aparición
  const thirdSlots = [];
  R32_SLOTS.forEach((slot, idx) =>
    slot.forEach((side, sidx) => {
      if (side.startsWith('3:')) thirdSlots.push({ idx, sidx, allowed: new Set(side.slice(2).split('')) });
    })
  );

  // emparejamiento bipartito (Kuhn): grupo del tercero -> hueco
  const groupForSlot = new Array(thirdSlots.length).fill(null);
  const tryAssign = (g, seen) => {
    for (let si = 0; si < thirdSlots.length; si++) {
      if (thirdSlots[si].allowed.has(g) && !seen.has(si)) {
        seen.add(si);
        if (groupForSlot[si] === null || tryAssign(groupForSlot[si], seen)) {
          groupForSlot[si] = g;
          return true;
        }
      }
    }
    return false;
  };
  for (const t of thirds) tryAssign(t.group, new Set());
  const thirdAssign = {};
  thirdSlots.forEach((s, i) => {
    if (groupForSlot[i]) thirdAssign[`${s.idx}.${s.sidx}`] = groupForSlot[i];
  });

  const resolveSide = (side, idx, sidx) => {
    if (side.startsWith('3:')) {
      const g = thirdAssign[`${idx}.${sidx}`];
      const cands = side.slice(2).split('').join('/');
      return { code: g ? thirdCodeByGroup[g] : null, label: g ? `3º ${g}` : `3º (${cands})` };
    }
    const pos = Number(side[0]);
    const letter = side[1];
    return { code: posCode(groups, pos, letter), label: `${pos}º ${letter}` };
  };

  return R32_SLOTS.map((slot, idx) => ({
    a: resolveSide(slot[0], idx, 0),
    b: resolveSide(slot[1], idx, 1),
  }));
}

// Quién pasaría AHORA a dieciseisavos: 1º y 2º de cada grupo + 8 mejores terceros.
export function provisionalQualifiers(groups) {
  const letters = Object.keys(groups || {}).sort();
  const firsts = [];
  const seconds = [];
  for (const g of letters) {
    const rows = groups[g] || [];
    const r1 = rows.find((x) => x.position === 1) || rows[0];
    const r2 = rows.find((x) => x.position === 2) || rows[1];
    if (r1) firsts.push({ group: g, ...r1 });
    if (r2) seconds.push({ group: g, ...r2 });
  }
  const thirds = rankThirds(groups).slice(0, 8);
  return { firsts, seconds, thirds };
}
