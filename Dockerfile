# API image. The web app in web/ is a static build and is deployed separately.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src ./src
COPY test ./test
RUN npx tsc

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    DATABASE_PATH=/data/app.db
COPY --from=build /app/dist/src ./dist/src
RUN mkdir /data && chown node:node /data
USER node
# Keep the database on a persistent volume.
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/src/server.js"]
