import { useCallback } from 'react';

// Funciones nuevas: clave -> fecha en que se marcó como "nueva".
// El badge "NUEVO" se muestra durante 4 días desde esa fecha, para todos, y NO
// desaparece al pulsarlo. Para marcar algo nuevo, añade su clave con la fecha de hoy.
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
  'analisis:prob': '2026-06-19',
  'analisis:projection': '2026-06-19',
};

const FOUR_DAYS = 4 * 24 * 60 * 60 * 1000;

const withinWindow = (key, now = Date.now()) => {
  const s = NEW_SINCE[key];
  return !!s && now - new Date(s).getTime() < FOUR_DAYS;
};

// Hook: isNew(key) muestra "NUEVO" durante 4 días (no se quita al abrir).
// markSeen se mantiene por compatibilidad pero ya no hace nada.
export function useNewBadge() {
  const isNew = useCallback((key) => withinWindow(key), []);
  const markSeen = useCallback(() => {}, []);
  return { isNew, markSeen };
}
