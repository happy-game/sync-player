FROM node:lts-alpine AS builder

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# 构建player
WORKDIR /app/player
COPY player/package*.json ./
RUN npm install
COPY player ./
RUN npm run build

# 构建server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server ./
RUN npm run build

# 创建最终镜像
FROM node:lts-alpine
WORKDIR /app
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/player/dist ./server/dist/web
WORKDIR /app/server
RUN npm install --only=production

EXPOSE 3000
CMD ["node", "dist/app.js"]
