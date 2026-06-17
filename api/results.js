// Vercel serverless function: returns live Mundial results (already translated
// to the porra's codes) so the web updates without rebuilding. The token stays
// server-side. Cached at the edge ~2 min to respect the API rate limit.
//
// If this fails for any reason the frontend falls back to the static
// public/results.json (kept fresh by the scheduled GitHub Action).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildResults } from '../src/services/fetchResultsCore.js';

let predictions;
const getPredictions = () => {
  if (!predictions) {
    const p = path.join(process.cwd(), 'src', 'data', 'predictions.json');
    predictions = JSON.parse(readFileSync(p, 'utf8'));
  }
  return predictions;
};

export default async function handler(req, res) {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  const competition = process.env.FOOTBALL_DATA_COMPETITION || 'WC';

  if (!token) {
    res.status(502).json({ error: 'falta FOOTBALL_DATA_TOKEN en el servidor' });
    return;
  }

  try {
    const { results } = await buildResults({
      token,
      competition,
      predictions: getPredictions(),
    });
    // Caché: el navegador siempre revalida (max-age=0); el CDN sirve la misma
    // respuesta ~2 min y revalida en segundo plano (stale-while-revalidate).
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600');
    res.status(200).json(results);
  } catch (e) {
    res.status(502).json({ error: String(e?.message || e) });
  }
}
