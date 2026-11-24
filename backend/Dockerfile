FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
RUN apk add --no-cache tzdata
ENV TZ=Asia/Jerusalem
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
EXPOSE 8080
ENV DATABASE_DIR=/app/database
VOLUME [ "/app/database" ]
CMD [ "node", "--max-old-space-size=192", "dist/index.js" ]
