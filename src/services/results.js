// Loads the live results file from /public at runtime so it can be refreshed
// (re-run the fetch script + redeploy) without rebuilding the bundle.
export async function loadResults() {
  const url = `${import.meta.env.BASE_URL}results.json`;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.warn('No se pudo cargar results.json:', e.message);
    return null;
  }
}
