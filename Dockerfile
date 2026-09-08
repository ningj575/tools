FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci
COPY client client
COPY server server
RUN npm run build

FROM node:22-alpine AS runtime
RUN apk add --no-cache ghostscript tini
WORKDIR /app
ENV NODE_ENV=production PORT=3000 GS_BIN=gs
COPY package.json ./
COPY package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --omit=dev
COPY --from=builder /app/client/dist client/dist
COPY --from=builder /app/server/dist server/dist
USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/dist/index.js"]
