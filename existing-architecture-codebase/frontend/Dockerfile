# syntax=docker.io/docker/dockerfile:1

# ---------- Base Stage ----------
FROM node:18-alpine AS base

# Install necessary dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy only dependency-related files to leverage Docker caching
COPY package.json package-lock.json .npmrc* ./ 

# Install dependencies
RUN npm ci

# ---------- Builder Stage ----------
FROM base AS builder

WORKDIR /app

# Copy installed node_modules from the base stage
COPY --from=base /app/node_modules ./node_modules

# Copy the full project code
COPY . .

# Accept a build-time argument for NODE_ENV (default: production)
ENV NEXT_TELEMETRY_DISABLED=1
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Conditionally copy the appropriate .env file based on NODE_ENV
RUN if [ "$NODE_ENV" = "production" ]; then cp .env.production .env; \
    elif [ "$NODE_ENV" = "dev" ]; then cp .env.dev .env; \
    elif [ "$NODE_ENV" = "test" ]; then cp .env.test .env; \
    elif [ "$NODE_ENV" = "local" ]; then cp .env.local .env; \
    fi

# Build the project using the appropriate environment
RUN npm run build:${NODE_ENV}

# ---------- Runner Stage ----------
FROM node:18-alpine AS runner

WORKDIR /app

# Set environment variables for production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets and Next.js build output from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set the user to the non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "--optimize_for_size", "--no-warnings", "server.js"]