import { useEffect, useState } from 'react';
import { scoreMatchPrediction, scoreKnockoutPrediction } from '../scoring/engine.js';
import { MATCH_POINTS, POSITION_POINTS, QUALIFIER_POINTS } from '../scoring/config.js';
import { teamName, teamFlag } from '../data/teams.js';
import { breakdownTotals } from '../utils.js';
import Matchup from './Matchup.jsx';

const QUAL_ROWS = [
  ['dieciseisavos', 'Dieciseisavos'],
  ['octavos', 'Octavos'],
  ['cuartos', 'Cuartos'],
  ['semifinales', 'Semifinales'],
  ['tercer_cuarto', '3º y 4º puesto'],
  ['final', 'Final'],
];

const KNOCKOUT_LABELS = {
  dieciseisavos: 'Dieciseisavos',
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semifinales: 'Semifinales',
  tercer_puesto: '3º y 4º puesto',
  final: 'Final',
};

const HONOR_LABELS = {
  campeon: 'Campeón',
  subcampeon: 'Subcampeón',
  tercero: '3º puesto',
  botaOro: 'Bota de Oro',
  botaPlata: 'Bota de Plata',
  botaBronce: 'Bota de Bronce',
  balonOro: 'Balón de Oro',
  mejorPortero: 'Mejor portero',
};

const samePair = (a, b) =>
  (a.home === b.home && a.away === b.away) || (a.home === b.away && a.away === b.home);

export default function ParticipantDetail({ predictions, results, scores, me }) {
  const meIdx = predictions.participants.indexOf(me);
  const [pi, setPi] = useState(meIdx >= 0 ? meIdx : 0);
  useEffect(() => {
    if (meIdx >= 0) setPi(meIdx);
  }, [meIdx]);
  const person = scores.participants[pi];
  const bd = breakdownTotals(person);

  return (
    <section>
      <div className="detail-head">
        <h2>Detalle</h2>
        <select value={pi} onChange={(e) => setPi(Number(e.target.value))}>
          {predictions.participants.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="cards">
        <Card label="Total" value={person.total} big />
        <Card label="Grupos" value={bd.grupos} />
        <Card label="Posiciones" value={bd.posiciones} />
        <Card label="Clasificados" value={bd.clasificados} />
        <Card label="Eliminatorias" value={bd.eliminatorias} />
        <Card label="Extra" value={bd.extra} />
      </div>

      <p className="muted small">
        Desglose de sus puntos por categoría. En las tablas, "Apuesta" es su pronóstico
        (signo · marcador) y "Pts" lo que sumó en ese partido.
      </p>

      <h3>Partidos de grupos</h3>
      <div className="table-wrap">
        <table className="matches">
          <thead>
            <tr>
              <th>Partido</th>
              <th>Apuesta</th>
              <th>Resultado</th>
              <th className="num">Pts</th>
            </tr>
          </thead>
          <tbody>
            {predictions.groupMatches.map((m) => {
              const actual = results.groupMatches?.[m.id];
              const pred = m.preds[pi];
              const d = scoreMatchPrediction(pred, actual, MATCH_POINTS.grupos);
              return (
                <tr key={m.id} className={actual ? '' : 'pending'}>
                  <td>
                    <Matchup home={m.home} away={m.away} />
                  </td>
                  <td className="mono">
                    {pred.sign} · {pred.h}-{pred.a}
                  </td>
                  <td className="mono">{actual ? `${actual.h}-${actual.a}` : '—'}</td>
                  <td className={`num ${d.pts ? 'pos' : ''}`}>{actual ? d.pts : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {Object.keys(results.groupStandings || {}).length > 0 && (
        <div>
          <h3>Posiciones de grupo</h3>
          <div className="table-wrap">
            <table className="matches">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>1º</th>
                  <th>2º</th>
                  <th>3º</th>
                  <th>4º</th>
                  <th className="num">Pts</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(predictions.groupPositions).sort().map((g) => {
                  const actual = results.groupStandings?.[g];
                  if (!actual) return null;
                  let pts = 0;
                  const cells = [1, 2, 3, 4].map((pos) => {
                    const code = predictions.groupPositions[g].find((r) => r.pos === pos)?.preds[pi];
                    const ok = code && actual[pos - 1] === code;
                    if (ok) pts += POSITION_POINTS;
                    return { code, ok };
                  });
                  return (
                    <tr key={g}>
                      <td><b>{g}</b></td>
                      {cells.map((c, i) => (
                        <td key={i} className={c.ok ? 'pos' : ''}>
                          {c.code ? `${teamFlag(c.code)} ${c.code}` : '—'}
                        </td>
                      ))}
                      <td className="num total">{pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted small">2 puntos por cada equipo en su posición final exacta (en verde).</p>
        </div>
      )}

      {Object.values(results.qualified || {}).some((a) => a?.length) && (
        <div>
          <h3>Clasificados</h3>
          <div className="table-wrap">
            <table className="matches">
              <thead>
                <tr>
                  <th>Ronda</th>
                  <th>Equipos acertados</th>
                  <th className="num">Pts</th>
                </tr>
              </thead>
              <tbody>
                {QUAL_ROWS.map(([round, label]) => {
                  const actual = new Set(results.qualified?.[round] || []);
                  if (!actual.size) return null;
                  const predSet = new Set((predictions.qualifiers[round] || []).map((r) => r.preds[pi]));
                  const hits = [...predSet].filter((c) => actual.has(c));
                  return (
                    <tr key={round}>
                      <td>{label}</td>
                      <td>
                        {hits.length ? (
                          hits.map((c) => (
                            <span key={c} className="qchip">{teamFlag(c)} {c}</span>
                          ))
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="num total">{hits.length * QUALIFIER_POINTS[round]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted small">Puntos por cada equipo que aciertas que llega a esa ronda.</p>
        </div>
      )}

      {Object.entries(predictions.knockoutMatches).map(([round, matches]) => {
        const actuals = results.knockoutResults?.[round] || [];
        const tbl = MATCH_POINTS[round];
        return (
          <div key={round}>
            <h3>{KNOCKOUT_LABELS[round]}</h3>
            <div className="table-wrap">
              <table className="matches">
                <thead>
                  <tr>
                    <th>Tu cruce</th>
                    <th>Apuesta</th>
                    <th>Resultado real</th>
                    <th className="num">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m, idx) => {
                    const p = m.preds[pi];
                    const actual = actuals.find((x) => samePair(p, x));
                    const d = scoreKnockoutPrediction(p, actual, tbl);
                    return (
                      <tr key={m.slot + idx} className={actual ? '' : 'pending'}>
                        <td>
                          <Matchup home={p.home} away={p.away} />
                        </td>
                        <td className="mono">
                          {p.sign} · {p.h}-{p.a}
                        </td>
                        <td className="mono result">
                          {actual
                            ? `${teamFlag(actual.home)} ${teamName(actual.home)} ${actual.h}-${actual.a} ${teamFlag(actual.away)} ${teamName(actual.away)}`
                            : '—'}
                        </td>
                        <td className={`num ${d && d.pts ? 'pos' : ''}`}>
                          {actual && d ? d.pts : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <h3>Cuadro de honor</h3>
      <div className="table-wrap">
        <table className="matches">
          <thead>
            <tr>
              <th>Premio</th>
              <th>Apuesta</th>
              <th>Real</th>
              <th className="num">Pts</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(HONOR_LABELS).map(([key, label]) => {
              const isCode = ['campeon', 'subcampeon', 'tercero'].includes(key);
              const pred = predictions.honors[key]?.[pi];
              const actual = results.honors?.[key];
              const pts = person.breakdown.honors[key] || 0;
              return (
                <tr key={key} className={actual ? '' : 'pending'}>
                  <td>{label}</td>
                  <td>{isCode ? `${teamFlag(pred)} ${teamName(pred)}` : pred}</td>
                  <td>{actual ? (isCode ? `${teamFlag(actual)} ${teamName(actual)}` : actual) : '—'}</td>
                  <td className={`num ${pts ? 'pos' : ''}`}>{actual ? pts : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Card({ label, value, big }) {
  return (
    <div className={big ? 'card big' : 'card'}>
      <div className="card-value">{value}</div>
      <div className="card-label">{label}</div>
    </div>
  );
}
