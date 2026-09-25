FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json backend/
COPY shared/package.json shared/
COPY client/package.json client/
RUN npm install --ignore-scripts --workspace backend --workspace shared --omit=dev || npm install
COPY shared shared
COPY backend backend
WORKDIR /app/backend
EXPOSE 3000
CMD ["npx", "ts-node-dev", "--transpile-only", "-r", "tsconfig-paths/register", "src/index.ts"]
