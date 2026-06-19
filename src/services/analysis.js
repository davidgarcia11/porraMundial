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

// Estimación (aproximada) de probabilidad de ganar la porra. Como el campeón
// vale 1000, la porra la decide casi siempre acertar al campeón del Mundial:
// repartimos la probabilidad por los campeones aún vivos (ponderados por cuánta
// gente los eligió, como aproximación de favoritismo) y, entre quienes eligieron
// el mismo campeón, según los puntos que llevan. Se recalcula con cada cambio:
// si un campeón queda eliminado, su probabilidad pasa a 0 y se reparte.
export function winProbabilities(predictions, scores, tournament) {
  const alive = aliveTeams(tournament);
  const totalByName = Object.fromEntries(scores.participants.map((p) => [p.name, p.total]));
  const names = predictions.participants;
  const current = names.map((n) => totalByName[n] ?? 0);
  const champ = predictions.honors.campeon || [];

  const byTeam = {};
  champ.forEach((code, i) => {
    if (code && alive.has(code)) (byTeam[code] ||= []).push(i);
  });
  const teams = Object.keys(byTeam);
  const prob = names.map(() => 0);

  if (teams.length) {
    const totalPickers = teams.reduce((s, T) => s + byTeam[T].length, 0);
    for (const T of teams) {
      const idxs = byTeam[T];
      const pT = idxs.length / totalPickers;
      const weights = idxs.map((i) => current[i] * current[i] || 1);
      const sw = weights.reduce((a, b) => a + b, 0);
      idxs.forEach((i, k) => (prob[i] += pT * (weights[k] / sw)));
    }
  } else {
    // ningún campeón sigue vivo: lo decidiría el resto de puntos -> reparto por puntos
    const sw = current.reduce((a, b) => a + b, 0) || 1;
    current.forEach((v, i) => (prob[i] = v / sw));
  }

  return names
    .map((name, i) => ({
      name,
      prob: prob[i],
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
