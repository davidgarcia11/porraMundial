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

// Orden de árbol de los 16 dieciseisavos (posición de arriba a abajo -> índice de R32_SLOTS).
const LEAF_ORDER = [0, 2, 1, 4, 10, 11, 8, 9, 3, 5, 6, 7, 13, 15, 12, 14];
const STAGE = { LAST_32: 'LAST_32', LAST_16: 'LAST_16', QUARTER_FINALS: 'QUARTER_FINALS', SEMI_FINALS: 'SEMI_FINALS', FINAL: 'FINAL' };

// Construye las 5 rondas del cuadro (en orden de árbol) combinando el cuadro
// provisional (según clasificación de grupos) con los cruces REALES de la API,
// colocando cada partido real en su posición correcta. Devuelve arrays con
// { a:{code,label,score,win}, b:{...} } o null.
export function buildBracketRounds(tournament) {
  const groups = tournament?.groups || {};
  const matches = tournament?.matches || [];
  const stage = (st) => matches.filter((m) => m.stage === st && m.home?.code && m.away?.code);
  const sideOf = (m, home) => ({
    code: home ? m.home.code : m.away.code,
    score: (home ? m.score?.home : m.score?.away) ?? null,
    win: m.winner === (home ? 'HOME_TEAM' : 'AWAY_TEAM'),
  });

  const prov = provisionalR32(groups); // por índice de slot, o null
  // Dieciseisavos en orden de árbol (provisional)
  let r32 = LEAF_ORDER.map((slotIdx) => {
    const m = prov ? prov[slotIdx] : null;
    return m ? { a: { code: m.a.code, label: m.a.label }, b: { code: m.b.code, label: m.b.label } } : null;
  });

  // semillas fijas (1º/2º, exactas al cerrar grupos) -> posición en el árbol
  const seedToPos = {};
  r32.forEach((m, p) => {
    if (!m) return;
    for (const s of [m.a, m.b]) if (s.code && /^[12]º/.test(s.label || '')) seedToPos[s.code] = p;
  });

  const realR32 = stage(STAGE.LAST_32);
  if (realR32.length) {
    if (!prov) r32 = Array(16).fill(null);
    realR32.forEach((rm, i) => {
      let p = seedToPos[rm.home.code];
      if (p == null) p = seedToPos[rm.away.code];
      if (p == null) p = prov ? null : i; // sin grupos: orden de la API
      if (p == null) return;
      r32[p] = { a: sideOf(rm, true), b: sideOf(rm, false) };
    });
  }

  const posOf = (arr, code) => {
    for (let i = 0; i < arr.length; i++) {
      const m = arr[i];
      if (m && ((m.a && m.a.code === code) || (m.b && m.b.code === code))) return i;
    }
    return null;
  };
  const placeRound = (prev, st, size) => {
    const arr = Array(size).fill(null);
    for (const rm of stage(st)) {
      const pa = posOf(prev, rm.home.code);
      const pb = posOf(prev, rm.away.code);
      const q = pa != null ? Math.floor(pa / 2) : pb != null ? Math.floor(pb / 2) : null;
      if (q != null && q < size) arr[q] = { a: sideOf(rm, true), b: sideOf(rm, false) };
    }
    return arr;
  };
  const r16 = placeRound(r32, STAGE.LAST_16, 8);
  const qf = placeRound(r16, STAGE.QUARTER_FINALS, 4);
  const sf = placeRound(qf, STAGE.SEMI_FINALS, 2);
  const fin = placeRound(sf, STAGE.FINAL, 1);
  return [r32, r16, qf, sf, fin];
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
