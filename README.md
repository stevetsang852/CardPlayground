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

## Technology Stack

### Backend
- Node.js + TypeScript + Express
- WebSocket (`ws`)
- **Database (default): local JSON file** — `backend/data/local-db.json`
- Optional: Firebase Firestore (`DATABASE_DRIVER=firestore`)
- Optional cache: Redis (skipped if Redis is down)
- Jest + fast-check

### Client
- Vite, Three.js, GSAP
- Firebase Auth still optional for production identity

## Setup

Prerequisites: Node.js 18+. Redis and Firebase are **not** required for local play.

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

Data survives backend restarts in that JSON file. Delete the file to reset.

To use Firestore later:

```text
DATABASE_DRIVER=firestore
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

## Auth

Game APIs (`/cards`, `/synthesis`, `/events`, `/social`, `/market`, `/achievements`, `/season`, `/assets`) require auth.

**Debug bypass** (`DEBUG_AUTH_BYPASS=true`): no auth verification. Player id comes from `X-Player-Id` or `DEBUG_PLAYER_ID`.

**Token mode** (`DEBUG_AUTH_BYPASS=false`):

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"playerId":"p1","secret":"cardplayground-local-dev-secret"}'
```

Use `Authorization: Bearer TOKEN_FROM_LOGIN` on later calls. Firebase ID tokens still work if Firebase Admin is initialized.

`GET /api/v1/auth/status` shows whether bypass is on.

## Client asset check

Server inventory is the source of truth. Client sends the card ids it thinks it owns:

```bash
curl -X POST http://localhost:3000/api/v1/assets/verify \
  -H 'Authorization: Bearer TOKEN_FROM_LOGIN' \
  -H 'content-type: application/json' \
  -d '{"cardIds":["c1","c2"]}'
```

Response:

- `valid` — false if the client reports cards the server does not have
- `extraOnClient` — suspected extra / tampered cards
- `missingOnClient` — server cards the client omitted
- `serverCardIds` — authoritative list

## Testing

```bash
npm test
```

## API
- REST: `http://localhost:3000/api/v1`
- WebSocket: `ws://localhost:3000/ws`

## License

Proprietary - All rights reserved
