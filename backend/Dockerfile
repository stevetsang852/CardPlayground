FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json backend/
COPY shared/package.json shared/
COPY client/package.json client/
RUN npm install
COPY shared shared
COPY backend backend

FROM deps AS debug
WORKDIR /app/backend
ENV NODE_ENV=development
ENV DATABASE_DRIVER=local
ENV LOCAL_DB_PATH=/app/backend/data/local-db.json
ENV REDIS_URL=redis://database:6379
ENV DEBUG_AUTH_BYPASS=true
ENV KADO_SYNC_ON_START=true
EXPOSE 3000
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "-r", "tsconfig-paths/register", "src/index.ts"]

FROM deps AS test
WORKDIR /app/backend
ENV NODE_ENV=test
ENV DATABASE_DRIVER=local
ENV DEBUG_AUTH_BYPASS=false
ENV REDIS_URL=redis://database:6379
CMD ["npx", "jest", "--coverage=false", "--runInBand"]
