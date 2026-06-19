import { useCallback, useState } from 'react';

// Funciones nuevas: clave -> fecha en que se marcó como "nueva".
// El badge "NUEVO" se muestra durante 4 días desde esa fecha (y desaparece antes
// para cada usuario en cuanto abre la sección). Para marcar algo nuevo, añade su
// clave aquí con la fecha de hoy.
export const NEW_SINCE = {
  // pestañas
  mundial: '2026-06-19',
  analisis: '2026-06-19',
  // sub-secciones de Mundial
  'mundial:live': '2026-06-19',
  'mundial:groups': '2026-06-19',
  'mundial:bracket': '2026-06-19',
  // sub-secciones de Análisis
  'analisis:play': '2026-06-19',
  'analisis:compare': '2026-06-19',
  'analisis:stats': '2026-06-19',
};

const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000;
const STORE = 'porra-seen';

const readSeen = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORE) || '[]'));
  } catch {
    return new Set();
  }
};

const withinWindow = (key, now = Date.now()) => {
  const s = NEW_SINCE[key];
  return !!s && now - new Date(s).getTime() < FOUR_DAYS;
};

// Hook: isNew(key) y markSeen(key), persistido por dispositivo en localStorage.
export function useNewBadge() {
  const [seen, setSeen] = useState(readSeen);

  const isNew = useCallback((key) => withinWindow(key) && !seen.has(key), [seen]);

  const markSeen = useCallback((key) => {
    if (!NEW_SINCE[key]) return;
    setSeen((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev).add(key);
      localStorage.setItem(STORE, JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { isNew, markSeen };
}
