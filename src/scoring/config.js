// Scoring system — "Sistema de puntuación Porra del Mundial 2026".
//
// Match points are CUMULATIVE: a correct exact result also earns the sign and
// goal-difference points on top (decision confirmed by the organiser).
//   Grupos exacto      = 3 (signo) + 1 (dif) + 3 (exacto) = 7
//   Dieciseisavos exacto = 6 + 2 + 6 = 14, etc.
// Octavos is not in the PDF table -> organiser chose to reuse dieciseisavos.

export const MATCH_POINTS = {
  grupos: { signo: 3, diferencia: 1, exacto: 3 },
  dieciseisavos: { signo: 6, diferencia: 2, exacto: 6 },
  octavos: { signo: 6, diferencia: 2, exacto: 6 },
  cuartos: { signo: 9, diferencia: 3, exacto: 9 },
  semifinales: { signo: 12, diferencia: 4, exacto: 12 },
  tercer_puesto: { signo: 15, diferencia: 5, exacto: 15 },
  final: { signo: 15, diferencia: 5, exacto: 15 },
};

// Group stage: exact final position of each team in its group.
export const POSITION_POINTS = 2; // per correctly placed team

// Points per team correctly predicted to REACH a given round.
export const QUALIFIER_POINTS = {
  dieciseisavos: 5,
  octavos: 10,
  cuartos: 15,
  semifinales: 20,
  tercer_cuarto: 25, // reached the 3rd/4th place match (semifinal losers)
  final: 25,
};

// Extra points (Cuadro de honor).
export const HONOR_POINTS = {
  campeon: 1000,
  subcampeon: 50,
  tercero: 25,
  botaOro: 25,
  botaPlata: 15,
  botaBronce: 10,
  balonOro: 25,
  mejorPortero: 25,
};

// From DIECISEISAVOS onwards you only score a match if BOTH predicted teams
// match the real fixture.
export const KNOCKOUT_ROUNDS = [
  'dieciseisavos',
  'octavos',
  'cuartos',
  'semifinales',
  'tercer_puesto',
  'final',
];

// Ordered "jornadas" used for the per-matchday classification view.
export const JORNADAS = [
  { key: 'g1', label: 'Grupos · Jornada 1', stage: 'grupos', matchday: 1 },
  { key: 'g2', label: 'Grupos · Jornada 2', stage: 'grupos', matchday: 2 },
  { key: 'g3', label: 'Grupos · Jornada 3', stage: 'grupos', matchday: 3 },
  { key: 'r32', label: 'Dieciseisavos', stage: 'dieciseisavos' },
  { key: 'r16', label: 'Octavos', stage: 'octavos' },
  { key: 'qf', label: 'Cuartos', stage: 'cuartos' },
  { key: 'sf', label: 'Semifinales', stage: 'semifinales' },
  { key: 'tp', label: '3º y 4º puesto', stage: 'tercer_puesto' },
  { key: 'fin', label: 'Final', stage: 'final' },
];

// Which jornada each group of "puntos por clasificado" resolves on.
// (e.g. who reached octavos is known once dieciseisavos has been played)
export const QUALIFIER_JORNADA = {
  dieciseisavos: 'g3',
  octavos: 'r32',
  cuartos: 'r16',
  semifinales: 'qf',
  tercer_cuarto: 'sf',
  final: 'sf',
};

export const KNOCKOUT_JORNADA = {
  dieciseisavos: 'r32',
  octavos: 'r16',
  cuartos: 'qf',
  semifinales: 'sf',
  tercer_puesto: 'tp',
  final: 'fin',
};

// Group position + dieciseisavos qualifiers resolve at the end of the groups.
export const GROUP_BONUS_JORNADA = 'g3';
// Honors resolve with the final.
export const HONORS_JORNADA = 'fin';
