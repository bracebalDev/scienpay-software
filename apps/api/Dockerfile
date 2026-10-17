# Multi-stage Dockerfile para apps/api (NestJS) usando node:20-slim con soporte nativo glibc
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/
COPY apps/api/package*.json ./apps/api/

RUN npm install --workspace=@scienpay/shared --workspace=@scienpay/api --include-workspace-root

COPY tsconfig*.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm run build --workspace=@scienpay/shared
RUN npm run build --workspace=@scienpay/api

# Etapa 2: Runner de producción
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package*.json ./packages/shared/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package*.json ./apps/api/

USER appuser

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
