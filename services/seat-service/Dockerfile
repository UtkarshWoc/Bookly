FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
# The shared .proto contract comes from the "proto" additional build context (see docker-compose.yml).
COPY --from=proto . ./proto
COPY src ./src
USER node
EXPOSE 50051
CMD ["node", "src/server.js"]
