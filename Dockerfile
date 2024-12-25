# Install dependencies only when needed
FROM node:18-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

RUN npm config set registry http://mirrors.cloud.tencent.com/npm/
RUN npm add pnpm -g
RUN pnpm config set registry http://mirrors.cloud.tencent.com/npm/
RUN pnpm i

# Rebuild the source code only when needed
FROM node:18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm config set registry https://registry.npmmirror.com
RUN npm add pnpm -g
RUN pnpm config set registry https://registry.npmmirror.com
RUN pnpm build

# Final stage: run the application
FROM node:18-alpine AS runner
WORKDIR /app

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
