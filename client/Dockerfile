FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY tsconfig.json jest.config.js ./
COPY backend/package.json backend/
COPY shared/package.json shared/
COPY client/package.json client/
RUN npm install
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
CMD ["npx", "jest", "src/game", "--coverage=false", "--runInBand"]
