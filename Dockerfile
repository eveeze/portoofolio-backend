# ---- Base ----
# Use a specific version for reproducibility
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# ---- Dependencies ----
# Copy only package files and install dependencies using npm ci for faster, more reliable builds
FROM base AS dependencies
COPY package.json package-lock.json* ./
# Use npm ci for clean installs in CI/CD environments
RUN npm ci

# ---- Builder ----
# Copy source code and build the project
FROM base AS builder
# Copy dependencies from the 'dependencies' stage
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
# Copy the rest of the application source code
COPY . .
# Run the build script
RUN npm run build

# ---- Runner ----
# Create the final, small production image
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

# Create a non-root user for better security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only the necessary production artifacts from previous stages
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./

# Switch to the non-root user
USER appuser

# Expose the application port
EXPOSE 5001

# CORRECTED: Point to the correct entrypoint file inside the 'dist/src' directory
CMD ["node", "dist/src/index.js"]
