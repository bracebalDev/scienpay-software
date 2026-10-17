# Multi-stage Dockerfile para apps/web (React + Vite + Nginx)
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar todos los package.json para que npm resuelva workspaces correctamente
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

RUN npm install --workspace=@scienpay/shared --workspace=@scienpay/web --include-workspace-root

COPY tsconfig*.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN npm run build --workspace=@scienpay/shared
RUN npm run build --workspace=@scienpay/web

# Etapa 2: Servidor Nginx ligero
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

RUN echo 'server { \
  listen 80; \
  server_name localhost; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
