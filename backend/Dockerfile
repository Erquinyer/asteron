FROM node:22-alpine

WORKDIR /app

# Zona horaria de la planta. El código calcula "hoy" con la hora local del proceso
# (utils/dates.js): en un servidor en UTC, desde las 7 p. m. ya sería "mañana" y se
# rechazarían como pasadas fechas del mismo día. tzdata trae la base de husos horarios.
RUN apk add --no-cache tzdata
ENV TZ=America/Bogota
ENV NODE_ENV=production

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

# Sin root: si alguien llegara a ejecutar código en el contenedor, no tendría
# permisos de administrador. La carpeta de fotos es lo único donde escribe.
RUN mkdir -p uploads/evidencias && chown -R node:node uploads
USER node

EXPOSE 3000
CMD ["node", "server.js"]
