// Fetches Mundial 2026 results from football-data.org and writes them, already
// translated into the porra's team codes, to public/results.json.
//
// Usage:
//   FOOTBALL_DATA_TOKEN=xxxxx npm run fetch:results
//   node scripts/fetch-results.mjs --token xxxxx [--competition WC]
//
// Get a free token at https://www.football-data.org/client/register
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEAMS } from '../src/data/teams.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const TOKEN = argOf('--token') || process.env.FOOTBALL_DATA_TOKEN;
const COMPETITION = argOf('--competition') || process.env.FOOTBALL_DATA_COMPETITION || 'WC';
const BASE = 'https://api.football-data.org/v4';
// In --soft mode (used during the Vercel build) any problem is a warning, never
// a build failure: the app keeps the previously committed public/results.json.
const SOFT = argv.includes('--soft');

// Merge a status message into the existing results.json without losing data,
// so the deployed page can explain why there are no results.
const writeSoftStatus = (message) => {
  const dest = path.join(ROOT, 'public', 'results.json');
  let base = {};
  try {
    base = JSON.parse(fs.readFileSync(dest, 'utf8'));
  } catch {
    base = {};
  }
  base.updatedAt = new Date().toISOString();
  base.source = message;
  fs.writeFileSync(dest, JSON.stringify(base, null, 2));
};

if (!TOKEN) {
  const msg = 'Falta el token (FOOTBALL_DATA_TOKEN=... o --token ...). Regístrate en https://www.football-data.org/client/register';
  if (SOFT) {
    console.warn('⚠️ ', msg, '\n   Se mantiene public/results.json existente.');
    writeSoftStatus('error: falta FOOTBALL_DATA_TOKEN en el build');
    process.exit(0);
  }
  console.error(msg);
  process.exit(1);
}

// ---- team matching (API team -> porra code) ----
const norm = (s) =>
  (s ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

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
  unmatched.add(team.tla ? `${team.name} (${team.tla})` : team.name);
  return null;
};

const api = async (endpoint) => {
  const r = await fetch(`${BASE}${endpoint}`, { headers: { 'X-Auth-Token': TOKEN } });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`${endpoint} -> HTTP ${r.status} ${r.statusText}\n${body.slice(0, 400)}`);
  }
  return r.json();
};

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

const isFinished = (m) => m.status === 'FINISHED';
const ft = (m) => m.score?.fullTime || {};

async function main() {
  const predictions = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/predictions.json'), 'utf8'));
  // canonical group match orientation lookup: "pairKey" -> {id, home, away}
  const groupIndex = new Map();
  for (const gm of predictions.groupMatches) {
    groupIndex.set([gm.home, gm.away].sort().join('|'), gm);
  }

  console.log(`Descargando ${COMPETITION} de football-data.org ...`);
  const matchesData = await api(`/competitions/${COMPETITION}/matches`);
  const matches = matchesData.matches || [];
  console.log(`  ${matches.length} partidos recibidos`);

  const results = {
    updatedAt: new Date().toISOString(),
    source: `football-data.org:${COMPETITION}`,
    groupMatches: {},
    groupStandings: {},
    qualified: { dieciseisavos: [], octavos: [], cuartos: [], semifinales: [], tercer_cuarto: [], final: [] },
    knockoutResults: { dieciseisavos: [], octavos: [], cuartos: [], semifinales: [], tercer_puesto: [], final: [] },
    honors: { campeon: null, subcampeon: null, tercero: null, botaOro: null, botaPlata: null, botaBronce: null, balonOro: null, mejorPortero: null },
  };

  const roundTeams = {}; // round -> Set of codes appearing in that round

  for (const m of matches) {
    const homeCode = toCode(m.homeTeam);
    const awayCode = toCode(m.awayTeam);

    if (m.stage === 'GROUP_STAGE') {
      if (!isFinished(m) || homeCode == null || awayCode == null) continue;
      const f = ft(m);
      const gm = groupIndex.get([homeCode, awayCode].sort().join('|'));
      if (!gm) continue; // pair not in porra (mapping issue)
      // orient to porra's home/away
      const oriented =
        gm.home === homeCode ? { h: f.home, a: f.away } : { h: f.away, a: f.home };
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

  // qualified sets from the teams that appear in each round
  for (const [round, qkey] of Object.entries(ROUND_TO_QUALIFIER)) {
    results.qualified[qkey] = [...(roundTeams[round] || [])];
  }
  // "clasificado para 3º y 4º puesto" = the two teams in the third-place match
  results.qualified.tercer_cuarto = [...(roundTeams['tercer_puesto'] || [])];

  // ---- standings (group final positions) ----
  try {
    const standingsData = await api(`/competitions/${COMPETITION}/standings`);
    const porraGroups = {}; // letter -> Set(codes)
    for (const [, t] of Object.entries(TEAMS)) (porraGroups[t.group] ||= new Set());
    for (const [code, t] of Object.entries(TEAMS)) porraGroups[t.group].add(code);

    for (const s of standingsData.standings || []) {
      if (s.type && s.type !== 'TOTAL') continue;
      const table = s.table || [];
      const codes = table.map((row) => toCode(row.team)).filter(Boolean);
      if (codes.length < 2) continue;
      // match this API group to the porra group sharing the most teams
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
  } catch (e) {
    console.warn('  (sin standings:', e.message.split('\n')[0], ')');
  }

  const dest = path.join(ROOT, 'public', 'results.json');
  fs.writeFileSync(dest, JSON.stringify(results, null, 2));
  console.log(`\nEscrito ${path.relative(ROOT, dest)}`);
  console.log(`  partidos de grupo con resultado: ${Object.keys(results.groupMatches).length}`);
  console.log(`  grupos con clasificación: ${Object.keys(results.groupStandings).length}`);
  for (const [r, arr] of Object.entries(results.knockoutResults)) {
    if (arr.length) console.log(`  ${r}: ${arr.length} partidos`);
  }
  if (unmatched.size) {
    console.log('\n⚠️  Equipos de la API sin mapear (revisa src/data/teams.js):');
    for (const u of unmatched) console.log('   -', u);
  }
}

main().catch((e) => {
  console.error('\n❌ Error:', e.message);
  console.error('\nSi es 403/404: el plan gratuito quizá no cubre esta competición,');
  console.error('o el código de competición no es', COMPETITION, '— prueba con --competition.');
  if (SOFT) {
    console.warn('   (modo --soft: se mantiene public/results.json y el build continúa)');
    writeSoftStatus(`error API (${COMPETITION}): ${e.message.split('\n')[0]}`);
    process.exit(0);
  }
  process.exit(1);
});
