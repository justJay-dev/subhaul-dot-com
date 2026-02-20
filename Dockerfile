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

# Build the Astro site
RUN bun run build

# Production image - serve with nginx
FROM nginx:alpine AS runner

ARG SEARCH_ENGINE_NOINDEX=false

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Configure optional noindex header for non-production deployments
RUN if [ "$SEARCH_ENGINE_NOINDEX" = "true" ]; then \
    printf 'add_header X-Robots-Tag "noindex, nofollow, noarchive" always;\n' > /etc/nginx/conf.d/noindex.conf; \
    else \
    : > /etc/nginx/conf.d/noindex.conf; \
    fi

# Configure optional robots.txt override for non-production deployments
RUN if [ "$SEARCH_ENGINE_NOINDEX" = "true" ]; then \
    printf 'location = /robots.txt {\n    default_type text/plain;\n    return 200 "User-agent: *\\nDisallow: /\\n";\n}\n' > /etc/nginx/conf.d/robots-override.conf; \
    else \
    : > /etc/nginx/conf.d/robots-override.conf; \
    fi

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 4321
EXPOSE 4322

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
