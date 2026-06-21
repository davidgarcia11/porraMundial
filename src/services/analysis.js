// Cálculos de análisis: equipos vivos, puntos en juego, comparador y estadísticas.
import { TEAMS } from '../data/teams.js';
import { MATCH_POINTS, HONOR_POINTS, POSITION_POINTS, QUALIFIER_POINTS } from '../scoring/config.js';
import { scoreMatchPrediction, scoreKnockoutPrediction, sign, computeScores } from '../scoring/engine.js';
import { provisionalR32, provisionalQualifiers } from './tournamentUtils.js';

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

const poisson = (l, rnd) => {
  const L = Math.exp(-l);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L);
  return k - 1;
};

// Agrupa los partidos de grupos por grupo (una vez).
function buildGroupFixtures(predictions) {
  const byGroup = {};
  predictions.groupMatches.forEach((m, idx) => {
    const g = TEAMS[m.home]?.group;
    if (!g) return;
    (byGroup[g] ||= []).push({ id: m.id, home: m.home, away: m.away, matchday: Math.floor(idx / 24) + 1 });
  });
  return byGroup;
}

// Tabla de cada grupo a partir de un mapa de resultados.
function computeGroupStandings(byGroup, gm) {
  const out = {};
  for (const [g, fixtures] of Object.entries(byGroup)) {
    const stat = {};
    const ensure = (c) => (stat[c] ||= { code: c, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, playedGames: 0, won: 0, draw: 0, lost: 0 });
    for (const f of fixtures) {
      const A = ensure(f.home);
      const B = ensure(f.away);
      const r = gm[f.id];
      if (!r) continue;
      A.goalsFor += r.h; A.goalsAgainst += r.a; B.goalsFor += r.a; B.goalsAgainst += r.h;
      A.playedGames++; B.playedGames++;
      if (r.h > r.a) { A.points += 3; A.won++; B.lost++; }
      else if (r.h < r.a) { B.points += 3; B.won++; A.lost++; }
      else { A.points++; B.points++; A.draw++; B.draw++; }
    }
    const rows = Object.values(stat);
    rows.forEach((r) => (r.goalDifference = r.goalsFor - r.goalsAgainst));
    rows.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.code.localeCompare(b.code));
    rows.forEach((r, i) => (r.position = i + 1));
    out[g] = rows;
  }
  return out;
}

// Topología del cuadro (qué cruces alimentan a cada ronda).
const OCT_FEED = [[0, 2], [1, 4], [3, 5], [6, 7], [10, 11], [8, 9], [13, 15], [12, 14]];
const CUA_FEED = [[0, 1], [4, 5], [2, 3], [6, 7]];
const SEM_FEED = [[0, 1], [2, 3]];

function simulateKnockout(r32, strength, rnd) {
  const ko = { dieciseisavos: [], octavos: [], cuartos: [], semifinales: [], tercer_puesto: [], final: [] };
  const str = (c) => strength[c] || 0.3;
  const play = (cA, cB) => {
    if (!cA || !cB) {
      const w = cA || cB;
      return { home: cA || cB, away: cB || cA, h: 1, a: 0, winner: w, loser: null };
    }
    const aWins = rnd() < str(cA) / (str(cA) + str(cB));
    const wG = 1 + poisson(0.7, rnd);
    let lG = poisson(0.8, rnd);
    if (lG >= wG) lG = wG - 1;
    const winner = aWins ? cA : cB;
    const loser = aWins ? cB : cA;
    return aWins ? { home: cA, away: cB, h: wG, a: lG, winner, loser } : { home: cA, away: cB, h: lG, a: wG, winner, loser };
  };
  const push = (round, r) => ko[round].push({ home: r.home, away: r.away, h: r.h, a: r.a });

  const r32w = [];
  r32.forEach((m) => { const r = play(m.a.code, m.b.code); push('dieciseisavos', r); r32w.push(r.winner); });
  const octw = []; OCT_FEED.forEach(([i, j]) => { const r = play(r32w[i], r32w[j]); push('octavos', r); octw.push(r.winner); });
  const cuaw = []; CUA_FEED.forEach(([i, j]) => { const r = play(octw[i], octw[j]); push('cuartos', r); cuaw.push(r.winner); });
  const semw = []; const seml = [];
  SEM_FEED.forEach(([i, j]) => { const r = play(cuaw[i], cuaw[j]); push('semifinales', r); semw.push(r.winner); seml.push(r.loser); });
  const f = play(semw[0], semw[1]); push('final', f);
  const tp = play(seml[0], seml[1]); push('tercer_puesto', tp);

  return {
    koResults: ko,
    qualified: {
      octavos: r32w.filter(Boolean),
      cuartos: octw.filter(Boolean),
      semifinales: cuaw.filter(Boolean),
      final: semw.filter(Boolean),
      tercer_cuarto: seml.filter(Boolean),
    },
    champion: f.winner,
    subcampeon: f.loser,
    tercero: tp.winner,
  };
}

// Probabilidad de ganar la porra por simulación completa del torneo restante.
export function winProbabilities(predictions, results, scores, sims = 2500) {
  const names = predictions.participants;
  const idxByName = Object.fromEntries(names.map((n, i) => [n, i]));
  const realGM = results.groupMatches || {};
  const realHonors = results.honors || {};
  const byGroup = buildGroupFixtures(predictions);

  const { teams: stT, weights: stW } = teamStrength(predictions, new Set(Object.keys(TEAMS)));
  const consensus = {};
  stT.forEach((c, i) => (consensus[c] = stW[i]));
  // forma actual de cada equipo (según la clasificación en vivo): los que van
  // bien ahora pesan más en quién gana el torneo -> reflejan las circunstancias.
  const liveGroups = results.tournament?.groups || {};
  const perf = {};
  let maxPerf = 0;
  for (const rows of Object.values(liveGroups))
    for (const r of rows) {
      const v = (r.points || 0) + 0.5 * (r.goalDifference || 0);
      perf[r.code] = v;
      if (v > maxPerf) maxPerf = v;
    }
  const strength = {};
  for (const c of Object.keys(TEAMS)) {
    const f = maxPerf > 0 ? (perf[c] || 0) / maxPerf : 0;
    strength[c] = (consensus[c] || 0.3) * (1 + 1.2 * f);
  }

  const scorers = results.tournament?.scorers || [];
  const scorerNames = scorers.map((s) => s.name);
  // el goleador líder pesa mucho más (cuadrático): si tu goleador va 1º, sube tu probabilidad.
  const scorerW = scorers.map((s) => (s.goals || 0) * (s.goals || 0) + 0.3);

  const wins = names.map(() => 0);
  const rnd = mulberry32(0x9e3779b9);

  for (let s = 0; s < sims; s++) {
    // 1) resultados de grupos (reales + simulados)
    const gm = {};
    predictions.groupMatches.forEach((m, idx) => {
      const r = realGM[m.id];
      if (r && Number.isFinite(r.h)) gm[m.id] = { h: r.h, a: r.a, matchday: r.matchday || Math.floor(idx / 24) + 1 };
      else gm[m.id] = { h: poisson(1.3, rnd), a: poisson(1.3, rnd), matchday: Math.floor(idx / 24) + 1 };
    });
    // 2) clasificaciones de grupo y cuadro
    const simGroups = computeGroupStandings(byGroup, gm);
    const r32 = provisionalR32(simGroups);
    if (!r32) continue;
    const ko = simulateKnockout(r32, strength, rnd);
    const dieci = [];
    r32.forEach((m) => { if (m.a.code) dieci.push(m.a.code); if (m.b.code) dieci.push(m.b.code); });
    const standingsCodes = {};
    for (const [g, rows] of Object.entries(simGroups)) standingsCodes[g] = rows.map((r) => r.code);
    // 3) goleadores -> botas
    const topS = scorerNames.length ? sampleWithoutReplacement(scorerNames, scorerW, 3, rnd) : [];
    // 4) montar resultados (respetando lo ya resuelto) y puntuar con el motor real
    const simResults = {
      groupMatches: gm,
      groupStandings: standingsCodes,
      qualified: { dieciseisavos: dieci, ...ko.qualified },
      knockoutResults: ko.koResults,
      honors: {
        campeon: realHonors.campeon || ko.champion,
        subcampeon: realHonors.subcampeon || ko.subcampeon,
        tercero: realHonors.tercero || ko.tercero,
        botaOro: realHonors.botaOro || topS[0] || null,
        botaPlata: realHonors.botaPlata || topS[1] || null,
        botaBronce: realHonors.botaBronce || topS[2] || null,
        balonOro: realHonors.balonOro || null,
        mejorPortero: realHonors.mejorPortero || null,
      },
    };
    const sc = computeScores(predictions, simResults);
    let best = -Infinity;
    let bestNames = [];
    for (const p of sc.participants) {
      if (p.total > best) { best = p.total; bestNames = [p.name]; }
      else if (p.total === best) bestNames.push(p.name);
    }
    const share = 1 / bestNames.length;
    for (const nm of bestNames) wins[idxByName[nm]] += share;
  }

  const alive = aliveTeams(results.tournament);
  const champ = predictions.honors.campeon || [];
  return names
    .map((name, i) => ({
      name,
      prob: wins[i] / sims,
      champion: champ[i] || null,
      championAlive: champ[i] ? alive.has(champ[i]) : false,
    }))
    .sort((a, b) => b.prob - a.prob);
}

// Índice de "potencial": cuánto puede llegar a sumar cada uno si acierta lo que
// le queda, AJUSTADO por sus circunstancias actuales (solo cuentan campeones/
// equipos aún vivos, y las botas según la posición actual de su goleador). No es
// una probabilidad (no suma 100%): es el techo realista de cada participante.
export function potentialIndex(predictions, results, scores) {
  const alive = aliveTeams(results.tournament);
  const totalByName = Object.fromEntries(scores.participants.map((p) => [p.name, p.total]));
  const names = predictions.participants;
  const H = results.honors || {};
  const resolved = (k) => H[k] != null && H[k] !== '';
  const scorers = results.tournament?.scorers || [];
  const scorerRank = (pred) => {
    if (!pred) return null;
    const i = scorers.findIndex((s) => samePlayer(pred, s.name));
    return i < 0 ? null : i + 1;
  };
  // valor de una bota según la posición actual del goleador elegido
  const botaValue = (pred, base) => {
    const r = scorerRank(pred);
    if (r == null) return 0;
    if (r === 1) return base;
    if (r <= 3) return base * 0.6;
    if (r <= 10) return base * 0.3;
    return base * 0.1;
  };

  const groupsComplete = Object.keys(results.groupStandings || {}).length >= 12;

  return names
    .map((name, pi) => {
      let pot = totalByName[name] ?? 0;

      // partidos de grupos sin jugar (asume que los acierta)
      for (const m of predictions.groupMatches)
        if (!(results.groupMatches?.[m.id] && Number.isFinite(results.groupMatches[m.id].h))) pot += maxMatch('grupos');

      // posiciones de grupo (si no han terminado)
      if (!groupsComplete) {
        let positions = 0;
        for (const g of Object.values(predictions.groupPositions)) positions += g.length;
        pot += POSITION_POINTS * positions;
      }

      // clasificados: solo equipos que SIGUEN vivos
      for (const [round, value] of Object.entries(QUALIFIER_POINTS)) {
        const set = new Set((predictions.qualifiers[round] || []).flatMap((r) => r.preds));
        let count = 0;
        for (const code of set) if (alive.has(code)) count++;
        pot += value * count;
      }

      // partidos de eliminatorias cuyos dos equipos siguen vivos
      for (const round of Object.keys(KO_COUNTS)) {
        const matches = predictions.knockoutMatches[round] || [];
        for (const m of matches) {
          const p = m.preds[pi];
          if (p && p.home && p.away && alive.has(p.home) && alive.has(p.away)) pot += maxMatch(round);
        }
      }

      // cuadro de honor por equipos: solo si su pick sigue vivo (y no resuelto)
      if (!resolved('campeon') && predictions.honors.campeon[pi] && alive.has(predictions.honors.campeon[pi])) pot += HONOR_POINTS.campeon;
      if (!resolved('subcampeon') && predictions.honors.subcampeon[pi] && alive.has(predictions.honors.subcampeon[pi])) pot += HONOR_POINTS.subcampeon;
      if (!resolved('tercero') && predictions.honors.tercero[pi] && alive.has(predictions.honors.tercero[pi])) pot += HONOR_POINTS.tercero;

      // botas: según la posición actual de su goleador
      if (!resolved('botaOro')) {
        pot += botaValue(predictions.honors.botaOro[pi], HONOR_POINTS.botaOro);
        pot += botaValue(predictions.honors.botaPlata[pi], HONOR_POINTS.botaPlata);
        pot += botaValue(predictions.honors.botaBronce[pi], HONOR_POINTS.botaBronce);
      }

      return { name, current: totalByName[name] ?? 0, potential: Math.round(pot) };
    })
    .sort((a, b) => b.potential - a.potential);
}

// Proyección "si los grupos acabaran como ahora": puntúa con la clasificación
// actual de los grupos (posiciones exactas + clasificados a dieciseisavos), para
// ver quién va mejor según lo que ya está acertando del sistema de puntuación.
export function currentProjection(predictions, results, scores) {
  const groups = results.tournament?.groups || {};
  const hasGroups = Object.keys(groups).length > 0;
  const standingsCodes = {};
  for (const [g, rows] of Object.entries(groups)) standingsCodes[g] = rows.map((r) => r.code);

  let dieci = [];
  if (hasGroups) {
    const q = provisionalQualifiers(groups);
    dieci = [...q.firsts, ...q.seconds, ...q.thirds].map((t) => t.code).filter(Boolean);
  }

  const frozen = {
    groupMatches: results.groupMatches || {},
    groupStandings: standingsCodes,
    qualified: { dieciseisavos: dieci },
    knockoutResults: {},
    honors: {},
  };
  const proj = computeScores(predictions, frozen);
  const projByName = Object.fromEntries(proj.participants.map((p) => [p.name, p.total]));
  const curByName = Object.fromEntries(scores.participants.map((p) => [p.name, p.total]));

  return predictions.participants
    .map((name) => ({
      name,
      current: curByName[name] ?? 0,
      projected: projByName[name] ?? 0,
    }))
    .sort((a, b) => b.projected - a.projected || b.current - a.current);
}

const samePairAB = (a, b) =>
  (a.home === b.home && a.away === b.away) || (a.home === b.away && a.away === b.home);
const STAGE_TO_ROUND = {
  LAST_32: 'dieciseisavos', LAST_16: 'octavos', QUARTER_FINALS: 'cuartos',
  SEMI_FINALS: 'semifinales', THIRD_PLACE: 'tercer_puesto', FINAL: 'final',
};

// Evolución de puntos ACUMULADOS por día (no por jornada), para el gráfico.
export function dailyEvolution(predictions, results, scores) {
  const names = predictions.participants;
  const tmatches = results.tournament?.matches || [];
  const dayOf = (iso) => (iso ? iso.slice(0, 10) : null);

  const dateByPair = {};
  for (const m of tmatches)
    if (m.stage === 'GROUP_STAGE' && m.home?.code && m.away?.code && m.utcDate)
      dateByPair[[m.home.code, m.away.code].sort().join('|')] = m.utcDate;

  const dayPts = names.map(() => ({}));
  const matchTotal = names.map(() => 0);
  const add = (pi, day, pts) => {
    if (!pts || !day) return;
    dayPts[pi][day] = (dayPts[pi][day] || 0) + pts;
    matchTotal[pi] += pts;
  };

  for (const gm of predictions.groupMatches) {
    const actual = results.groupMatches?.[gm.id];
    if (!hasResult(actual)) continue;
    const day = dayOf(dateByPair[[gm.home, gm.away].sort().join('|')]);
    if (!day) continue;
    gm.preds.forEach((pred, pi) => add(pi, day, scoreMatchPrediction(pred, actual, MATCH_POINTS.grupos).pts));
  }

  for (const m of tmatches) {
    const round = STAGE_TO_ROUND[m.stage];
    if (!round || m.status !== 'FINISHED' || !m.home?.code || !m.away?.code) continue;
    const day = dayOf(m.utcDate);
    if (!day) continue;
    const actual = { home: m.home.code, away: m.away.code, h: m.score.home, a: m.score.away };
    if (!hasResult(actual)) continue;
    const tbl = MATCH_POINTS[round];
    const preds = predictions.knockoutMatches[round] || [];
    for (let pi = 0; pi < names.length; pi++)
      for (const match of preds) {
        const p = match.preds[pi];
        if (p && p.home && samePairAB(p, actual)) {
          const d = scoreKnockoutPrediction(p, actual, tbl);
          if (d) add(pi, day, d.pts);
          break;
        }
      }
  }

  const groupDays = [...new Set(Object.values(dateByPair).map(dayOf).filter(Boolean))].sort();
  const lastGroupDay = groupDays[groupDays.length - 1] || null;
  const playedDays = new Set();
  dayPts.forEach((o) => Object.keys(o).forEach((d) => playedDays.add(d)));
  const sortedPlayed = [...playedDays].sort();
  const lastOverallDay = sortedPlayed[sortedPlayed.length - 1] || lastGroupDay;

  scores.participants.forEach((p, pi) => {
    const bdGroup = (p.breakdown.groupPositions || 0) + (p.breakdown.qualifiers?.dieciseisavos || 0);
    const bonusRest = p.total - matchTotal[pi] - bdGroup;
    add(pi, lastGroupDay, bdGroup);
    if (bonusRest > 0.001) add(pi, lastOverallDay, bonusRest);
  });

  const days = [...new Set([...playedDays, ...(lastGroupDay ? [lastGroupDay] : [])])].sort();
  const series = {};
  names.forEach((nm, pi) => {
    let c = 0;
    series[nm] = days.map((day) => {
      c += dayPts[pi][day] || 0;
      return c;
    });
  });
  return { days, series, leaderName: scores.finalStandings[0]?.name || null };
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
