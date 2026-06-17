// Shared core: downloads Mundial results from football-data.org and translates
// them into the porra's team codes. Pure (no fs / no process), so it can run
// both in the CLI build script and in the Vercel serverless function.
import { TEAMS } from '../data/teams.js';

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

  for (const m of matches) {
    const homeCode = toCode(m.homeTeam);
    const awayCode = toCode(m.awayTeam);

    if (m.stage === 'GROUP_STAGE') {
      groupTotal++;
      if (isFinished(m)) groupFinished++;
      if (!isFinished(m) || homeCode == null || awayCode == null) continue;
      const f = ft(m);
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

  for (const [round, qkey] of Object.entries(ROUND_TO_QUALIFIER)) {
    results.qualified[qkey] = [...(roundTeams[round] || [])];
  }
  results.qualified.tercer_cuarto = [...(roundTeams['tercer_puesto'] || [])];

  // Group final positions only once the whole group stage is finished.
  const groupStageComplete = groupTotal > 0 && groupFinished === groupTotal;
  if (groupStageComplete) {
    try {
      const standingsData = await api(`/competitions/${competition}/standings`);
      const porraGroups = {};
      for (const [code, t] of Object.entries(TEAMS)) {
        (porraGroups[t.group] ||= new Set()).add(code);
      }
      for (const s of standingsData.standings || []) {
        if (s.type && s.type !== 'TOTAL') continue;
        const codes = (s.table || []).map((row) => toCode(row.team)).filter(Boolean);
        if (codes.length < 2) continue;
        let best = null;
        let bestN = 0;
        for (const [letter, set] of Object.entries(porraGroups)) {
          const n = codes.filter((c) => set.has(c)).length;
          if (n > bestN) {
            bestN = n;
            best = letter;
          }
        }
        if (best && bestN >= 2) results.groupStandings[best] = codes;
      }
    } catch {
      // standings are optional; ignore
    }
  }

  return { results, unmatched: [...unmatched], groupTotal, groupFinished };
}
