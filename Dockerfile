# Multi-stage Dockerfile para despliegue Fullstack en Fly.io
FROM node:20-slim AS builder

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

RUN npm install --include-workspace-root

# Copiar código fuente
COPY tsconfig*.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Compilar contratos compartidos, backend y frontend SPA
RUN npm run build --workspace=@scienpay/shared
RUN npm run build --workspace=@scienpay/api
RUN npm run build --workspace=@scienpay/web

# Etapa 2: Runner de producción
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package*.json ./packages/shared/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package*.json ./apps/api/
COPY --from=builder /app/apps/api/dist/infrastructure/database/migrations ./apps/api/dist/infrastructure/database/migrations
COPY --from=builder /app/apps/web/dist ./apps/web/dist

USER appuser

EXPOSE 8080

CMD ["sh", "-c", "node apps/api/dist/infrastructure/database/migrate.js && node apps/api/dist/infrastructure/database/seed.js && node apps/api/dist/main.js"]
