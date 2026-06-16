// Scoring engine for the Mundial 2026 porra.
//
// Works entirely in the porra's own team codes. The results object must already
// be translated into those codes (see scripts/fetch-results.mjs).

import {
  MATCH_POINTS,
  POSITION_POINTS,
  QUALIFIER_POINTS,
  HONOR_POINTS,
  JORNADAS,
  QUALIFIER_JORNADA,
  KNOCKOUT_JORNADA,
  GROUP_BONUS_JORNADA,
  HONORS_JORNADA,
} from './config.js';

export const sign = (h, a) => (h > a ? '1' : h < a ? '2' : 'X');

const hasResult = (m) =>
  m && Number.isFinite(m.h) && Number.isFinite(m.a);

// Cumulative match scoring (signo + diferencia + exacto).
export function scoreMatchPrediction(pred, actual, tbl) {
  const d = { signo: 0, diferencia: 0, exacto: 0, pts: 0 };
  if (!pred || !hasResult(actual)) return d;
  if (pred.sign === sign(actual.h, actual.a)) d.signo = tbl.signo;
  if (d.signo && pred.h - pred.a === actual.h - actual.a) d.diferencia = tbl.diferencia;
  if (pred.h === actual.h && pred.a === actual.a) d.exacto = tbl.exacto;
  d.pts = d.signo + d.diferencia + d.exacto;
  return d;
}

const samePair = (a, b) =>
  (a.home === b.home && a.away === b.away) ||
  (a.home === b.away && a.away === b.home);

// Orient a prediction to the actual fixture's home/away and score it.
// Returns null if the predicted pair does not match the actual pair (rule:
// you must get BOTH teams right to score in knockouts).
export function scoreKnockoutPrediction(pred, actual, tbl) {
  if (!pred || !pred.home || !actual || !actual.home) return null;
  if (!samePair(pred, actual)) return null;
  let p = pred;
  if (pred.home !== actual.home) {
    // swap orientation (flip score and sign)
    const flipped = pred.sign === '1' ? '2' : pred.sign === '2' ? '1' : 'X';
    p = { home: pred.away, away: pred.home, h: pred.a, a: pred.h, sign: flipped };
  }
  if (!hasResult(actual)) return { signo: 0, diferencia: 0, exacto: 0, pts: 0 };
  return scoreMatchPrediction(p, actual, tbl);
}

const norm = (s) =>
  (s ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const groupMatchday = (idx) => Math.floor(idx / 24) + 1; // 24 matches per matchday

function emptyJornadaMap() {
  const m = {};
  for (const j of JORNADAS) m[j.key] = 0;
  return m;
}

export function computeScores(predictions, results = {}) {
  const {
    groupMatches = [],
    groupPositions = {},
    qualifiers = {},
    knockoutMatches = {},
    honors = {},
    participants = [],
  } = predictions;

  const res = {
    groupMatches: results.groupMatches || {},
    groupStandings: results.groupStandings || {},
    qualified: results.qualified || {},
    knockoutResults: results.knockoutResults || {},
    honors: results.honors || {},
  };

  const people = participants.map((name) => ({
    name,
    total: 0,
    jornada: emptyJornadaMap(),
    breakdown: {
      groupMatches: 0,
      groupPositions: 0,
      qualifiers: {},
      knockoutMatches: {},
      honors: {},
    },
  }));

  const add = (person, jornadaKey, pts, bucket) => {
    person.total += pts;
    person.jornada[jornadaKey] += pts;
    if (bucket) bucket(pts);
  };

  // ---- Group stage matches ----
  groupMatches.forEach((match, idx) => {
    const actual = res.groupMatches[match.id];
    if (!hasResult(actual)) return;
    const md = actual.matchday || groupMatchday(idx);
    const jKey = 'g' + md;
    match.preds.forEach((pred, pi) => {
      const d = scoreMatchPrediction(pred, actual, MATCH_POINTS.grupos);
      if (d.pts) {
        const person = people[pi];
        add(person, jKey, d.pts, (p) => (person.breakdown.groupMatches += p));
      }
    });
  });

  // ---- Group final positions (2 pts per exact placement) ----
  for (const [group, rows] of Object.entries(groupPositions)) {
    const standing = res.groupStandings[group];
    if (!standing || !standing.length) continue;
    rows.forEach((row) => {
      const actualCode = standing[row.pos - 1];
      if (!actualCode) return;
      row.preds.forEach((code, pi) => {
        if (code === actualCode) {
          const person = people[pi];
          add(person, GROUP_BONUS_JORNADA, POSITION_POINTS, (p) => (person.breakdown.groupPositions += p));
        }
      });
    });
  }

  // ---- Puntos por clasificado (per round) ----
  for (const [round, rows] of Object.entries(qualifiers)) {
    const actualSet = new Set(res.qualified[round] || []);
    if (!actualSet.size) continue;
    const value = QUALIFIER_POINTS[round] ?? 0;
    const jKey = QUALIFIER_JORNADA[round] || GROUP_BONUS_JORNADA;
    // build per-participant predicted set for this round
    const predSets = predictions.participants.map(() => new Set());
    rows.forEach((row) => row.preds.forEach((code, pi) => predSets[pi].add(code)));
    predSets.forEach((set, pi) => {
      let count = 0;
      for (const code of set) if (actualSet.has(code)) count++;
      const pts = count * value;
      if (pts) {
        const person = people[pi];
        add(person, jKey, pts, (p) => (person.breakdown.qualifiers[round] = (person.breakdown.qualifiers[round] || 0) + p));
      }
    });
  }

  // ---- Knockout matches (must get both teams right) ----
  for (const [round, matches] of Object.entries(knockoutMatches)) {
    const actuals = res.knockoutResults[round] || [];
    if (!actuals.length) continue;
    const tbl = MATCH_POINTS[round];
    const jKey = KNOCKOUT_JORNADA[round];
    matches.forEach((match) => {
      match.preds.forEach((pred, pi) => {
        // find the actual fixture whose pair equals this prediction's pair
        const actual = actuals.find((m) => samePair(pred, m));
        if (!actual) return;
        const d = scoreKnockoutPrediction(pred, actual, tbl);
        if (d && d.pts) {
          const person = people[pi];
          add(person, jKey, d.pts, (p) => (person.breakdown.knockoutMatches[round] = (person.breakdown.knockoutMatches[round] || 0) + p));
        }
      });
    });
  }

  // ---- Honors / Cuadro de honor ----
  const honorIsName = new Set(['botaOro', 'botaPlata', 'botaBronce', 'balonOro', 'mejorPortero']);
  for (const [key, value] of Object.entries(HONOR_POINTS)) {
    const actual = res.honors[key];
    if (actual === undefined || actual === null || actual === '') continue;
    const preds = honors[key];
    if (!preds) continue;
    preds.forEach((pred, pi) => {
      const match = honorIsName.has(key) ? norm(pred) === norm(actual) : pred === actual;
      if (match) {
        const person = people[pi];
        add(person, HONORS_JORNADA, value, (p) => (person.breakdown.honors[key] = (person.breakdown.honors[key] || 0) + p));
      }
    });
  }

  // ---- standings (general) ----
  const finalStandings = rank(people.map((p) => ({ name: p.name, points: p.total })));

  // ---- cumulative standings per jornada ----
  const standingsByJornada = {};
  for (let ji = 0; ji < JORNADAS.length; ji++) {
    const keysUpTo = JORNADAS.slice(0, ji + 1).map((j) => j.key);
    const rows = people.map((p) => ({
      name: p.name,
      points: keysUpTo.reduce((s, k) => s + p.jornada[k], 0),
    }));
    standingsByJornada[JORNADAS[ji].key] = rank(rows);
  }

  return { participants: people, jornadas: JORNADAS, finalStandings, standingsByJornada };
}

// rank with shared positions on ties; returns sorted array with `rank`.
function rank(rows) {
  const sorted = [...rows].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  let lastPts = null;
  let lastRank = 0;
  sorted.forEach((r, i) => {
    if (r.points !== lastPts) {
      lastRank = i + 1;
      lastPts = r.points;
    }
    r.rank = lastRank;
  });
  return sorted;
}
