# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY tsconfig.json jest.config.js ./
COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json
COPY client/package.json client/package.json
# Install only the web workspace, not the API server packages.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --workspace=client --workspace=shared --include-workspace-root
COPY shared shared
COPY client client

FROM deps AS debug
WORKDIR /app/client
ENV NODE_ENV=development
ENV VITE_API_URL=http://localhost:3000/api/v1
ENV VITE_WS_URL=ws://localhost:3000/ws
EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]

FROM deps AS test
WORKDIR /app/client
ENV NODE_ENV=test
CMD ["npx", "jest", "src/game", "src/i18n.test.ts", "src/animations/cardPaint.test.ts", "--coverage=false", "--runInBand"]
