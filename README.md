# 🏆 Porra del Mundial 2026

App web para seguir la porra del Mundial 2026: calcula la **clasificación general**
y **por jornada** aplicando el sistema de puntuación oficial de la porra, leyendo
los resultados reales desde una API de fútbol.

- **13 participantes**, todas sus apuestas (grupos, posiciones, eliminatorias y cuadro de honor).
- **Motor de puntuación** completo (probado con `npm test`).
- **Resultados automáticos** desde [football-data.org](https://www.football-data.org/).
- Web estática (React + Vite): se despliega en GitHub Pages, Vercel, Netlify…

## Puesta en marcha

```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm run build      # genera dist/ para producción
npm run preview    # sirve el build
```

## Resultados automáticos (API)

1. Crea una cuenta gratis en https://www.football-data.org/client/register y copia tu token.
2. Descarga los resultados (genera `public/results.json` ya traducido a los códigos de la porra):

```bash
FOOTBALL_DATA_TOKEN=tu_token npm run fetch:results
# competición distinta:  node scripts/fetch-results.mjs --token tu_token --competition WC
```

3. Vuelve a desplegar (o recarga en local). La app lee `public/results.json` en cada carga,
   así que puedes refrescar resultados sin recompilar: re-ejecuta el script y publica el JSON.

### Actualización "casi en vivo" (función serverless)

Desplegada en Vercel, la web pide los resultados a `/api/results` (función serverless en
[`api/results.js`](api/results.js)), que llama a la API **en el servidor** (el token nunca
llega al navegador) y cachea la respuesta ~2 min. Así la web se actualiza sola al abrirla,
sin esperar a un nuevo despliegue. Si esa función falla, la app cae automáticamente al
`public/results.json` estático (que el cron mantiene fresco). Solo necesita la variable
`FOOTBALL_DATA_TOKEN` en Vercel; no hay que configurar nada más.

> El plan gratuito de football-data.org puede no cubrir todas las competiciones. Si recibes
> un error 403/404, prueba otro código de competición con `--competition`. El script avisa de
> cualquier equipo de la API que no haya sabido mapear.

### ⚠️ Importante: confirmar los códigos de equipo

La porra usa códigos propios (MXC, RPC, BGC…). El mapeo a equipos reales está en
[`src/data/teams.js`](src/data/teams.js), ya confirmado con el organizador e incluye el código
FIFA (`fifa`) de cada equipo para emparejar contra la API. Si algún equipo de la API no se
mapea, el script de descarga lo avisa y basta con añadir un alias en ese fichero.

## Desplegar en Vercel

La app es estática, así que va perfecta en Vercel:

1. En https://vercel.com → **Add New → Project** → importa el repo `porraMundial`.
2. Vercel detecta el preset **Vite** y usa `vercel.json` (build `npm run build:vercel`, salida `dist`). No hay que tocar nada.
3. En **Settings → Environment Variables** añade:
   - `FOOTBALL_DATA_TOKEN` = tu token de football-data.org
   - (opcional) `FOOTBALL_DATA_COMPETITION` = `WC`
4. **Deploy**. En cada despliegue se descargan los resultados y se reconstruye la web.

> El token va **solo** como variable de entorno en Vercel, nunca en el repositorio.
> Si la descarga falla (token mal, red, plan), el build no se rompe: se publica con
> el último `public/results.json` disponible.

### Refresco automático (GitHub Action)

Para que los resultados se actualicen solos durante el Mundial, el repo incluye
`.github/workflows/refresh-resultados.yml`, que cada 2 horas dispara un **Deploy Hook**
de Vercel (Vercel reconstruye y vuelve a descargar los resultados). Configúralo así:

1. **Vercel** → tu proyecto → **Settings → Git → Deploy Hooks** → crea uno:
   - Nombre: `refresh` · Rama: `main` → **Create Hook** y copia la URL.
2. **GitHub** → repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `VERCEL_DEPLOY_HOOK_URL` · Value: la URL del paso anterior.
3. Listo. Puedes lanzarlo a mano en **Actions → Refrescar resultados → Run workflow**, o esperar al cron.

> Ajusta la frecuencia editando el `cron` del workflow (formato en https://crontab.guru).
> Las Actions programadas se ejecutan desde la **rama por defecto** del repo (deja `main` como default).

## Entrada manual (alternativa)

`public/results.json` se puede editar a mano con el mismo formato que genera el script.
Todos los equipos van con los códigos de la porra:

```jsonc
{
  "groupMatches": { "MXC-SDF": { "h": 3, "a": 0, "matchday": 1 } },
  "groupStandings": { "A": ["MXC", "RPC", "CDS", "SDF"] },      // posiciones 1º..4º
  "qualified": {
    "dieciseisavos": ["MXC", "..."],   // equipos que alcanzan cada ronda
    "octavos": [], "cuartos": [], "semifinales": [],
    "tercer_cuarto": [], "final": []
  },
  "knockoutResults": {
    "dieciseisavos": [ { "home": "MXC", "away": "CND", "h": 2, "a": 1 } ],
    "octavos": [], "cuartos": [], "semifinales": [],
    "tercer_puesto": [], "final": []
  },
  "honors": {
    "campeon": "SPN", "subcampeon": null, "tercero": null,
    "botaOro": "Mbappé", "botaPlata": null, "botaBronce": null,
    "balonOro": null, "mejorPortero": null
  }
}
```

Los premios individuales (Bota de Oro/Plata/Bronce, Balón de Oro, Mejor portero) no vienen en
la API, así que se rellenan a mano en `honors`. La comparación de nombres ignora mayúsculas y tildes.

## Sistema de puntuación

**Puntos por partido** (acumulativos: el resultado exacto también suma signo y diferencia):

| Fase | Signo | Diferencia | Exacto |
|---|---|---|---|
| Grupos | 3 | 1 | 3 |
| Dieciseisavos | 6 | 2 | 6 |
| Octavos | 6 | 2 | 6 |
| Cuartos | 9 | 3 | 9 |
| Semifinales | 12 | 4 | 12 |
| 3º-4º y Final | 15 | 5 | 15 |

- Desde dieciseisavos solo se puntúa un partido si se aciertan **los dos equipos** del cruce.
- **Posición exacta de grupo**: 2 puntos por cada equipo colocado en su posición final.
- **Puntos por clasificado**: 5 (16avos), 10 (octavos), 15 (cuartos), 20 (semis), 25 (3º-4º), 25 (final).
- **Puntos extra**: Campeón 1000, Subcampeón 50, 3º 25, Bota Oro 25 / Plata 15 / Bronce 10,
  Balón de Oro 25, Mejor portero 25.

> El PDF no indicaba el valor de octavos ni si los puntos eran acumulativos; ambos se fijaron
> según lo decidido por el organizador (octavos = 6/2/6, puntuación acumulativa).

## Estructura

```
src/
  data/
    predictions.json   # apuestas (generado desde el PDF, no editar a mano)
    teams.js           # códigos de la porra -> equipos reales (revisar los marcados)
  scoring/
    config.js          # tablas de puntos y jornadas
    engine.js          # motor de cálculo
  services/results.js  # carga results.json
  components/           # vistas (general, jornada, detalle, partidos)
scripts/
  parse-predictions.mjs # PDF -> predictions.json
  fetch-results.mjs     # API -> public/results.json
  test-engine.mjs       # tests del motor
data-source/            # texto extraído de los PDF originales
```

Para regenerar las apuestas desde el PDF: `npm run parse`.
