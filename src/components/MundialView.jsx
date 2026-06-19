import { useState } from 'react';
import LiveMatchesView from './LiveMatchesView.jsx';
import GroupsView from './GroupsView.jsx';
import BracketView from './BracketView.jsx';
import { useNewBadge } from '../newFeatures.js';

const SUBS = [
  { key: 'live', label: 'En directo' },
  { key: 'groups', label: 'Grupos' },
  { key: 'bracket', label: 'Cuadro' },
];

export default function MundialView({ tournament }) {
  const [sub, setSub] = useState(() => localStorage.getItem('porra-sub-mundial') || 'live');
  const { isNew, markSeen } = useNewBadge();
  const open = (key) => {
    setSub(key);
    localStorage.setItem('porra-sub-mundial', key);
    markSeen(`mundial:${key}`);
  };

  if (!tournament) {
    return (
      <section>
        <h2>Mundial</h2>
        <p className="muted small">
          Los datos del Mundial aún no están disponibles. Aparecerán tras la próxima actualización de
          resultados.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>Mundial</h2>
      <div className="subnav">
        {SUBS.map((s) => (
          <button key={s.key} className={sub === s.key ? 'chip active' : 'chip'} onClick={() => open(s.key)}>
            {s.label}
            {isNew(`mundial:${s.key}`) && <span className="new-badge">NUEVO</span>}
          </button>
        ))}
      </div>
      {sub === 'live' ? (
        <LiveMatchesView tournament={tournament} />
      ) : sub === 'groups' ? (
        <GroupsView tournament={tournament} />
      ) : (
        <BracketView tournament={tournament} />
      )}
    </section>
  );
}
