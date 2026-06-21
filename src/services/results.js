// Loads results for the app and applies any manual corrections (overrides.json),
// useful when the API has a wrong score (e.g. a VAR-disallowed goal).
//
// Order of preference for the base data:
//   1. /api/results  -> live serverless endpoint (token stays server-side)
//   2. /results.json -> static snapshot (refreshed by the scheduled Action)
async function tryFetch(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function loadOverrides() {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}overrides.json`, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// Aplica correcciones manuales encima de los datos de la API.
function applyOverrides(data, ov) {
  if (!data || !ov) return data;

  if (ov.groupMatches) {
    data.groupMatches = data.groupMatches || {};
    for (const [id, o] of Object.entries(ov.groupMatches)) {
      if (!o || !Number.isFinite(o.h) || !Number.isFinite(o.a)) continue;
      const prev = data.groupMatches[id] || {};
      data.groupMatches[id] = { ...prev, h: o.h, a: o.a, matchday: prev.matchday ?? o.matchday };
      // corrige también el marcador en la vista "Mundial" (tournament.matches)
      const dash = id.indexOf('-');
      const hc = id.slice(0, dash);
      const ac = id.slice(dash + 1);
      const tm = (data.tournament?.matches || []).find(
        (m) =>
          m.stage === 'GROUP_STAGE' &&
          ((m.home?.code === hc && m.away?.code === ac) || (m.home?.code === ac && m.away?.code === hc))
      );
      if (tm) {
        tm.score = tm.home.code === hc ? { home: o.h, away: o.a } : { home: o.a, away: o.h };
        tm.status = 'FINISHED';
      }
    }
  }

  if (ov.honors) data.honors = { ...(data.honors || {}), ...ov.honors };

  return data;
}

export async function loadResults() {
  const ov = await loadOverrides();
  let data = null;
  try {
    data = await tryFetch('/api/results', { cache: 'no-store' });
  } catch (e) {
    console.info('Endpoint en vivo no disponible, usando results.json estático:', e.message);
  }
  if (!data) {
    try {
      data = await tryFetch(`${import.meta.env.BASE_URL}results.json`, { cache: 'no-store' });
    } catch (e) {
      console.warn('No se pudo cargar results.json:', e.message);
    }
  }
  return applyOverrides(data, ov);
}
