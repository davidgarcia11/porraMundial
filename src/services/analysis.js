// Cálculos de análisis: equipos vivos, puntos en juego, comparador y estadísticas.
import { TEAMS } from '../data/teams.js';
import { MATCH_POINTS, HONOR_POINTS } from '../scoring/config.js';
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

const HONORS = [
  ['campeon', 'Campeón', HONOR_POINTS.campeon],
  ['subcampeon', 'Subcampeón', HONOR_POINTS.subcampeon],
  ['tercero', '3º puesto', HONOR_POINTS.tercero],
];

// Por participante: puntos actuales, estado del campeón y puntos extra aún posibles.
export function pointsInPlay(predictions, scores, tournament) {
  const alive = aliveTeams(tournament);
  const byName = Object.fromEntries(scores.participants.map((p) => [p.name, p]));
  return predictions.participants.map((name, pi) => {
    const honors = HONORS.map(([key, label, pts]) => {
      const code = predictions.honors[key]?.[pi] ?? null;
      const isAlive = code ? alive.has(code) : false;
      return { key, label, pts, code, alive: isAlive };
    });
    const extraInPlay = honors.reduce((s, h) => s + (h.alive ? h.pts : 0), 0);
    const champion = honors[0];
    return {
      name,
      current: byName[name]?.total ?? 0,
      champion,
      extraInPlay,
    };
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

// "Premios" / estadísticas curiosas a partir de los partidos de grupos.
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
