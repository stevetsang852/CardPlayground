# CardPlayground

Card collection playground with gacha, synthesis, random events, and social features.

## Project Structure

```
CardPlayground/
├── backend/          # Express + WebSocket
├── client/           # Vite + Three.js
├── shared/           # Shared types
└── .kiro/            # Spec files
```

## Setup

```bash
npm run install:all
cp backend/.env.example backend/.env
npm run dev:backend
npm run dev:client
```

```text
DATABASE_DRIVER=local
LOCAL_DB_PATH=./data/local-db.json
DEBUG_AUTH_BYPASS=true
DEBUG_PLAYER_ID=debug-player
AUTH_SECRET=cardplayground-local-dev-secret
```

## Auth

Game APIs (`/cards`, `/synthesis`, `/events`, `/social`, `/market`, `/achievements`, `/season`, `/assets`) require auth.

**Debug bypass** (`DEBUG_AUTH_BYPASS=true`): no Bearer token. Player id comes from `X-Player-Id` or `DEBUG_PLAYER_ID`.

**Token mode** (`DEBUG_AUTH_BYPASS=false`):

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"playerId":"p1","secret":"cardplayground-local-dev-secret"}'
```

Use `Authorization: Bearer <token>` on later calls. Firebase ID tokens still work if Firebase Admin is initialized.

`GET /api/v1/auth/status` shows whether bypass is on.

## Client asset check

Server inventory is the source of truth. Client sends the card ids it thinks it owns:

```bash
curl -X POST http://localhost:3000/api/v1/assets/verify \
  -H 'Authorization: Bearer <token>' \
  -H 'content-type: application/json' \
  -d '{"cardIds":["c1","c2"]}'
```

Response:

- `valid` — false if the client reports cards the server does not have
- `extraOnClient` — suspected extra / tampered cards
- `missingOnClient` — server cards the client omitted
- `serverCardIds` — authoritative list

## API

- REST: `http://localhost:3000/api/v1`
- WebSocket: `ws://localhost:3000/ws`

## License

Proprietary - All rights reserved
