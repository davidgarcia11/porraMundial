// Quick assertions for the scoring engine.
// Run: node scripts/test-engine.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeScores, scoreMatchPrediction, scoreKnockoutPrediction } from '../src/scoring/engine.js';
import { MATCH_POINTS } from '../src/scoring/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const predictions = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../src/data/predictions.json'), 'utf8')
);

let failures = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    failures++;
    console.log(`✗ ${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  } else {
    console.log(`✓ ${label}`);
  }
};

// --- unit: cumulative match scoring ---
const g = MATCH_POINTS.grupos;
eq('exacto grupos', scoreMatchPrediction({ sign: '1', h: 3, a: 0 }, { h: 3, a: 0 }, g).pts, 7);
eq('signo+dif grupos', scoreMatchPrediction({ sign: '1', h: 2, a: 1 }, { h: 1, a: 0 }, g).pts, 4);
eq('solo signo grupos', scoreMatchPrediction({ sign: '1', h: 3, a: 0 }, { h: 1, a: 0 }, g).pts, 3);
eq('fallo signo', scoreMatchPrediction({ sign: '1', h: 3, a: 0 }, { h: 0, a: 1 }, g).pts, 0);
eq('empate exacto', scoreMatchPrediction({ sign: 'X', h: 1, a: 1 }, { h: 1, a: 1 }, g).pts, 7);
eq('empate dif distinto marcador', scoreMatchPrediction({ sign: 'X', h: 2, a: 2 }, { h: 1, a: 1 }, g).pts, 4);

// --- unit: knockout requires both teams; orientation aligned ---
const r32 = MATCH_POINTS.dieciseisavos;
eq(
  'knockout pareja correcta exacto',
  scoreKnockoutPrediction({ home: 'MXC', away: 'CND', sign: '1', h: 2, a: 1 }, { home: 'MXC', away: 'CND', h: 2, a: 1 }, r32).pts,
  14
);
eq(
  'knockout pareja invertida se reorienta',
  scoreKnockoutPrediction({ home: 'CND', away: 'MXC', sign: '2', h: 1, a: 2 }, { home: 'MXC', away: 'CND', h: 2, a: 1 }, r32).pts,
  14
);
eq(
  'knockout equipos erroneos = null',
  scoreKnockoutPrediction({ home: 'MXC', away: 'SZA', sign: '1', h: 2, a: 1 }, { home: 'MXC', away: 'CND', h: 2, a: 1 }, r32),
  null
);

// --- integration: full computeScores ---
const results = {
  groupMatches: {
    'MXC-SDF': { h: 3, a: 0, matchday: 1 }, // BODEGAS predicted 1|3-0 -> exacto 7
  },
  groupStandings: {
    A: ['MXC', 'RPC', 'CDS', 'SDF'], // BODEGAS A: MXC,RPC,CDS,SDF -> 4 x 2 = 8
  },
  qualified: {
    dieciseisavos: ['MXC', 'RPC', 'CDS', 'SDF'], // every code BODEGAS listed that's here x5
  },
  knockoutResults: {},
  honors: { campeon: 'URU' }, // BODEGAS predicted URU -> 1000
};

const out = computeScores(predictions, results);
const bodegas = out.participants[0];
eq('BODEGAS nombre', bodegas.name, 'BODEGAS');
eq('BODEGAS groupMatches', bodegas.breakdown.groupMatches, 7);
eq('BODEGAS groupPositions', bodegas.breakdown.groupPositions, 8);
eq('BODEGAS honor campeon', bodegas.breakdown.honors.campeon, 1000);

// jornada accounting must sum to total
const jSum = Object.values(bodegas.jornada).reduce((a, b) => a + b, 0);
eq('jornada suma = total', jSum, bodegas.total);

// standings sorted desc and ranked
const top = out.finalStandings[0];
console.log('\nLíder de prueba:', top.name, top.points, 'pts');
console.log('Total participantes:', out.participants.length);

if (failures) {
  console.log(`\n❌ ${failures} fallos`);
  process.exitCode = 1;
} else {
  console.log('\n✅ todos los tests del motor pasan');
}
