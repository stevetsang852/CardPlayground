# CardPlayground

Formerly *Card Mystery Realm (卡片秘境)*. A card collection playground with gacha mechanics, synthesis, random events, and social features.

GitHub repo name is still `test1` until renamed in GitHub Settings → General → Repository name → `CardPlayground`.

## Project Structure

```
CardPlayground/
├── backend/          # Backend server (Express + WebSocket)
├── client/           # Client application (Vite + Three.js)
├── shared/           # Shared type definitions
└── .kiro/            # Spec files
```

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **WebSocket**: ws library
- **Database**: Firebase Firestore
- **Cache**: Redis
- **Testing**: Jest + fast-check

### Client
- **Build Tool**: Vite
- **3D Graphics**: Three.js
- **Animation**: GSAP
- **Auth**: Firebase Authentication
- **Testing**: Jest + fast-check

### Shared
- **Language**: TypeScript
- **Purpose**: Shared type definitions and utilities

## Setup

### Prerequisites
- Node.js 18+
- Redis server
- Firebase project with Firestore enabled

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Configure environment variables:
   - Copy `backend/.env.example` to `backend/.env`
   - Copy `client/.env.example` to `client/.env`
   - Fill in your Firebase and Redis credentials

4. Set up Firebase:
   - Download your Firebase service account key
   - Place it in `backend/serviceAccountKey.json`

### Development

```bash
npm run dev:backend
npm run dev:client
```

### Testing

```bash
npm test
npm test -w backend
npm test -w client
npm test -w shared
```

### Building

```bash
npm run build
```

## Architecture

### Backend Services
- **Card Drawing Service**: pack purchases and card generation
- **Card Synthesis Service**: combination and upgrades
- **Random Event Service**: special events
- **Social Service**: galleries, likes, comments, leaderboards
- **Trading Market Service**: card trading
- **Achievement Service**: player accomplishments
- **Season Service**: seasonal content and battle pass

### API Endpoints
- REST API: `http://localhost:3000/api/v1`
- WebSocket: `ws://localhost:3000/ws`

### Database Collections
- `players`, `cards`, `card_templates`, `pack_configurations`
- `galleries`, `market_listings`, `achievements`, `seasons`
- `active_events`, `missions`

## Features

- Gacha + pity + luck value
- Card synthesis
- Random events
- Social galleries and leaderboards
- Trading market
- Achievements and seasons
- Server-authoritative game logic
- WebSocket live updates
- Redis cache
- Property-based tests

## License

Proprietary - All rights reserved
