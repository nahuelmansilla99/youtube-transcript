# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifiestos e instalar dependencias de desarrollo y producción
COPY package*.json ./
RUN npm ci

# Copiar el código fuente y compilar TypeScript
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copiar manifiestos e instalar ÚNICAMENTE dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar la aplicación compilada desde la etapa anterior
COPY --from=builder /app/dist ./dist

# Asignar usuario sin privilegios por seguridad
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
