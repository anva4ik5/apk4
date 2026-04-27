# Dockerfile for Railway deployment
# Build cache reset: v4 - copy all files before npm ci

FROM node:20-alpine AS builder

WORKDIR /app

# Copy all files at once to avoid cache issues
COPY . .

# Install dependencies
RUN npm ci

# Build TypeScript
RUN npx tsc -p packages/server/tsconfig.json
RUN npx tsc -p packages/shared/tsconfig.json

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/shared/package*.json ./packages/shared/

# Install only production dependencies
RUN npm ci --production=only

# Copy built files from builder
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start server
CMD ["node", "packages/server/dist/index.js"]
