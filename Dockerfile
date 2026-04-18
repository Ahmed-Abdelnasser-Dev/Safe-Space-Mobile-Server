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
RUN useradd -m -u 10001 appuser \
  && mkdir -p /app/uploads \
  && chown -R appuser:appuser /app
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --retries=20 CMD node -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npm run prisma:deploy && node dist/server.js"]

