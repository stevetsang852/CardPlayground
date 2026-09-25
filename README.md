# CardPlayground

Local card playground: JP-style 5-card packs, KADO public catalog, Redis cache, Docker debug stack.

## Layout

```
backend/     Express + WS + local JSON DB
client/       Vite + React + Three.js pack cinematic
shared/       Draw odds + types
database/     Redis Dockerfile
.github/      ci.yml + catalog-sync.yml
```

## Quick start

```bash
npm install
cp backend/.env.example backend/.env
npm run dev:backend
npm run dev:client
```

```text
DATABASE_DRIVER=local
LOCAL_DB_PATH=./data/local-db.json
DEBUG_AUTH_BYPASS=true
DEBUG_PLAYER_ID=debug-player
KADO_SYNC_ON_START=true
KADO_SYNC_MAX_SETS=3
REDIS_URL=redis://127.0.0.1:6379
```

Docker:

```bash
docker compose up --build
# http://localhost:5173  API http://localhost:3000
```

## Card catalog (KADO / official HK)

Primary public pages (no `kado.hk/api/`):

- https://www.kado.hk/database
- https://www.kado.hk/database/tw
- fallback https://asia.pokemon-card.com/hk/card-search/

On boot the backend:

1. `syncKadoCatalog()` — up to `KADO_SYNC_MAX_SETS` sets, delay + timeout
2. `seedCardPool()` — writes snapshot cards (M6a 30th CELEBRATION) into `cardTemplates`

Check what loaded:

```bash
curl -H 'Authorization: Bearer dev' http://localhost:3000/api/v1/catalog/status
curl -H 'Authorization: Bearer dev' http://localhost:3000/api/v1/catalog/cards
curl -X POST -H 'Authorization: Bearer dev' -H 'content-type: application/json' \
  -d '{"force":true}' http://localhost:3000/api/v1/catalog/sync
```

Manual refresh:

```bash
npm run sync:catalog
```

Writes `backend/data/catalog-snapshot.json` + `local-db.json`.

### GitHub Action: daily download

`.github/workflows/catalog-sync.yml`

- cron `0 0 * * *` UTC (08:00 HKT) **only runs after this file is on `main`**
- `workflow_dispatch` for a manual run
- max 3 sets, polite delay, does not call `kado.hk/api/`
- live fetch failure does **not** fail the whole repo CI (`continue-on-error`)
- uploads artifact `catalog-snapshot`
- commits `backend/data/catalog-snapshot.json` if under 1.5 MB

Trigger now: Actions → catalog-sync → Run workflow.

## Pack odds

JP SV model: 5 cards = 3C + 1U/R + hit slot (UR/SAR/SR/AR/RR/R).
`GET /api/v1/cards/odds`  `POST /api/v1/cards/open-pack`

## Auth

`DEBUG_AUTH_BYPASS=true` uses `X-Player-Id` / `DEBUG_PLAYER_ID`.
Otherwise `POST /api/v1/auth/login` then `Authorization: Bearer`.

## Tests / CI

```bash
# pack odds
npx jest --workspace=shared src/drawing/ptcgPackOdds.test.ts --coverage=false
# frontend draw
npx jest --workspace=client src/game --coverage=false
# catalog parsers + snapshot
npx jest --workspace=backend src/catalog --coverage=false
```

`.github/workflows/ci.yml`

- `local-db` — Jest (odds, foil, local DB, auth, KADO parsers, snapshot)
- `docker` — build database / backend / frontend images

## License

Proprietary. Card names/set lists attributed to public KADO / TPC pages.
