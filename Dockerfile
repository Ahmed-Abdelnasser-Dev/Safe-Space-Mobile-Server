ARG NODE_IMAGE=node:22.12.0-bookworm-slim@sha256:35531c52ce27b6575d69755c73e65d4468dba93a25644eed56dc12879cae9213

FROM ${NODE_IMAGE} AS base

WORKDIR /app

# Install openssl + ca-certs for Prisma/query engine
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM deps AS dev

ENV NODE_ENV=development

COPY tsconfig.json tsconfig.typecheck.json ./
COPY prisma ./prisma
COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "dev"]

FROM deps AS build

COPY tsconfig.json tsconfig.typecheck.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run prisma:generate
RUN npm run build

FROM ${NODE_IMAGE} AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates dumb-init \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 10001 appgroup \
  && useradd --uid 10001 --gid appgroup --create-home appuser

COPY --chown=appuser:appgroup package.json package-lock.json ./
COPY --chown=appuser:appgroup prisma ./prisma
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/dist ./dist

RUN mkdir -p /app/uploads && chown appuser:appgroup /app/uploads
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --retries=20 CMD node -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npm run prisma:deploy && node dist/server.js"]

