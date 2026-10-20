FROM node:22.23.2-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY index.html tsconfig.json vite.config.ts ./
COPY config ./config
COPY src ./src
RUN npm run build

FROM nginx:stable-alpine@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5
COPY --from=build /build/dist /usr/share/nginx/html
COPY container/nginx.conf /etc/nginx/seminario.conf
COPY container/start.sh /usr/local/bin/start-frontend
RUN chmod 0555 /usr/local/bin/start-frontend && chmod -R a=rX /usr/share/nginx/html
ENV API_UPSTREAM=api:8080 HOME=/tmp
USER 10001:0
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/health/ready || exit 1
ENTRYPOINT ["/usr/local/bin/start-frontend"]
