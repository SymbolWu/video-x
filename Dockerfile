FROM node:24.13.0-bookworm-slim AS build
WORKDIR /workspace
RUN npm install --global pnpm@9.0.0
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build && pnpm --filter @video-x/server deploy --prod /out

FROM node:24.13.0-bookworm-slim AS runtime
# FFprobe travels with the worker image; the host never supplies an executable path.
# Record the resolved Debian package version in each build. Image digest is frozen at release.
RUN apt-get update && apt-get install --yes --no-install-recommends ffmpeg ca-certificates \
    && dpkg-query --show ffmpeg > /usr/local/share/video-x-ffmpeg-version \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5120
COPY --from=build --chown=node:node /out/ ./
RUN mkdir -p /var/lib/video-x/art && chown node:node /var/lib/video-x/art
USER node
EXPOSE 5120
CMD ["node", "dist/entrypoints/http.js"]

FROM nginx:1.28.0-alpine AS gateway
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
COPY --from=build /workspace/apps/admin/dist /usr/share/nginx/html/manage
EXPOSE 8080
