FROM node:22-alpine

WORKDIR /app

# pnpm pinned to the same version declared in package.json ("packageManager")
# — pnpm 11.x itself requires Node >=22.13, hence node:22 and not node:20.
RUN npm install -g pnpm@11.18.0

# Copy only the manifest + lockfile first so this layer is cached unless a
# dependency actually changes (pnpm-lock.yaml pins exact versions already).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY src ./src
COPY scripts ./scripts
COPY server.js ./

EXPOSE 3000
CMD ["node", "server.js"]
