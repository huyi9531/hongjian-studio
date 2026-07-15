FROM node:22-slim AS build

WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production \
    PORT=12398 \
    DATABASE_URL=file:./data/hongjian.db \
    DATA_DIR=./data
COPY --from=build /app/package.json ./
COPY --from=build /app/server.mjs ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN mkdir -p data
EXPOSE 12398
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:12398/login').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/server/server.js"]
