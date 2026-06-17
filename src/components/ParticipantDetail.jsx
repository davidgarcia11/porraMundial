import { useState } from 'react';
import { scoreMatchPrediction, scoreKnockoutPrediction } from '../scoring/engine.js';
import { MATCH_POINTS } from '../scoring/config.js';
import { teamName, teamFlag } from '../data/teams.js';
import { breakdownTotals } from '../utils.js';
import Team from './Team.jsx';

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

export default function ParticipantDetail({ predictions, results, scores }) {
  const [pi, setPi] = useState(0);
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
                    <Team code={m.home} /> <span className="vs">vs</span> <Team code={m.away} />
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
                          <Team code={p.home} /> <span className="vs">-</span> <Team code={p.away} />
                        </td>
                        <td className="mono">
                          {p.sign} · {p.h}-{p.a}
                        </td>
                        <td className="mono">
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
