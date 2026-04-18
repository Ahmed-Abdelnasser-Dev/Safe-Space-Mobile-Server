FROM node:22-bookworm-slim AS deps

WORKDIR /app

# Install openssl + ca-certs for Prisma/query engine
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM deps AS build

COPY tsconfig.json tsconfig.typecheck.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run prisma:generate
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Non-root
RUN useradd -m -u 10001 appuser
USER appuser

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:deploy && node dist/server.js"]

