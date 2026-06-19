// Cálculos de análisis: equipos vivos, puntos en juego, comparador y estadísticas.
import { TEAMS } from '../data/teams.js';
import { MATCH_POINTS, HONOR_POINTS, POSITION_POINTS, QUALIFIER_POINTS } from '../scoring/config.js';
import { scoreMatchPrediction, sign } from '../scoring/engine.js';

const ALL_CODES = Object.keys(TEAMS);
const hasResult = (m) => m && Number.isFinite(m.h) && Number.isFinite(m.a);

// Conjunto de selecciones que siguen vivas en el torneo.
export function aliveTeams(tournament) {
  const matches = tournament?.matches || [];
  const groupMatches = matches.filter((m) => m.stage === 'GROUP_STAGE');
  const knockout = matches.filter((m) => m.stage !== 'GROUP_STAGE');
  const groupDone = groupMatches.length > 0 && groupMatches.every((m) => m.status === 'FINISHED');

  const knockoutTeams = new Set();
  for (const m of knockout) {
    if (m.home?.code) knockoutTeams.add(m.home.code);
    if (m.away?.code) knockoutTeams.add(m.away.code);
  }

  // base: si los grupos terminaron y ya hay equipos en eliminatorias, solo esos;
  // si no, consideramos a todos vivos (no afirmamos eliminaciones prematuras).
  const alive = groupDone && knockoutTeams.size ? new Set(knockoutTeams) : new Set(ALL_CODES);

  // eliminar perdedores de eliminatorias ya jugadas
  for (const m of knockout) {
    if (m.status !== 'FINISHED' || !m.winner) continue;
    const loser = m.winner === 'HOME_TEAM' ? m.away?.code : m.winner === 'AWAY_TEAM' ? m.home?.code : null;
    if (loser) alive.delete(loser);
  }
  return alive;
}

const maxMatch = (round) => {
  const t = MATCH_POINTS[round];
  return t.signo + t.diferencia + t.exacto;
};
const KO_COUNTS = { dieciseisavos: 16, octavos: 8, cuartos: 4, semifinales: 2, tercer_puesto: 1, final: 1 };
const TEAM_HONORS = ['campeon', 'subcampeon', 'tercero'];

// Máximo de puntos que un participante AÚN podría sumar (cota optimista: asume
// que a partir de ahora le sale todo perfecto, salvo lo ya imposible).
function maxRemaining(predictions, results, alive, pi) {
  let rem = 0;

  // partidos de grupos sin resultado
  for (const m of predictions.groupMatches) {
    if (!hasResult(results.groupMatches?.[m.id])) rem += maxMatch('grupos');
  }

  // posiciones de grupo (se puntúan al cerrar los grupos)
  const groupsComplete = Object.keys(results.groupStandings || {}).length >= 12;
  if (!groupsComplete) {
    let positions = 0;
    for (const g of Object.values(predictions.groupPositions)) positions += g.length;
    rem += POSITION_POINTS * positions;
  }

  // puntos por clasificado (por ronda, si aún no se conoce)
  for (const [round, value] of Object.entries(QUALIFIER_POINTS)) {
    const resolved = (results.qualified?.[round] || []).length > 0;
    if (!resolved) rem += value * (predictions.qualifiers[round]?.length || 0);
  }

  // partidos de eliminatorias no jugados
  for (const [round, total] of Object.entries(KO_COUNTS)) {
    const played = (results.knockoutResults?.[round] || []).length;
    const left = total - played;
    if (left > 0) rem += maxMatch(round) * left;
  }

  // cuadro de honor
  for (const [key, pts] of Object.entries(HONOR_POINTS)) {
    const actual = results.honors?.[key];
    if (actual != null && actual !== '') continue; // ya resuelto
    if (TEAM_HONORS.includes(key)) {
      const code = predictions.honors[key]?.[pi];
      if (code && !alive.has(code)) continue; // su equipo ya no puede
    }
    rem += pts;
  }

  return rem;
}

// Por participante: puntos actuales, máximo alcanzable y estado del campeón.
export function pointsInPlay(predictions, results, scores) {
  const alive = aliveTeams(results.tournament);
  const byName = Object.fromEntries(scores.participants.map((p) => [p.name, p]));
  return predictions.participants.map((name, pi) => {
    const code = predictions.honors.campeon?.[pi] ?? null;
    const champion = { code, alive: code ? alive.has(code) : false };
    const current = byName[name]?.total ?? 0;
    return { name, current, champion, maxAchievable: current + maxRemaining(predictions, results, alive, pi) };
  });
}

// Comparación de partidos de grupos entre dos participantes.
export function compareGroupMatches(predictions, results, i, j) {
  const tbl = MATCH_POINTS.grupos;
  let identical = 0;
  let aTotal = 0;
  let bTotal = 0;
  const rows = predictions.groupMatches.map((m) => {
    const pa = m.preds[i];
    const pb = m.preds[j];
    const actual = results.groupMatches?.[m.id];
    const da = scoreMatchPrediction(pa, actual, tbl);
    const db = scoreMatchPrediction(pb, actual, tbl);
    if (pa.sign === pb.sign && pa.h === pb.h && pa.a === pb.a) identical++;
    if (hasResult(actual)) {
      aTotal += da.pts;
      bTotal += db.pts;
    }
    return { id: m.id, home: m.home, away: m.away, actual, a: { pred: pa, pts: da.pts }, b: { pred: pb, pts: db.pts } };
  });
  return { rows, identical, aTotal, bTotal };
}

// --- Estimación de probabilidad de ganar la porra (Monte Carlo) ---
// Tiene en cuenta: puntos actuales (base) + lo que aún se puede ganar con
// campeón (1000), subcampeón (50), 3º (25) y, si la API da goleadores, Bota de
// Oro/Plata/Bronce (25/15/10). Se simulan miles de finales del torneo: en cada
// una se sortea campeón/subcampeón/3º (entre equipos vivos, ponderados por el
// "favoritismo" según las predicciones) y el top‑3 de goleadores (según los
// goles actuales), se suma todo y se cuenta quién gana. Se recalcula con cada
// actualización: un campeón eliminado deja de poder sortearse.

const normName = (s) =>
  (s ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const lastToken = (s) => normName(s).split(/\s+/).filter(Boolean).pop() || '';
const samePlayer = (pred, actual) => {
  if (!pred || !actual) return false;
  const a = normName(pred);
  const b = normName(actual);
  return a === b || a.includes(b) || b.includes(a) || lastToken(a) === lastToken(b);
};

// PRNG determinista para que el resultado sea estable entre renders.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleWithoutReplacement(items, weights, k, rnd) {
  const idx = items.map((_, i) => i);
  const out = [];
  for (let n = 0; n < k && idx.length; n++) {
    let tot = 0;
    for (const i of idx) tot += weights[i];
    let pos = 0;
    if (tot <= 0) {
      pos = Math.floor(rnd() * idx.length);
    } else {
      let r = rnd() * tot;
      for (let p = 0; p < idx.length; p++) {
        r -= weights[idx[p]];
        if (r <= 0) {
          pos = p;
          break;
        }
        pos = p;
      }
    }
    out.push(items[idx[pos]]);
    idx.splice(pos, 1);
  }
  return out;
}

// "Fuerza" de cada equipo según el consenso de la porra (a cuántos predijeron
// que llega lejos). Sirve para sortear campeón/subcampeón/3º de forma realista.
function teamStrength(predictions, alive) {
  const countRows = (rows) => {
    const m = {};
    for (const row of rows || []) for (const code of row.preds) m[code] = (m[code] || 0) + 1;
    return m;
  };
  const champ = {};
  for (const c of predictions.honors.campeon || []) if (c) champ[c] = (champ[c] || 0) + 1;
  const fin = countRows(predictions.qualifiers.final);
  const semis = countRows(predictions.qualifiers.semifinales);
  const cuartos = countRows(predictions.qualifiers.cuartos);
  const teams = [...alive];
  const weights = teams.map(
    (T) => 0.3 + (champ[T] || 0) * 3 + (fin[T] || 0) * 1.5 + (semis[T] || 0) * 0.8 + (cuartos[T] || 0) * 0.4
  );
  return { teams, weights };
}

export function winProbabilities(predictions, results, scores, sims = 6000) {
  const alive = aliveTeams(results.tournament);
  const totalByName = Object.fromEntries(scores.participants.map((p) => [p.name, p.total]));
  const names = predictions.participants;
  const current = names.map((n) => totalByName[n] ?? 0);

  const H = results.honors || {};
  const resolved = (k) => H[k] != null && H[k] !== '';
  const champPending = !resolved('campeon');
  const subPending = !resolved('subcampeon');
  const terPending = !resolved('tercero');

  const { teams, weights } = teamStrength(predictions, alive);
  const scorers = results.tournament?.scorers || [];
  const scorerNames = scorers.map((s) => s.name);
  const scorerW = scorers.map((s) => (s.goals || 0) + 0.5);
  const botasPending = !resolved('botaOro');

  const champ = predictions.honors.campeon || [];
  const sub = predictions.honors.subcampeon || [];
  const ter = predictions.honors.tercero || [];
  const bo = predictions.honors.botaOro || [];
  const bp = predictions.honors.botaPlata || [];
  const bb = predictions.honors.botaBronce || [];

  const wins = names.map(() => 0);
  const rnd = mulberry32(0x9e3779b9);

  for (let s = 0; s < sims; s++) {
    const [C, R, T3] = sampleWithoutReplacement(teams, weights, 3, rnd);
    const topS = botasPending && scorerNames.length ? sampleWithoutReplacement(scorerNames, scorerW, 3, rnd) : [];

    let best = -Infinity;
    let bestIdxs = [];
    for (let i = 0; i < names.length; i++) {
      let tot = current[i];
      if (champPending && C && champ[i] === C) tot += 1000;
      if (subPending && R && sub[i] === R) tot += 50;
      if (terPending && T3 && ter[i] === T3) tot += 25;
      if (topS.length) {
        if (bo[i] && samePlayer(bo[i], topS[0])) tot += 25;
        if (topS[1] && bp[i] && samePlayer(bp[i], topS[1])) tot += 15;
        if (topS[2] && bb[i] && samePlayer(bb[i], topS[2])) tot += 10;
      }
      if (tot > best) {
        best = tot;
        bestIdxs = [i];
      } else if (tot === best) {
        bestIdxs.push(i);
      }
    }
    const share = 1 / bestIdxs.length;
    for (const i of bestIdxs) wins[i] += share;
  }

  return names
    .map((name, i) => ({
      name,
      prob: wins[i] / sims,
      champion: champ[i] || null,
      championAlive: champ[i] ? alive.has(champ[i]) : false,
    }))
    .sort((a, b) => b.prob - a.prob);
}

export function computeStats(predictions, results, scores) {
  const n = predictions.participants.length;
  const exact = new Array(n).fill(0);
  const signs = new Array(n).fill(0);
  let anyResult = false;

  for (const m of predictions.groupMatches) {
    const actual = results.groupMatches?.[m.id];
    if (!hasResult(actual)) continue;
    anyResult = true;
    const aSign = sign(actual.h, actual.a);
    m.preds.forEach((p, pi) => {
      if (p.sign === aSign) signs[pi]++;
      if (p.h === actual.h && p.a === actual.a) exact[pi]++;
    });
  }

  const bestJornada = scores.participants.map((p) => Math.max(0, ...Object.values(p.jornada)));

  const award = (label, arr, suffix) => {
    let best = -1;
    let idx = -1;
    arr.forEach((v, i) => {
      if (v > best) {
        best = v;
        idx = i;
      }
    });
    return { label, name: predictions.participants[idx], value: best, suffix };
  };

  const leader = scores.finalStandings[0];
  return {
    anyResult,
    awards: [
      { label: 'Líder', name: leader?.name, value: leader?.points, suffix: 'pts' },
      award('Más resultados exactos', exact, 'exactos'),
      award('Más signos acertados', signs, 'signos'),
      award('Mejor jornada', bestJornada, 'pts'),
    ],
  };
}
