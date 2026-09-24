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

Default env:

```text
DATABASE_DRIVER=local
LOCAL_DB_PATH=./data/local-db.json
```

Data survives backend restarts in that JSON file. Delete the file to reset.

To use Firestore later:

```text
DATABASE_DRIVER=firestore
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

## Testing

```bash
npm test
```

## API

- REST: `http://localhost:3000/api/v1`
- WebSocket: `ws://localhost:3000/ws`

## License

Proprietary - All rights reserved
