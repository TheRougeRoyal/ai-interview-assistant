# Multi-stage Dockerfile for Next.js + Prisma
FROM node:20-alpine AS base
WORKDIR /app

ENV NODE_ENV=production

FROM base AS deps
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; else npm i --legacy-peer-deps; fi

FROM deps AS build
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV PORT=3000
EXPOSE 3000

# Copy node_modules and built app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.js ./next.config.js
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma

# Ensure Prisma Client is present in runtime image
RUN npx prisma generate

CMD sh -c "npx prisma migrate deploy && npm run start"
