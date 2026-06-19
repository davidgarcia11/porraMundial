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
