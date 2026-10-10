FROM node:20-alpine AS build

WORKDIR /app

RUN npm install -g pnpm@11.18.0

# Baked into the static bundle at build time (Vite env vars are compile-time,
# not runtime) — override with --build-arg VITE_API_URL=... for a non-local
# backend host.
ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
