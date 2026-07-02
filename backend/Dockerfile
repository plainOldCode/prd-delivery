# ==============================
# Stage 1: Install dependencies
# ==============================
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# ==============================
# Stage 2: Build
# ==============================
FROM oven/bun:1 AS build
WORKDIR /app

# Copy dependency layer from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY tsconfig.json .env.template ./
COPY src/ ./src/

# Build TypeScript → JavaScript with Bun bundler
RUN bun run build

# ==============================
# Stage 3: Production runtime
# ==============================
FROM oven/bun:1-slim AS runtime
WORKDIR /app

# Copy built output from build stage
COPY --from=build /app/dist ./dist/
COPY --from=build /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

# Set production environment
ENV NODE_ENV=production

# Expose server port (matches src/index.ts)
EXPOSE 3000

# Health check — probes /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --startperiod=20s --retries=3 \
  CMD bun run curl -f http://localhost:3000/api/health || exit 1

# Run with Bun production runtime (no watcher)
CMD ["bun", "run", "start"]
