// Loads results for the app. Order of preference:
//   1. /api/results  -> live serverless endpoint (fresh, token stays server-side)
//   2. /results.json -> static snapshot baked at build time (refreshed by the
//      scheduled GitHub Action). Fallback when the live endpoint is unavailable
//      (e.g. running `vite preview` locally, or the function errors).
async function tryFetch(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function loadResults() {
  try {
    return await tryFetch('/api/results', { cache: 'no-store' });
  } catch (e) {
    console.info('Endpoint en vivo no disponible, usando results.json estático:', e.message);
  }
  try {
    return await tryFetch(`${import.meta.env.BASE_URL}results.json`, { cache: 'no-store' });
  } catch (e) {
    console.warn('No se pudo cargar results.json:', e.message);
    return null;
  }
}
