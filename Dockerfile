# ==========================================
# STAGE 1: Build Frontend Assets
# ==========================================
FROM node:24-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy configurations and install dependencies
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build static bundle
COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Build Backend Services
# ==========================================
FROM node:24-alpine AS backend-builder
WORKDIR /app/backend

# Copy configurations and install dependencies
COPY backend/package*.json ./
RUN npm install

# Copy source and build TypeScript to JS
COPY backend/src ./src
COPY backend/tsconfig.json ./
COPY backend/drizzle.config.ts ./
RUN npm run build

# ==========================================
# STAGE 3: Production Runner Container
# ==========================================
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Copy backend dependencies and compiled JS
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/dist ./backend/dist

# Install production-only dependencies to minimize container footprint
WORKDIR /app/backend
RUN npm install --omit=dev

# Copy static reference databases
COPY backend/data/cities.json ./data/
COPY backend/data/polygons.json ./data/

# Copy built frontend assets to the correct relative path
WORKDIR /app
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port and configure persistent SQLite volumes
EXPOSE 8080
ENV DATABASE_DIR=/app/database
VOLUME [ "/app/database" ]

# Set working directory back to backend for starting execution
WORKDIR /app/backend
CMD [ "npm", "start" ]
