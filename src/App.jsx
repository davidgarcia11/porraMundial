import { useEffect, useMemo, useState } from 'react';
import predictions from './data/predictions.json';
import { computeScores } from './scoring/engine.js';
import { loadResults } from './services/results.js';
import { UNCONFIRMED_CODES } from './data/teams.js';
import Standings from './components/Standings.jsx';
import JornadaView from './components/JornadaView.jsx';
import ParticipantDetail from './components/ParticipantDetail.jsx';
import MatchesView from './components/MatchesView.jsx';
import MundialView from './components/MundialView.jsx';
import AnalisisView from './components/AnalisisView.jsx';

const EMPTY_RESULTS = {
  groupMatches: {},
  groupStandings: {},
  qualified: {},
  knockoutResults: {},
  honors: {},
};

const TABS = [
  { key: 'general', label: 'Clasificación general' },
  { key: 'jornada', label: 'Por jornada' },
  { key: 'detalle', label: 'Detalle participante' },
  { key: 'partidos', label: 'Partidos' },
  { key: 'mundial', label: 'Mundial' },
  { key: 'analisis', label: 'Análisis' },
];

const REFRESH_MS = 120000; // auto-refresco cada 2 min

export default function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('general');
  const [me, setMe] = useState(() => localStorage.getItem('porra-me') || '');

  useEffect(() => {
    let active = true;
    const refresh = () => loadResults().then((r) => {
      if (!active) return;
      if (r) setResults(r);
      setLoading(false);
    });
    refresh();
    const id = setInterval(refresh, REFRESH_MS); // se actualiza solo
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const chooseMe = (name) => {
    setMe(name);
    if (name) localStorage.setItem('porra-me', name);
    else localStorage.removeItem('porra-me');
  };

  const effectiveResults = results || EMPTY_RESULTS;
  const scores = useMemo(
    () => computeScores(predictions, effectiveResults),
    [effectiveResults]
  );

  const hasResults =
    results &&
    (Object.keys(results.groupMatches || {}).length ||
      Object.keys(results.groupStandings || {}).length ||
      Object.values(results.knockoutResults || {}).some((a) => a?.length) ||
      Object.values(results.honors || {}).some(Boolean));

  return (
    <div className="app">
      <header className="header">
        <h1>Porra del Mundial 2026</h1>
        <p className="sub">
          {predictions.participants.length} participantes ·{' '}
          {results?.updatedAt
            ? `Resultados: ${new Date(results.updatedAt).toLocaleString('es-ES')}`
            : 'Sin resultados todavía'}
        </p>
        <div className="me-picker">
          <label>Soy:</label>
          <select value={me} onChange={(e) => chooseMe(e.target.value)}>
            <option value="">— elige tu nombre —</option>
            {predictions.participants.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </header>

      {UNCONFIRMED_CODES.length > 0 && (
        <div className="banner warn">
          ⚠️ Códigos de equipo por confirmar: <b>{UNCONFIRMED_CODES.join(', ')}</b>. Revisa{' '}
          <code>src/data/teams.js</code> para que los resultados automáticos puntúen bien.
        </div>
      )}

      {!loading && !hasResults && (
        <div className="banner info">
          {results?.source && String(results.source).startsWith('error') ? (
            <>
              No se pudieron cargar resultados automáticos: <b>{results.source}</b>. Revisa el token{' '}
              <code>FOOTBALL_DATA_TOKEN</code> en Vercel y vuelve a desplegar, o edita{' '}
              <code>public/results.json</code> a mano.
            </>
          ) : (
            <>
              Aún no hay resultados cargados. Genera <code>public/results.json</code> con{' '}
              <code>npm run fetch:results</code>. Mientras tanto se muestran las apuestas con 0 puntos.
            </>
          )}
        </div>
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'tab active' : 'tab'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : tab === 'general' ? (
          <Standings scores={scores} me={me} />
        ) : tab === 'jornada' ? (
          <JornadaView scores={scores} me={me} />
        ) : tab === 'detalle' ? (
          <ParticipantDetail
            predictions={predictions}
            results={effectiveResults}
            scores={scores}
          />
        ) : tab === 'partidos' ? (
          <MatchesView predictions={predictions} results={effectiveResults} />
        ) : tab === 'mundial' ? (
          <MundialView tournament={effectiveResults.tournament} />
        ) : (
          <AnalisisView predictions={predictions} results={effectiveResults} scores={scores} me={me} />
        )}
      </main>

      <footer className="footer">
        Cómo se puntúa: aciertas el <b>signo</b>, la <b>diferencia</b> de goles y el{' '}
        <b>resultado exacto</b> suman (acumulativo). Además puntúan los <b>equipos clasificados</b>{' '}
        a cada ronda y el <b>cuadro de honor</b> (campeón, goleadores, mejor jugador…).
      </footer>
    </div>
  );
}
