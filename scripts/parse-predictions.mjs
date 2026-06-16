// Parses the layout-preserved text extracted from Registro_apuestas.pdf
// into a structured predictions JSON consumed by the app.
//
//   pdftotext -layout Registro_apuestas.pdf -> data-source/apuestas_raw.txt
//
// Run: node scripts/parse-predictions.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'data-source', 'apuestas_raw.txt');

// Column order of participants (left -> right in the PDF).
const PARTICIPANTS = [
  'BODEGAS',
  'SERGIO MUÑOZ',
  'DAVID GARCIA SESMA',
  'GATO',
  'IOSU ARANA',
  'JAVIER GOMEZ',
  'JON ANZOLA GARCIA',
  'JORGE MORACHO',
  'MIGUEL ANGEL MORENO NAVASQUEZ',
  'PANCHI',
  'POLITO',
  'PIMIENTO',
  'LIBOREO',
];
const N = PARTICIPANTS.length; // 13

const SECTION_HEADERS = {
  'POSICIÓN GRUPOS': 'POSICION_GRUPOS',
  'CLASIFICADOS PARA DIECISEISAVOS': 'CLAS_DIECISEISAVOS',
  'ENFRENTAMIENTOS DIECISEISAVOS': 'ENF_DIECISEISAVOS',
  'CLASIFICADOS PARA OCTAVOS': 'CLAS_OCTAVOS',
  'ENFRENTAMIENTOS OCTAVOS': 'ENF_OCTAVOS',
  'CLASIFICADOS PARA CUARTOS': 'CLAS_CUARTOS',
  'ENFRENTAMIENTOS CUARTOS': 'ENF_CUARTOS',
  'CLASIFICADOS PARA SEMIFINALES': 'CLAS_SEMIS',
  'ENFRENTAMIENTOS SEMIFINALES': 'ENF_SEMIS',
  'CLASIFICADOS PARA EL 3º y 4º PUESTO': 'CLAS_TERCER_CUARTO',
  'CLASIFICADOS PARA LA FINAL': 'CLAS_FINAL',
  '3º-4º PUESTO': 'ENF_TERCER_PUESTO',
  'ENFRENTAMIENTO FINAL': 'ENF_FINAL',
  'CUADRO DE HONOR': 'CUADRO_DE_HONOR',
};

const isHeaderRow = (l) =>
  /\bApuesta\b/.test(l) && /BODEGAS/.test(l);
const isContinuationNoise = (l) => {
  const t = l.trim();
  return t === 'MIGUEL ANGEL' || t === 'NAVASQUEZ' || t === '';
};

const PRED_RE = /^([1X2])\|(\d+)-(\d+)$/;
const parseScorePred = (tok) => {
  const m = tok.match(PRED_RE);
  if (!m) return null;
  return { sign: m[1], h: Number(m[2]), a: Number(m[3]) };
};

// "RPC-BYH·X|1-1" -> { home, away, sign, h, a }
const parseKnockoutCell = (cell) => {
  const [matchup, pred] = cell.split('·');
  if (!matchup || !pred) return { raw: cell, home: null, away: null, sign: null, h: null, a: null };
  const dash = matchup.indexOf('-');
  const home = matchup.slice(0, dash);
  const away = matchup.slice(dash + 1);
  const p = parseScorePred(pred);
  return { home, away, sign: p?.sign ?? null, h: p?.h ?? null, a: p?.a ?? null };
};

const lines = fs.readFileSync(SRC, 'utf8').split('\n');

const out = {
  participants: PARTICIPANTS,
  groupMatches: [],
  groupPositions: {}, // group -> [{pos, preds:[code...]}]
  qualifiers: {},     // round -> [{pos, preds:[code...]}]
  knockoutMatches: {},// round -> [{slot, preds:[{home,away,sign,h,a}...]}]
  honors: {},
};

let section = 'GROUP_MATCHES';
let cuadroAnchors = null;

const sliceByAnchors = (line, anchors) => {
  const vals = [];
  for (let i = 0; i < anchors.length; i++) {
    const start = anchors[i];
    const end = i + 1 < anchors.length ? anchors[i + 1] : line.length;
    vals.push(line.slice(start, end).trim());
  }
  return vals;
};

const QUAL_ROUND = {
  CLAS_DIECISEISAVOS: 'dieciseisavos',
  CLAS_OCTAVOS: 'octavos',
  CLAS_CUARTOS: 'cuartos',
  CLAS_SEMIS: 'semifinales',
  CLAS_TERCER_CUARTO: 'tercer_cuarto',
  CLAS_FINAL: 'final',
};
const ENF_ROUND = {
  ENF_DIECISEISAVOS: 'dieciseisavos',
  ENF_OCTAVOS: 'octavos',
  ENF_CUARTOS: 'cuartos',
  ENF_SEMIS: 'semifinales',
  ENF_TERCER_PUESTO: 'tercer_puesto',
  ENF_FINAL: 'final',
};
for (const r of Object.values(QUAL_ROUND)) out.qualifiers[r] = [];
for (const r of Object.values(ENF_ROUND)) out.knockoutMatches[r] = [];

const HONOR_LABELS = [
  ['Campeón', 'campeon', 'code'],
  ['Subcampeón', 'subcampeon', 'code'],
  ['3º puesto', 'tercero', 'code'],
  ['Bota de Oro', 'botaOro', 'name'],
  ['Bota de Plata', 'botaPlata', 'name'],
  ['Bota de Bronce', 'botaBronce', 'name'],
  ['Balón de Oro', 'balonOro', 'name'],
  ['Mejor portero', 'mejorPortero', 'name'],
];

for (let i = 0; i < lines.length; i++) {
  const raw = lines[i];
  const trimmed = raw.trim();
  if (isContinuationNoise(raw) || isHeaderRow(raw)) continue;

  if (SECTION_HEADERS[trimmed]) {
    section = SECTION_HEADERS[trimmed];
    continue;
  }

  if (section === 'GROUP_MATCHES') {
    const toks = trimmed.split(/\s+/);
    if (toks.length < N + 1) continue;
    const id = toks[0];
    if (!/-/.test(id)) continue;
    const preds = toks.slice(1, 1 + N).map(parseScorePred);
    if (preds.some((p) => p === null)) continue;
    const dash = id.indexOf('-');
    out.groupMatches.push({
      id,
      home: id.slice(0, dash),
      away: id.slice(dash + 1),
      preds,
    });
    continue;
  }

  if (section === 'POSICION_GRUPOS') {
    // "1º GRUPO A   MXC MXC ..."
    const m = trimmed.match(/^(\d)º\s+GRUPO\s+([A-L])\s+(.*)$/);
    if (!m) continue;
    const pos = Number(m[1]);
    const group = m[2];
    const codes = m[3].split(/\s+/).slice(0, N);
    (out.groupPositions[group] ||= []).push({ pos, preds: codes });
    continue;
  }

  if (QUAL_ROUND[section]) {
    const m = trimmed.match(/^Pos\.-(\d+)\s+(.*)$/);
    if (!m) continue;
    const pos = Number(m[1]);
    const codes = m[2].split(/\s+/).slice(0, N);
    out.qualifiers[QUAL_ROUND[section]].push({ pos, preds: codes });
    continue;
  }

  if (ENF_ROUND[section]) {
    const toks = trimmed.split(/\s+/);
    if (toks.length < N + 1) continue;
    const slot = toks[0];
    const cells = toks.slice(1, 1 + N).map(parseKnockoutCell);
    out.knockoutMatches[ENF_ROUND[section]].push({ slot, preds: cells });
    continue;
  }

  if (section === 'CUADRO_DE_HONOR') {
    const label = HONOR_LABELS.find(([txt]) => trimmed.startsWith(txt) || trimmed.startsWith('🥇' + txt) || trimmed.startsWith('🥈' + txt) || trimmed.startsWith('🥉' + txt));
    if (!label) continue;
    const [, key, kind] = label;
    if (kind === 'code') {
      // Clean single-token codes -> whitespace split. Strip leading emoji+label.
      const after = trimmed.replace(/^[^A-Z]*?(Campeón|Subcampeón|3º puesto)\s+/, '');
      const codes = after.split(/\s+/).slice(0, N);
      out.honors[key] = codes;
      // First clean code row -> capture column anchors for the name rows.
      if (key === 'campeon' && !cuadroAnchors) {
        // The medal emoji is 2 UTF-16 units but occupies 1 visual column, which
        // shifts every later index by 1 vs the (emoji-less) award rows. Collapse
        // each emoji to a single space so anchors line up with the name rows.
        const norm = raw.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ');
        const anchors = [];
        const re = /\S+/g;
        let mm;
        const found = [];
        while ((mm = re.exec(norm)) !== null) found.push(mm.index);
        // found[0] = label token; next N are the codes.
        for (let k = 1; k <= N && k < found.length; k++) anchors.push(found[k]);
        cuadroAnchors = anchors;
      }
    } else {
      // Player names contain spaces -> slice by column anchors from the Campeón row.
      if (cuadroAnchors && cuadroAnchors.length === N) {
        out.honors[key] = sliceByAnchors(raw, cuadroAnchors).map((s) => s.trim());
      } else {
        out.honors[key] = [trimmed]; // fallback raw
      }
    }
    continue;
  }
}

// ---- sanity checks ----
const problems = [];
if (out.groupMatches.length !== 72) problems.push(`groupMatches=${out.groupMatches.length} (expected 72)`);
const groups = Object.keys(out.groupPositions).sort();
if (groups.length !== 12) problems.push(`groups=${groups.length} (expected 12)`);
for (const g of groups) if (out.groupPositions[g].length !== 4) problems.push(`group ${g} positions=${out.groupPositions[g].length}`);
const expectQual = { dieciseisavos: 32, octavos: 16, cuartos: 8, semifinales: 4, tercer_cuarto: 2, final: 2 };
for (const [r, n] of Object.entries(expectQual)) if (out.qualifiers[r].length !== n) problems.push(`qualifiers.${r}=${out.qualifiers[r].length} (expected ${n})`);
const expectEnf = { dieciseisavos: 16, octavos: 8, cuartos: 4, semifinales: 2, tercer_puesto: 1, final: 1 };
for (const [r, n] of Object.entries(expectEnf)) if (out.knockoutMatches[r].length !== n) problems.push(`knockoutMatches.${r}=${out.knockoutMatches[r].length} (expected ${n})`);
for (const [, key] of HONOR_LABELS.map((x) => [x[0], x[1]])) {
  if (!out.honors[key] || out.honors[key].length !== N) problems.push(`honors.${key} length=${out.honors[key]?.length}`);
}

const dest = path.join(ROOT, 'src', 'data', 'predictions.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2));

console.log('Wrote', path.relative(ROOT, dest));
console.log('groupMatches:', out.groupMatches.length);
console.log('groups:', groups.join(','));
console.log('qualifiers:', Object.fromEntries(Object.entries(out.qualifiers).map(([k, v]) => [k, v.length])));
console.log('knockoutMatches:', Object.fromEntries(Object.entries(out.knockoutMatches).map(([k, v]) => [k, v.length])));
console.log('honors keys:', Object.keys(out.honors).join(','));
if (problems.length) {
  console.log('\n⚠️  PROBLEMS:');
  for (const p of problems) console.log('  -', p);
  process.exitCode = 1;
} else {
  console.log('\n✅ all structural checks passed');
}
