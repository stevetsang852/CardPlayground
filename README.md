# Card Mystery Realm (卡片秘境)

A card collection game with gacha mechanics, synthesis systems, random events, and social features.

## Project Structure

```
card-mystery-realm/
├── backend/          # Backend server (Express + WebSocket)
├── client/           # Client application (Vite + Three.js)
├── shared/           # Shared type definitions
└── .kiro/            # Kiro spec files
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

Run backend server:
```bash
npm run dev:backend
```

Run client development server:
```bash
npm run dev:client
```

### Testing

Run all tests:
```bash
npm test
```

Run tests for specific workspace:
```bash
npm test -w backend
npm test -w client
npm test -w shared
```

### Building

Build all packages:
```bash
npm run build
```

## Architecture

### Backend Services
- **Card Drawing Service**: Manages pack purchases and card generation
- **Card Synthesis Service**: Handles card combination and upgrades
- **Random Event Service**: Triggers and manages special events
- **Social Service**: Manages galleries, likes, comments, and leaderboards
- **Trading Market Service**: Handles card trading and market dynamics
- **Achievement Service**: Tracks and rewards player accomplishments
- **Season Service**: Manages seasonal content and battle pass

### API Endpoints
- REST API: `http://localhost:3000/api/v1`
- WebSocket: `ws://localhost:3000/ws`

### Database Collections
- `players`: Player profiles and state
- `cards`: Card instances
- `card_templates`: Card definitions
- `pack_configurations`: Pack types and probabilities
- `galleries`: Player card displays
- `market_listings`: Active market listings
- `achievements`: Achievement definitions
- `seasons`: Season configurations
- `active_events`: Currently active events
- `missions`: Daily and weekly missions

## Features

### Core Systems
- **Gacha System**: Multiple pack types with configurable probabilities
- **Pity System**: Guaranteed drops after unsuccessful attempts
- **Luck Value**: Hidden mechanic that increases drop rates
- **Card Synthesis**: Combine cards with varying success rates
- **Random Events**: Mysterious Merchant, Card Storm, Lucky Moment, Copy Miracle
- **Social Features**: Galleries, likes, comments, leaderboards
- **Trading Market**: Player-to-player card trading with dynamic pricing
- **Achievements**: Collection, rarity, social, and secret achievements
- **Seasons**: Time-limited content with battle pass progression
- **Daily Missions**: Engagement mechanics with rewards

### Technical Features
- **Server Authority**: All game logic validated server-side
- **Deterministic RNG**: Synchronized random generation
- **Real-time Updates**: WebSocket-based live updates
- **Caching**: Redis caching for performance
- **Error Recovery**: Automatic retry and refund mechanisms
- **Property-Based Testing**: Comprehensive test coverage

## License

Proprietary - All rights reserved
