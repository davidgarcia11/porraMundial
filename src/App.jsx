import { useEffect, useMemo, useState } from 'react';
import predictions from './data/predictions.json';
import { computeScores } from './scoring/engine.js';
import { loadResults } from './services/results.js';
import { UNCONFIRMED_CODES } from './data/teams.js';
import Standings from './components/Standings.jsx';
import JornadaView from './components/JornadaView.jsx';
import ParticipantDetail from './components/ParticipantDetail.jsx';
import MatchesView from './components/MatchesView.jsx';

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
];

export default function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('general');

  useEffect(() => {
    loadResults().then((r) => {
      setResults(r);
      setLoading(false);
    });
  }, []);

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
        <h1>🏆 Porra del Mundial 2026</h1>
        <p className="sub">
          {predictions.participants.length} participantes ·{' '}
          {results?.updatedAt
            ? `Resultados: ${new Date(results.updatedAt).toLocaleString('es-ES')}`
            : 'Sin resultados todavía'}
        </p>
      </header>

      {UNCONFIRMED_CODES.length > 0 && (
        <div className="banner warn">
          ⚠️ Códigos de equipo por confirmar: <b>{UNCONFIRMED_CODES.join(', ')}</b>. Revisa{' '}
          <code>src/data/teams.js</code> para que los resultados automáticos puntúen bien.
        </div>
      )}

      {!loading && !hasResults && (
        <div className="banner info">
          Aún no hay resultados cargados. Genera <code>public/results.json</code> con{' '}
          <code>npm run fetch:results</code>. Mientras tanto se muestran las apuestas con 0 puntos.
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
          <Standings scores={scores} />
        ) : tab === 'jornada' ? (
          <JornadaView scores={scores} />
        ) : tab === 'detalle' ? (
          <ParticipantDetail
            predictions={predictions}
            results={effectiveResults}
            scores={scores}
          />
        ) : (
          <MatchesView predictions={predictions} results={effectiveResults} />
        )}
      </main>

      <footer className="footer">
        Sistema de puntuación: signo/diferencia/exacto acumulativos · puntos por clasificado ·
        puntos extra. Octavos = 6/2/6.
      </footer>
    </div>
  );
}
