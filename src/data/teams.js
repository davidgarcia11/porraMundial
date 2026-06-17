// Mapping from the porra's custom 3-letter codes to real teams.
//
// `name`  -> display name (Spanish)
// `fifa`  -> 3-letter code used to match against the results API (football-data
//            exposes `tla`). Used by scripts/fetch-results.mjs.
// `aliases` -> extra name strings the API might use, for fuzzy matching.
// `confident` -> false when the decoding of the porra code is a guess. These
//            MUST be reviewed by the organiser before trusting automatic
//            results, otherwise scoring against the API will be wrong.
//
// Grouped by the group each team belongs to in the porra (A..L).

export const TEAMS = {
  // Grupo A
  MXC: { name: 'México', fifa: 'MEX', group: 'A', confident: true },
  RPC: { name: 'República Checa', fifa: 'CZE', group: 'A', confident: true, aliases: ['Czech Republic', 'Czechia', 'Chequia'] },
  CDS: { name: 'Corea del Sur', fifa: 'KOR', group: 'A', confident: true, aliases: ['South Korea', 'Korea Republic', 'Republic of Korea'] },
  SDF: { name: 'Sudáfrica', fifa: 'RSA', group: 'A', confident: true, aliases: ['South Africa'] },

  // Grupo B
  SZA: { name: 'Suiza', fifa: 'SUI', group: 'B', confident: true, aliases: ['Switzerland'] },
  BYH: { name: 'Bosnia y Herzegovina', fifa: 'BIH', group: 'B', confident: true, aliases: ['Bosnia-Herzegovina', 'Bosnia and Herzegovina'] },
  CND: { name: 'Canadá', fifa: 'CAN', group: 'B', confident: true, aliases: ['Canada'] },
  CTR: { name: 'Catar', fifa: 'QAT', group: 'B', confident: true, aliases: ['Qatar'] },

  // Grupo C
  MRC: { name: 'Marruecos', fifa: 'MAR', group: 'C', confident: true, aliases: ['Morocco'] },
  BRS: { name: 'Brasil', fifa: 'BRA', group: 'C', confident: true, aliases: ['Brazil'] },
  ESC: { name: 'Escocia', fifa: 'SCO', group: 'C', confident: true, aliases: ['Scotland'] },
  'Haití': { name: 'Haití', fifa: 'HAI', group: 'C', confident: true, aliases: ['Haiti'] },

  // Grupo D
  TUR: { name: 'Turquía', fifa: 'TUR', group: 'D', confident: true, aliases: ['Turkey', 'Türkiye', 'Turkiye'] },
  PGY: { name: 'Paraguay', fifa: 'PAR', group: 'D', confident: true },
  EEU: { name: 'Estados Unidos', fifa: 'USA', group: 'D', confident: true, aliases: ['United States'] },
  AUS: { name: 'Australia', fifa: 'AUS', group: 'D', confident: true },

  // Grupo E
  ALM: { name: 'Alemania', fifa: 'GER', group: 'E', confident: true, aliases: ['Germany'] },
  ECU: { name: 'Ecuador', fifa: 'ECU', group: 'E', confident: true },
  CDM: { name: 'Costa de Marfil', fifa: 'CIV', group: 'E', confident: true, aliases: ['Ivory Coast', "Côte d'Ivoire", 'Cote d Ivoire'] },
  CRZ: { name: 'Curaçao', fifa: 'CUW', group: 'E', confident: true, aliases: ['Curazao', 'Curacao'] },

  // Grupo F
  HOL: { name: 'Países Bajos', fifa: 'NED', group: 'F', confident: true, aliases: ['Holanda', 'Netherlands'] },
  JPN: { name: 'Japón', fifa: 'JPN', group: 'F', confident: true, aliases: ['Japan'] },
  TNZ: { name: 'Túnez', fifa: 'TUN', group: 'F', confident: true, aliases: ['Tunisia'] },
  SUE: { name: 'Suecia', fifa: 'SWE', group: 'F', confident: true, aliases: ['Sweden'] },

  // Grupo G
  BGC: { name: 'Bélgica', fifa: 'BEL', group: 'G', confident: true, aliases: ['Belgium'] },
  EGP: { name: 'Egipto', fifa: 'EGY', group: 'G', confident: true, aliases: ['Egypt'] },
  IRN: { name: 'Irán', fifa: 'IRN', group: 'G', confident: true, aliases: ['Iran'] },
  NZL: { name: 'Nueva Zelanda', fifa: 'NZL', group: 'G', confident: true, aliases: ['New Zealand'] },

  // Grupo H
  SPN: { name: 'España', fifa: 'ESP', group: 'H', confident: true, aliases: ['Spain'] },
  URU: { name: 'Uruguay', fifa: 'URU', group: 'H', confident: true },
  ARS: { name: 'Arabia Saudí', fifa: 'KSA', group: 'H', confident: true, aliases: ['Saudi Arabia'] },
  CVE: { name: 'Cabo Verde', fifa: 'CPV', group: 'H', confident: true, aliases: ['Cape Verde'] },

  // Grupo I
  FRN: { name: 'Francia', fifa: 'FRA', group: 'I', confident: true, aliases: ['France'] },
  SNG: { name: 'Senegal', fifa: 'SEN', group: 'I', confident: true },
  NOR: { name: 'Noruega', fifa: 'NOR', group: 'I', confident: true, aliases: ['Norway'] },
  IRK: { name: 'Irak', fifa: 'IRQ', group: 'I', confident: true, aliases: ['Iraq'] },

  // Grupo J
  ARG: { name: 'Argentina', fifa: 'ARG', group: 'J', confident: true },
  ATR: { name: 'Austria', fifa: 'AUT', group: 'J', confident: true },
  AGL: { name: 'Argelia', fifa: 'ALG', group: 'J', confident: true, aliases: ['Algeria'] },
  JRD: { name: 'Jordania', fifa: 'JOR', group: 'J', confident: true, aliases: ['Jordan'] },

  // Grupo K
  PTG: { name: 'Portugal', fifa: 'POR', group: 'K', confident: true },
  CLM: { name: 'Colombia', fifa: 'COL', group: 'K', confident: true },
  UZB: { name: 'Uzbekistán', fifa: 'UZB', group: 'K', confident: true, aliases: ['Uzbekistan'] },
  CNG: { name: 'RD Congo', fifa: 'COD', group: 'K', confident: true, aliases: ['DR Congo', 'Congo DR', 'Democratic Republic of the Congo', 'Congo'] },

  // Grupo L
  CRO: { name: 'Croacia', fifa: 'CRO', group: 'L', confident: true, aliases: ['Croatia'] },
  ING: { name: 'Inglaterra', fifa: 'ENG', group: 'L', confident: true, aliases: ['England'] },
  GHA: { name: 'Ghana', fifa: 'GHA', group: 'L', confident: true },
  PAN: { name: 'Panamá', fifa: 'PAN', group: 'L', confident: true, aliases: ['Panama'] },
};

// Bandera de cada selección (emoji). Escocia e Inglaterra usan los emojis de
// subdivisión del Reino Unido.
export const FLAGS = {
  MXC: '🇲🇽', RPC: '🇨🇿', CDS: '🇰🇷', SDF: '🇿🇦',
  SZA: '🇨🇭', BYH: '🇧🇦', CND: '🇨🇦', CTR: '🇶🇦',
  MRC: '🇲🇦', BRS: '🇧🇷', ESC: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Haití': '🇭🇹',
  TUR: '🇹🇷', PGY: '🇵🇾', EEU: '🇺🇸', AUS: '🇦🇺',
  ALM: '🇩🇪', ECU: '🇪🇨', CDM: '🇨🇮', CRZ: '🇨🇼',
  HOL: '🇳🇱', JPN: '🇯🇵', TNZ: '🇹🇳', SUE: '🇸🇪',
  BGC: '🇧🇪', EGP: '🇪🇬', IRN: '🇮🇷', NZL: '🇳🇿',
  SPN: '🇪🇸', URU: '🇺🇾', ARS: '🇸🇦', CVE: '🇨🇻',
  FRN: '🇫🇷', SNG: '🇸🇳', NOR: '🇳🇴', IRK: '🇮🇶',
  ARG: '🇦🇷', ATR: '🇦🇹', AGL: '🇩🇿', JRD: '🇯🇴',
  PTG: '🇵🇹', CLM: '🇨🇴', UZB: '🇺🇿', CNG: '🇨🇩',
  CRO: '🇭🇷', ING: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', GHA: '🇬🇭', PAN: '🇵🇦',
};

export const teamName = (code) => TEAMS[code]?.name ?? code;
export const teamFlag = (code) => FLAGS[code] ?? '';
export const groupOf = (code) => TEAMS[code]?.group ?? null;

// codes whose decoding still needs confirmation by the organiser
export const UNCONFIRMED_CODES = Object.entries(TEAMS)
  .filter(([, t]) => !t.confident)
  .map(([code]) => code);
