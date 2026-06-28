// Shared core: downloads Mundial results from football-data.org and translates
// them into the porra's team codes. Pure (no fs / no process), so it can run
// both in the CLI build script and in the Vercel serverless function.
//
// Returns the porra `results` (with `results.tournament` attached for the live
// "Mundial" views: group tables, full fixture list and bracket).
import { TEAMS, teamName } from '../data/teams.js';

const API_BASE = 'https://api.football-data.org/v4';

const STAGE_TO_ROUND = {
  LAST_32: 'dieciseisavos',
  LAST_16: 'octavos',
  QUARTER_FINALS: 'cuartos',
  SEMI_FINALS: 'semifinales',
  THIRD_PLACE: 'tercer_puesto',
  FINAL: 'final',
};
const ROUND_TO_QUALIFIER = {
  dieciseisavos: 'dieciseisavos',
  octavos: 'octavos',
  cuartos: 'cuartos',
  semifinales: 'semifinales',
  final: 'final',
};

const norm = (s) =>
  (s ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const isFinished = (m) => m.status === 'FINISHED';
const ft = (m) => m.score?.fullTime || {};

export function emptyResults(source = 'none') {
  return {
    updatedAt: new Date().toISOString(),
    source,
    groupMatches: {},
    groupStandings: {},
    qualified: { dieciseisavos: [], octavos: [], cuartos: [], semifinales: [], tercer_cuarto: [], final: [] },
    knockoutResults: { dieciseisavos: [], octavos: [], cuartos: [], semifinales: [], tercer_puesto: [], final: [] },
    honors: { campeon: null, subcampeon: null, tercero: null, botaOro: null, botaPlata: null, botaBronce: null, balonOro: null, mejorPortero: null },
  };
}

// Returns { results, unmatched, groupTotal, groupFinished }. Throws on API error.
export async function buildResults({
  token,
  competition = 'WC',
  predictions,
  fetchImpl = globalThis.fetch,
}) {
  if (!token) throw new Error('Falta el token de football-data.org');
  if (!fetchImpl) throw new Error('No hay implementación de fetch disponible');

  const byTla = new Map();
  const byName = new Map();
  for (const [code, t] of Object.entries(TEAMS)) {
    if (t.fifa) byTla.set(t.fifa.toUpperCase(), code);
    byName.set(norm(t.name), code);
    for (const a of t.aliases || []) byName.set(norm(a), code);
    byName.set(norm(code), code);
  }
  const unmatched = new Set();
  const toCode = (team) => {
    if (!team) return null;
    if (team.tla && byTla.has(team.tla.toUpperCase())) return byTla.get(team.tla.toUpperCase());
    const n = norm(team.name) || norm(team.shortName);
    if (byName.has(n)) return byName.get(n);
    if (!team.name && !team.tla) return null; // "por determinar"
    unmatched.add(team.tla ? `${team.name} (${team.tla})` : team.name);
    return null;
  };
  // equipo normalizado para la vista Mundial (code porra o null = por determinar)
  const mapTeam = (team) => {
    const code = toCode(team);
    return { code, name: code ? teamName(code) : team?.name || 'Por determinar' };
  };

  const api = async (endpoint) => {
    const r = await fetchImpl(`${API_BASE}${endpoint}`, { headers: { 'X-Auth-Token': token } });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`${endpoint} -> HTTP ${r.status} ${r.statusText}\n${body.slice(0, 400)}`);
    }
    return r.json();
  };

  const groupIndex = new Map();
  for (const gm of predictions.groupMatches) {
    groupIndex.set([gm.home, gm.away].sort().join('|'), gm);
  }

  const matchesData = await api(`/competitions/${competition}/matches`);
  const matches = matchesData.matches || [];

  const results = emptyResults(`football-data.org:${competition}`);
  const roundTeams = {};
  let groupTotal = 0;
  let groupFinished = 0;
  const grpTotal = {}; // partidos por grupo de la porra
  const grpFinished = {}; // partidos finalizados por grupo
  const groupStats = {}; // estadísticas por grupo para calcular el orden si falla /standings

  // Vista Mundial: todos los partidos normalizados.
  const allMatches = [];

  for (const m of matches) {
    const homeCode = toCode(m.homeTeam);
    const awayCode = toCode(m.awayTeam);

    allMatches.push({
      id: m.id,
      utcDate: m.utcDate || null,
      status: m.status,
      stage: m.stage,
      matchday: m.matchday ?? null,
      group: m.group ?? null,
      home: mapTeam(m.homeTeam),
      away: mapTeam(m.awayTeam),
      score: { home: ft(m).home ?? null, away: ft(m).away ?? null },
      winner: m.score?.winner ?? null,
    });

    if (m.stage === 'GROUP_STAGE') {
      groupTotal++;
      if (isFinished(m)) groupFinished++;
      const gLetter = TEAMS[homeCode]?.group || TEAMS[awayCode]?.group;
      if (gLetter) {
        grpTotal[gLetter] = (grpTotal[gLetter] || 0) + 1;
        if (isFinished(m)) grpFinished[gLetter] = (grpFinished[gLetter] || 0) + 1;
      }
      if (!isFinished(m) || homeCode == null || awayCode == null) continue;
      const f = ft(m);
      // estadísticas del grupo (para calcular el orden si /standings falla)
      if (gLetter && Number.isFinite(f.home) && Number.isFinite(f.away)) {
        const s = (groupStats[gLetter] ||= {});
        const upd = (code, gf, ga) => {
          const t = (s[code] ||= { code, points: 0, gf: 0, ga: 0, gd: 0 });
          t.gf += gf; t.ga += ga; t.gd = t.gf - t.ga;
          if (gf > ga) t.points += 3; else if (gf === ga) t.points += 1;
        };
        upd(homeCode, f.home, f.away);
        upd(awayCode, f.away, f.home);
      }
      const gm = groupIndex.get([homeCode, awayCode].sort().join('|'));
      if (!gm) continue;
      const oriented = gm.home === homeCode ? { h: f.home, a: f.away } : { h: f.away, a: f.home };
      results.groupMatches[gm.id] = { ...oriented, matchday: m.matchday };
      continue;
    }

    const round = STAGE_TO_ROUND[m.stage];
    if (!round) continue;
    if (homeCode) (roundTeams[round] ||= new Set()).add(homeCode);
    if (awayCode) (roundTeams[round] ||= new Set()).add(awayCode);
    if (isFinished(m) && homeCode != null && awayCode != null) {
      const f = ft(m);
      results.knockoutResults[round].push({ home: homeCode, away: awayCode, h: f.home, a: f.away });
      if (m.stage === 'FINAL') {
        const w = m.score?.winner;
        results.honors.campeon = w === 'AWAY_TEAM' ? awayCode : homeCode;
        results.honors.subcampeon = w === 'AWAY_TEAM' ? homeCode : awayCode;
      }
      if (m.stage === 'THIRD_PLACE') {
        const w = m.score?.winner;
        results.honors.tercero = w === 'AWAY_TEAM' ? awayCode : homeCode;
      }
    }
  }

  allMatches.sort((a, b) => (a.utcDate || '').localeCompare(b.utcDate || ''));

  for (const [round, qkey] of Object.entries(ROUND_TO_QUALIFIER)) {
    results.qualified[qkey] = [...(roundTeams[round] || [])];
  }
  results.qualified.tercer_cuarto = [...(roundTeams['tercer_puesto'] || [])];

  // ---- standings: tablas de grupo (siempre, para la vista Mundial) ----
  // La "posición exacta" de la porra se contabiliza GRUPO A GRUPO: en cuanto un
  // grupo termina todos sus partidos, su orden es definitivo y se fija (no
  // depende de que el resto de grupos hayan acabado, así no parpadea).
  const groupComplete = (letter) => grpTotal[letter] > 0 && grpFinished[letter] === grpTotal[letter];
  const tournamentGroups = {};
  const porraStandings = {};
  try {
    const standingsData = await api(`/competitions/${competition}/standings`);
    const porraGroups = {};
    for (const [code, t] of Object.entries(TEAMS)) (porraGroups[t.group] ||= new Set()).add(code);

    for (const s of standingsData.standings || []) {
      if (s.type && s.type !== 'TOTAL') continue;
      const rows = (s.table || []).map((row) => {
        const code = toCode(row.team);
        return {
          position: row.position,
          code,
          name: code ? teamName(code) : row.team?.name || '',
          playedGames: row.playedGames,
          won: row.won,
          draw: row.draw,
          lost: row.lost,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalDifference,
          points: row.points,
        };
      });
      const codes = rows.map((r) => r.code).filter(Boolean);
      if (codes.length < 2) continue;
      let best = null;
      let bestN = 0;
      for (const [letter, set] of Object.entries(porraGroups)) {
        const nn = codes.filter((c) => set.has(c)).length;
        if (nn > bestN) {
          bestN = nn;
          best = letter;
        }
      }
      if (best && bestN >= 2) {
        tournamentGroups[best] = rows;
        porraStandings[best] = codes;
      }
    }
  } catch {
    // standings opcionales; si falla, la vista de grupos quedará vacía
  }
  // orden de cada grupo calculado desde los partidos (respaldo si /standings falla)
  const computedOrder = (letter) =>
    Object.values(groupStats[letter] || {})
      .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.code.localeCompare(b.code))
      .map((t) => t.code);

  // solo cuentan las posiciones de los grupos YA terminados; oficial o calculado
  for (const letter of Object.keys(grpTotal)) {
    if (!groupComplete(letter)) continue;
    const order = porraStandings[letter] || computedOrder(letter);
    if (order.length >= 2) results.groupStandings[letter] = order;
  }

  // ---- goleadores (para la estimación de probabilidad y la vista de goleadores) ----
  let scorers = [];
  try {
    const sc = await api(`/competitions/${competition}/scorers?limit=25`);
    scorers = (sc.scorers || [])
      .map((s) => ({
        name: s.player?.name || s.playerName || '',
        team: s.team ? toCode(s.team) : null,
        goals: s.goals ?? s.numberOfGoals ?? 0,
      }))
      .filter((s) => s.name);
  } catch {
    // endpoint opcional; si no está disponible, sin goleadores
  }

  results.tournament = {
    updatedAt: results.updatedAt,
    matches: allMatches,
    groups: tournamentGroups,
    scorers,
  };

  return { results, unmatched: [...unmatched], groupTotal, groupFinished };
}
