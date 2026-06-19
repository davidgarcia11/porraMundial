import { useEffect, useState } from 'react';
import Matchup from './Matchup.jsx';
import { compareGroupMatches } from '../services/analysis.js';

// Comparador cara a cara entre dos participantes.
export default function CompareView({ predictions, results, scores, me }) {
  const names = predictions.participants;
  const meIdx = names.indexOf(me);
  const [i, setI] = useState(meIdx >= 0 ? meIdx : 0);
  const [j, setJ] = useState(meIdx === 1 ? 0 : 1);
  useEffect(() => {
    if (meIdx >= 0) {
      setI(meIdx);
      setJ(meIdx === 0 ? 1 : 0);
    }
  }, [meIdx]);

  const cmp = compareGroupMatches(predictions, results, i, j);
  const totalI = scores.participants[i].total;
  const totalJ = scores.participants[j].total;

  const Picker = ({ value, onChange }) => (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {names.map((n, idx) => (
        <option key={n} value={idx}>{n}</option>
      ))}
    </select>
  );

  return (
    <div>
      <p className="muted small">
        Compara dos participantes partido a partido en la fase de grupos: su apuesta (signo · marcador)
        y los puntos de cada uno. En verde, quién puntúa más en ese partido.
      </p>
      <div className="cmp-head">
        <Picker value={i} onChange={setI} />
        <span className="cmp-vs">vs</span>
        <Picker value={j} onChange={setJ} />
      </div>

      <div className="cmp-summary">
        <div className={`cmp-card${totalI >= totalJ ? ' lead' : ''}`}>
          <div className="cmp-name">{names[i]}</div>
          <div className="cmp-total">{totalI}</div>
        </div>
        <div className="cmp-mid">
          <div className="muted small">coinciden en</div>
          <div className="cmp-ident">{cmp.identical}</div>
          <div className="muted small">de {predictions.groupMatches.length} partidos</div>
        </div>
        <div className={`cmp-card${totalJ >= totalI ? ' lead' : ''}`}>
          <div className="cmp-name">{names[j]}</div>
          <div className="cmp-total">{totalJ}</div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="matches">
          <thead>
            <tr>
              <th>Partido</th>
              <th className="num">{names[i].split(' ')[0]}</th>
              <th className="num">Pts</th>
              <th className="num">{names[j].split(' ')[0]}</th>
              <th className="num">Pts</th>
              <th className="num">Real</th>
            </tr>
          </thead>
          <tbody>
            {cmp.rows.map((r) => {
              const played = !!r.actual;
              return (
                <tr key={r.id} className={played ? '' : 'pending'}>
                  <td><Matchup home={r.home} away={r.away} /></td>
                  <td className="num mono">{r.a.pred.sign}·{r.a.pred.h}-{r.a.pred.a}</td>
                  <td className={`num ${played && r.a.pts > r.b.pts ? 'pos' : ''}`}>{played ? r.a.pts : ''}</td>
                  <td className="num mono">{r.b.pred.sign}·{r.b.pred.h}-{r.b.pred.a}</td>
                  <td className={`num ${played && r.b.pts > r.a.pts ? 'pos' : ''}`}>{played ? r.b.pts : ''}</td>
                  <td className="num mono">{played ? `${r.actual.h}-${r.actual.a}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
