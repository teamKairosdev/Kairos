# Stage 1: Build Kairos Nuxt 4 SSR Bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package.json ./
RUN npm install

# Copy application source files
COPY . .

# Build Nuxt 4 production bundle
RUN npm run build

# Stage 2: Production Single Container Runner
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy built outputs and dependencies from builder stage
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
