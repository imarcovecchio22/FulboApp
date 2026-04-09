FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/prisma ./src/prisma
COPY --from=builder /app/node_modules ./node_modules

# Install playwright browsers for scraping fallback
RUN npx playwright install chromium --with-deps 2>/dev/null || true

EXPOSE 3001
CMD ["node", "dist/index.js"]
