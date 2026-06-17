// Downloads Mundial 2026 results from football-data.org and writes them, already
// translated into the porra's team codes, to public/results.json.
//
// Usage:
//   FOOTBALL_DATA_TOKEN=xxxxx npm run fetch:results
//   node scripts/fetch-results.mjs --token xxxxx [--competition WC] [--soft]
//
// Get a free token at https://www.football-data.org/client/register
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildResults } from '../src/services/fetchResultsCore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const argv = process.argv.slice(2);
const argOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const TOKEN = argOf('--token') || process.env.FOOTBALL_DATA_TOKEN;
const COMPETITION = argOf('--competition') || process.env.FOOTBALL_DATA_COMPETITION || 'WC';
// In --soft mode (used during the Vercel build) any problem is a warning, never
// a build failure: the app keeps the previously committed public/results.json.
const SOFT = argv.includes('--soft');
const DEST = path.join(ROOT, 'public', 'results.json');

// Merge a status message into the existing results.json without losing data,
// so the deployed page can explain why there are no results.
const writeSoftStatus = (message) => {
  let base = {};
  try {
    base = JSON.parse(fs.readFileSync(DEST, 'utf8'));
  } catch {
    base = {};
  }
  base.updatedAt = new Date().toISOString();
  base.source = message;
  fs.writeFileSync(DEST, JSON.stringify(base, null, 2));
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

async function main() {
  const predictions = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/predictions.json'), 'utf8'));
  console.log(`Descargando ${COMPETITION} de football-data.org ...`);
  const { results, unmatched, groupTotal, groupFinished } = await buildResults({
    token: TOKEN,
    competition: COMPETITION,
    predictions,
  });

  fs.writeFileSync(DEST, JSON.stringify(results, null, 2));
  console.log(`Escrito ${path.relative(ROOT, DEST)}`);
  console.log(`  partidos de grupo con resultado: ${Object.keys(results.groupMatches).length}`);
  if (groupTotal && groupFinished < groupTotal) {
    console.log(`  fase de grupos en curso (${groupFinished}/${groupTotal}); clasificación de grupos aún no contabilizada`);
  } else {
    console.log(`  grupos con clasificación: ${Object.keys(results.groupStandings).length}`);
  }
  for (const [r, arr] of Object.entries(results.knockoutResults)) {
    if (arr.length) console.log(`  ${r}: ${arr.length} partidos`);
  }
  if (unmatched.length) {
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
