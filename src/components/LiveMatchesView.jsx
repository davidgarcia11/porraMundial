import { useMemo, useState } from 'react';
import Team from './Team.jsx';

const LIVE = new Set(['IN_PLAY', 'PAUSED']);
const DONE = new Set(['FINISHED', 'AWARDED']);

const dayKey = (d) => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const timeOf = (d) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

export default function LiveMatchesView({ tournament }) {
  const matches = tournament?.matches || [];

  const buckets = useMemo(() => {
    const now = new Date();
    const isToday = (d) => d.toDateString() === now.toDateString();
    const live = [], today = [], upcoming = [], finished = [];
    for (const m of matches) {
      const d = m.utcDate ? new Date(m.utcDate) : null;
      if (LIVE.has(m.status)) live.push(m);
      else if (DONE.has(m.status)) finished.push(m);
      else upcoming.push(m);
      if (d && isToday(d) && !DONE.has(m.status)) today.push(m);
    }
    finished.reverse(); // más recientes primero
    return { live, today, upcoming, finished };
  }, [matches]);

  const def = buckets.live.length ? 'live' : buckets.today.length ? 'today' : 'upcoming';
  const [filter, setFilter] = useState(def);

  if (!matches.length) {
    return <p className="muted small">No hay partidos disponibles todavía.</p>;
  }

  const list = buckets[filter] || [];
  const chips = [
    ['live', `En juego${buckets.live.length ? ` (${buckets.live.length})` : ''}`],
    ['today', 'Hoy'],
    ['upcoming', 'Próximos'],
    ['finished', 'Resultados'],
  ];

  // agrupar por día
  const byDay = [];
  let cur = null;
  for (const m of list) {
    const d = m.utcDate ? new Date(m.utcDate) : null;
    const key = d ? dayKey(d) : 'Fecha por confirmar';
    if (!cur || cur.key !== key) {
      cur = { key, items: [] };
      byDay.push(cur);
    }
    cur.items.push(m);
  }

  return (
    <div>
      <div className="jornada-picker">
        {chips.map(([k, label]) => (
          <button key={k} className={filter === k ? 'chip active' : 'chip'} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>

      {!list.length && <p className="muted small">No hay partidos en esta categoría.</p>}

      {byDay.map((day) => (
        <div key={day.key}>
          <h4 className="day-h">{day.key}</h4>
          <div className="match-list">
            {day.items.map((m) => {
              const d = m.utcDate ? new Date(m.utcDate) : null;
              const live = LIVE.has(m.status);
              const done = DONE.has(m.status);
              const showScore = (live || done) && m.score.home != null;
              return (
                <div key={m.id} className={`mrow${live ? ' live' : ''}`}>
                  <span className="mrow-team home">{m.home.code ? <Team code={m.home.code} /> : <span className="tbd">Por determinar</span>}</span>
                  <span className="mrow-mid">
                    {showScore ? (
                      <span className="mrow-score">{m.score.home}-{m.score.away}</span>
                    ) : (
                      <span className="mrow-time">{d ? timeOf(d) : '—'}</span>
                    )}
                    {live && <span className="live-badge">● EN DIRECTO</span>}
                  </span>
                  <span className="mrow-team away">{m.away.code ? <Team code={m.away.code} /> : <span className="tbd">Por determinar</span>}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
