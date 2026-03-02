# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

# Copy production deps and source
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/

# Copy Project A service account (read-only access to safedrain-b50e8 Firestore)
# Project B credentials come from Application Default Credentials (Cloud Run IAM)
COPY safedrain-b50e8-firebase-adminsdk-fbsvc-c2b87409f7.json ./

# Cloud Run injects PORT=8080; our server reads process.env.PORT
ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "src/server.js"]
