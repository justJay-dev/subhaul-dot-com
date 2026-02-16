# Use Bun image for building
FROM oven/bun:1.3.6 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate X-to-Y pages before build
RUN bun run generate:x-to-y

# Build the Astro site
RUN bun run build

# Production image - serve with nginx
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 4321
EXPOSE 4321

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
