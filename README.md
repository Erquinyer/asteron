# Asteron — Sistema de Gestión Macromet

Sistema de gestión de producción para **Macromet** (fabricante de displays POP en Colombia).  
Proyecto SENA — Tecnología en Análisis y Desarrollo de Software.

**Stack:** React 18 + Vite + Tailwind CSS · Node.js + Express · MySQL 8

---

## Requisitos previos

Instala estas herramientas antes de empezar. Si ya las tienes, verifica las versiones.

| Herramienta | Versión mínima | Descarga |
|---|---|---|
| Node.js | 18 o superior | https://nodejs.org |
| pnpm | cualquiera reciente | `npm install -g pnpm` (ya viene con Node) |
| MySQL | 8.0 o superior | https://dev.mysql.com/downloads/mysql/ |
| Git | cualquiera | https://git-scm.com |

Para verificar que están instalados, abre una terminal y ejecuta:

```bash
node -v
pnpm -v
mysql --version
git --version
```

---

## 1. Clonar el repositorio y ubicarse en tu rama

### 1.1 — Clonar

```bash
git clone https://github.com/Erquinyer/asteron.git
cd asteron
```

### 1.2 — Cambiar a tu rama personal

Cada integrante del equipo tiene su propia rama. Usa el comando que te corresponde:

```bash
# Gabriel
git checkout gabriel/develop

# David
git checkout david/develop

# Nixon
git checkout nixon/develop
```

> Si tu rama no aparece localmente, usa: `git checkout -b nombre/develop origin/nombre/develop`

### 1.3 — Actualizar la rama antes de trabajar

Antes de comenzar a trabajar cualquier día, sincroniza tu rama con los últimos cambios de `main`:

```bash
git pull origin main
```

---

## 2. Configurar la base de datos

### 2.1 — Crear la base de datos en MySQL

Abre tu cliente MySQL (MySQL Workbench, DBeaver, terminal, etc.) y ejecuta:

```sql
CREATE DATABASE IF NOT EXISTS asteron CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2.2 — Importar el esquema

Abre una terminal **en la carpeta raíz del proyecto** (`asteron/`) y ejecuta:

---

#### En Mac o Linux

```bash
mysql -u root -p asteron < "Data Base/asteron_v2.sql"
```

> Si tu root **no tiene contraseña**, omite el `-p`:
> ```bash
> mysql -u root asteron < "Data Base/asteron_v2.sql"
> ```

---

#### En Windows — opción A: usando el Símbolo del sistema (CMD)

1. Abre el **Símbolo del sistema** (busca `cmd` en el menú inicio).
2. Navega hasta la carpeta del proyecto:
   ```cmd
   cd C:\ruta\donde\clonaste\asteron
   ```
3. Ejecuta el import:
   ```cmd
   mysql -u root -p asteron < "Data Base/asteron_v2.sql"
   ```
   > Si MySQL dice que no se reconoce el comando, agrega MySQL al PATH o usa la opción B.

#### En Windows — opción B: usando MySQL Workbench (más fácil)

1. Abre **MySQL Workbench** y conéctate a tu servidor local.
2. En el menú superior ve a **Server → Data Import**.
3. Selecciona **Import from Self-Contained File**.
4. Haz clic en `...` y busca el archivo `Data Base/asteron_v2.sql` dentro de la carpeta del proyecto.
5. En **Default Target Schema** escribe `asteron`.
6. Haz clic en **Start Import**.

#### En Windows — opción C: agregar MySQL al PATH (una sola vez)

Si quieres usar la terminal normalmente, agrega MySQL al PATH del sistema:

1. Busca la carpeta donde está instalado MySQL, normalmente:  
   `C:\Program Files\MySQL\MySQL Server 8.0\bin`
2. Abre el menú inicio → busca **Variables de entorno del sistema**.
3. En **Variables del sistema**, selecciona `Path` → **Editar** → **Nuevo**.
4. Pega la ruta de la carpeta `bin` de MySQL.
5. Acepta, cierra y abre una nueva terminal.
6. Ahora puedes usar el comando `mysql` normalmente.

---

## 3. Configurar el backend

### 3.1 — Crear el archivo de variables de entorno

Entra a la carpeta `backend`:

```bash
cd backend
```

**Mac / Linux:**
```bash
cp .env.example .env
```

**Windows (CMD):**
```cmd
copy .env.example .env
```

Luego abre el archivo `.env` con cualquier editor de texto (VS Code, Notepad++, Bloc de notas) y ajusta los valores:

```env
PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=        ← pon tu contraseña de MySQL (vacío si no tiene)
DB_NAME=asteron

JWT_SECRET=asteron_super_secret_2026
JWT_EXPIRES_IN=8h

FRONTEND_URL=http://localhost:5173

EMAIL_USER=         ← opcional
EMAIL_PASS=         ← opcional
```

### 3.2 — Instalar dependencias del backend

Desde la carpeta `backend/`:

```bash
pnpm install
```

> El proyecto usa **pnpm** (no npm/yarn) — instálalo con `npm install -g pnpm` si no lo tienes. Cada `package.json` ya fija versiones exactas; `pnpm install` respeta eso tal cual, sin actualizar nada por su cuenta.

### 3.3 — Ejecutar migraciones (solo si tu base es de una versión anterior)

Si acabas de crear la base con `asteron_v2.sql`, sáltate este paso: el esquema ya trae todos los cambios. Si tu base viene de una versión anterior del proyecto, ponla al día con un solo comando (corre todas las migraciones en orden y se puede repetir sin problema):

```bash
pnpm migrar
```

> En una base **vacía** `pnpm migrar` se detiene a propósito: primero hay que cargar los roles con `pnpm seed` (desarrollo) o `pnpm inicializar` (producción).

### 3.4 — Cargar datos de prueba (seed)

Carga los datos reales de Macromet: clientes, proyectos, maquinaria, usuarios, etc.

```bash
pnpm seed
```

> **Advertencia:** el seed borra y recrea todos los datos. Ejecútalo solo en la configuración inicial, nunca sobre una base de datos con datos propios.

### 3.5 — Iniciar el servidor backend

```bash
pnpm dev
```

Deberías ver:
```
🚀 Servidor corriendo en http://localhost:3000
✅ Conexión a MySQL exitosa
```

---

## 4. Configurar el frontend

Abre una **nueva terminal** (el backend debe seguir corriendo) y desde la raíz del proyecto:

```bash
cd frontend
pnpm install
pnpm dev
```

Deberías ver:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

Abre `http://localhost:5173` en tu navegador.

---

## 5. Credenciales de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador Sistema | `admin@macromet.com.co` | `admin2026` |
| Gerente General | `alejandro@macromet.com.co` | `macromet2026` |
| Operario | `soldador1@macromet.com.co` | `operario2026` |

---

## 6. Flujo de trabajo con Git

El repositorio maneja **tres niveles de ramas**:

```
main                   ← rama de producción (código estable y revisado)
  └── develop          ← rama de integración (se unen los cambios del equipo)
        ├── gabriel/develop   ← rama personal de Gabriel
        ├── david/develop     ← rama personal de David
        └── nixon/develop     ← rama personal de Nixon
```

**Regla:** nunca trabajes directamente en `main` ni en `develop`. Siempre trabaja en tu rama personal y luego sube los cambios según el flujo indicado abajo.

---

### Paso 1 — Ubicarse en tu rama

Después de clonar el repositorio, cambia a tu rama personal:

```bash
# Gabriel
git checkout gabriel/develop

# David
git checkout david/develop

# Nixon
git checkout nixon/develop
```

Verifica en qué rama estás en cualquier momento con:

```bash
git branch
```

La rama activa aparece marcada con un asterisco `*`.

---

### Paso 2 — Trabajar y guardar cambios en tu rama

Antes de empezar a trabajar cualquier día, asegúrate de tener los últimos cambios:

```bash
git pull origin develop
```

Haz tus cambios en el código. Cuando termines, guárdalos:

```bash
# Ver qué archivos modificaste
git status

# Agregar todos los archivos cambiados
git add .

# Crear un commit con descripción de lo que hiciste
git commit -m "descripción corta de los cambios"

# Subir tus cambios a tu rama en GitHub
git push origin nombre/develop
```

Reemplaza `nombre` por el tuyo: `gabriel`, `david` o `nixon`.

---

### Paso 3 — Subir cambios de tu rama a `develop`

Cuando tu funcionalidad esté lista y quieras integrarla con el trabajo del equipo:

```bash
# 1. Asegúrate de estar en tu rama
git checkout nombre/develop

# 2. Cambia a la rama develop
git checkout develop

# 3. Trae los últimos cambios de develop
git pull origin develop

# 4. Fusiona tu rama en develop
git merge nombre/develop

# 5. Sube develop actualizado al repositorio
git push origin develop
```

> Si hay conflictos en el paso 4, Git te mostrará los archivos afectados. Ábrelos, resuelve las diferencias marcadas con `<<<<<<`, `=======` y `>>>>>>>`, guarda los archivos y luego:
> ```bash
> git add .
> git commit -m "resolver conflictos al fusionar nombre/develop en develop"
> git push origin develop
> ```

---

### Paso 4 — Subir cambios de `develop` a `main`

Solo cuando el equipo haya revisado y aprobado los cambios en `develop`:

```bash
# 1. Cambia a la rama main
git checkout main

# 2. Trae los últimos cambios de main
git pull origin main

# 3. Fusiona develop en main
git merge develop

# 4. Sube main actualizado al repositorio
git push origin main
```

---

### Resumen del flujo completo

```
Clonar:         git clone https://github.com/Erquinyer/asteron.git
Ubicarse:       git checkout nombre/develop

--- ciclo diario ---
Al empezar:     git pull origin develop
Trabajar:       (editar archivos)
Guardar:        git add .
                git commit -m "mensaje"
                git push origin nombre/develop

--- cuando la tarea está lista ---
Integrar:       git checkout develop
                git pull origin develop
                git merge nombre/develop
                git push origin develop

--- cuando develop está revisado y aprobado ---
Producción:     git checkout main
                git pull origin main
                git merge develop
                git push origin main
```

---

## Correr todo con Docker (alternativa a las secciones 2-4)

Si tienes **Docker Desktop** instalado, puedes levantar MySQL + backend + frontend sin instalar Node ni MySQL localmente.

### Primera vez

```bash
# 1. Crea backend/.env a partir del ejemplo (lo lee el contenedor del backend)
cp backend/.env.example backend/.env

# 2. Construye e inicia los tres servicios
docker compose up --build -d

# 3. Solo la PRIMERA vez (o si borraste el volumen de datos): carga los roles,
#    permisos y datos de prueba de Macromet. El esquema ya trae todas las tablas.
docker compose exec backend pnpm seed

# Después de actualizar el código (git pull), pon la base al día:
docker compose exec backend pnpm migrar
```

Abre `http://localhost:5173`.

### Uso diario

```bash
docker compose up -d       # levantar
docker compose logs -f     # ver logs en vivo
docker compose down        # detener (los datos de MySQL persisten en el volumen db_data)
```

### Cómo está armado

| Archivo | Qué hace |
|---|---|
| `backend/Dockerfile` | Imagen de Node 22 + pnpm (pnpm 11.x exige Node ≥22.13), corre `node server.js`. |
| `frontend/Dockerfile` | Compila con Vite (`pnpm build`) y sirve `dist/` con nginx — `VITE_API_URL` se "hornea" en el bundle en tiempo de build, no se puede cambiar después sin reconstruir la imagen. |
| `frontend/nginx.conf` | Redirige cualquier ruta a `index.html` para que funcione el enrutado de React Router (`/proyectos/12`, etc.) en vez de dar 404. |
| `docker-compose.yml` | Orquesta `mysql` (con el esquema de `Data Base/asteron_v2.sql` precargado), `backend` y `frontend`, en ese orden de arranque, más el servicio `respaldo` (copia de seguridad diaria, ver abajo). |

> **Nota de la base de datos:** el esquema de `Data Base/asteron_v2.sql` solo se importa la **primera vez** que se crea el volumen `db_data` (es el comportamiento estándar de la imagen oficial de MySQL — si el volumen ya tiene datos, lo ignora). Para empezar desde cero: `docker compose down -v` (borra el volumen) y vuelve a correr los 3 pasos de "Primera vez".
>
> **No probado en este equipo:** Docker no está instalado en esta máquina, así que estos archivos no se construyeron/ejecutaron realmente aquí — están escritos con cuidado pero conviene validar el primer `docker compose up --build` juntos por si aparece algo que ajustar (versión de alguna imagen base, alguna dependencia nativa, etc.).

---

## Despliegue en producción

Para un servidor en la nube (VPS con Ubuntu, por ejemplo Hetzner, DigitalOcean o AWS Lightsail) se usa `docker-compose.prod.yml`: **Caddy** sirve todo por HTTPS con certificado automático de Let's Encrypt, y MySQL, el backend y el frontend quedan en la red interna de Docker, sin puertos abiertos a internet. La web y el API comparten dominio (`https://DOMINIO` y `https://DOMINIO/api`).

### Antes de empezar

- Un servidor con Docker instalado y un **dominio** cuyo registro DNS tipo A apunte a la IP del servidor (sirve uno gratuito, como los de DuckDNS).
- Firewall abierto solo en los puertos **22** (SSH), **80** y **443**. Acceso SSH con llave, no con contraseña.

### Primera vez

```bash
git clone https://github.com/Erquinyer/asteron.git && cd asteron
cp .env.produccion.example .env.produccion
nano .env.produccion          # DOMINIO, CORREO_ACME, contraseñas y JWT_SECRET (openssl rand -hex 32)

# Atajo: todos los comandos de producción llevan el archivo y las variables
# (agrégalo a ~/.bashrc para no repetirlo en cada sesión)
alias dc='docker compose -f docker-compose.prod.yml --env-file .env.produccion'

dc up -d --build

# Base nueva: catálogos (roles, permisos, fases) y el primer administrador.
# NUNCA `pnpm seed` en producción: borra todo (está bloqueado con NODE_ENV=production).
dc exec -e ADMIN_NOMBRE="Nombre Apellido" -e ADMIN_CORREO=correo@macromet.com.co \
  -e ADMIN_CONTRASENA='clave-larga-y-unica' backend pnpm inicializar
dc exec backend pnpm migrar
```

Abre `https://DOMINIO` e inicia sesión con ese administrador. Desde **Administración** crea el resto de usuarios.

### Actualizar a una versión nueva

```bash
git pull
dc up -d --build
dc exec backend pnpm migrar
```

### Qué protege esta configuración

| Riesgo | Protección |
|---|---|
| Tráfico sin cifrar | HTTPS obligatorio con certificado renovado solo (Caddy) y HSTS |
| Base de datos expuesta | MySQL sin puertos publicados; el backend usa un usuario propio, no `root` |
| Adivinar contraseñas | 10 intentos fallidos de login cada 15 min por IP; 5 solicitudes de recuperación por hora |
| Secreto JWT débil | El backend no arranca en producción con un `JWT_SECRET` corto o el de ejemplo |
| Borrar los datos reales | `seed.js` se niega a correr con `NODE_ENV=production` |
| Fechas corridas un día | Contenedores en la zona horaria `America/Bogota` |
| Inyección de scripts (XSS) | Política de seguridad de contenido (CSP) que solo permite recursos del propio dominio |
| Fotos perdidas al actualizar | Fotos en un volumen de Docker, incluidas en el respaldo diario |
| Contenedor comprometido | El backend corre sin usuario `root` |

### Operación

- **Respaldos:** el servicio `respaldo` deja cada día la base y las fotos en `./respaldos`. **Cópialos fuera del servidor** (por ejemplo, con `rclone` a Google Drive): si se pierde el servidor, se pierden también.
- **Disponibilidad (RNF-15):** registra `https://DOMINIO/api/health` en un monitor gratuito como UptimeRobot, cada 5 minutos. Responde 503 si la base de datos no está disponible.
- **Ver logs:** `dc logs -f backend` · **Estado:** `dc ps` (el backend debe aparecer como *healthy*).

---

## Documentación de la API (Swagger)

Con el backend corriendo, abre **http://localhost:3000/api/docs**. Para probar una ruta protegida:

1. Ejecuta `POST /auth/login` con un usuario de prueba y copia el `token` de la respuesta.
2. Pulsa **Authorize**, pega el token y confirma.

La especificación está en `backend/src/docs/openapi.js` (en JSON: `/api/docs.json`). Si agregas o quitas una ruta en `routes/*.js`, actualízala ahí y comprueba con:

```bash
cd backend && pnpm verificar-openapi
```

---

## Copias de seguridad y restauración

Los respaldos se guardan comprimidos en `respaldos/asteron_AAAAMMDD_HHMMSS.sql.gz` y solo se conservan los 7 más recientes. Las fotos de evidencia no están en la base sino en `backend/uploads/`, así que el mismo script las empaca aparte en `respaldos/fotos_AAAAMMDD_HHMMSS.tar.gz` (misma fecha, misma rotación). Las carpetas `respaldos/` y `backend/uploads/` están en `.gitignore` porque contienen datos reales.

**Automático (Docker):** el servicio `respaldo` de `docker-compose.yml` hace un respaldo al arrancar y luego uno cada 24 h. Para ver que esté funcionando:

```bash
docker compose logs respaldo
```

**Manual (sin Docker o antes de un cambio delicado):** usa la conexión de `backend/.env`.

```bash
bash "Data Base/respaldar.sh"
```

Para respaldar todos los días sin Docker, prográmalo con `crontab -e` (ejemplo: todos los días a las 2:00 a. m.):

```
0 2 * * * cd "/ruta/al/Proyecto Asteron" && bash "Data Base/respaldar.sh" >> respaldos/respaldo.log 2>&1
```

**Restaurar:**

```bash
# 1. Probar el respaldo en una base aparte, sin tocar la real (recomendado primero)
bash "Data Base/restaurar.sh" respaldos/asteron_20261113_020000.sql.gz asteron_prueba

# 2. Reemplazar la base real: pide escribir RESTAURAR y antes guarda un respaldo
#    del estado actual por si el archivo elegido no era el correcto
bash "Data Base/restaurar.sh" respaldos/asteron_20261113_020000.sql.gz

# 3. Restaurar las fotos del MISMO respaldo (misma fecha que el .sql.gz),
#    para que coincidan con las filas de evidencias_fotograficas
mkdir -p backend/uploads && tar -xzf respaldos/fotos_20261113_020000.tar.gz -C backend/uploads
```

Con Docker, la restauración se corre desde el contenedor de respaldo:

```bash
docker compose run --rm --entrypoint bash -v "$PWD/Data Base:/scripts:ro" respaldo \
  /scripts/restaurar.sh /respaldos/asteron_20261113_020000.sql.gz
```

---

## Estructura del proyecto

```
asteron/
├── Data Base/
│   └── asteron_v2.sql          ← esquema completo de la base de datos
├── backend/
│   ├── .env.example            ← plantilla de variables de entorno (copia a .env)
│   ├── src/
│   │   ├── app.js              ← Express + rutas
│   │   ├── controllers/        ← lógica por módulo
│   │   ├── routes/             ← rutas por módulo
│   │   ├── middlewares/        ← auth JWT, requireAdmin
│   │   └── config/db.js        ← pool MySQL
│   ├── scripts/
│   │   ├── seed.js                      ← datos de prueba Macromet
│   │   ├── migrate_admin_role.js        ← migración de rol administrador
│   │   ├── migrate_acciones_modulo.js   ← migración de permisos por acción
│   │   ├── migrate_tiempos_reportes.js  ← horas de actividad, valor hora y módulo de reportes
│   │   └── migrate_evidencias.js        ← tabla de fotos de evidencia
│   └── uploads/evidencias/     ← fotos subidas (no se versiona; ver respaldos)
└── frontend/
    └── src/
        ├── api/                ← servicios axios por módulo
        ├── pages/              ← una página por módulo
        ├── components/         ← layout, ui, dashboard
        ├── hooks/              ← useFetch
        ├── utils/auth.js       ← helpers de sesión y permisos
        └── router/             ← rutas protegidas
```

---

## Módulos del sistema

| Módulo | Ruta |
|---|---|
| Dashboard | `/dashboard` |
| Proyectos | `/proyectos` |
| Pedidos | `/pedidos` |
| Clientes | `/clientes` |
| Maquinaria | `/maquinaria` |
| Mantenimientos | `/mantenimientos` |
| Programación de Planta | `/programacion` |
| Panel de Administración | `/admin` |

---

## Solución de problemas frecuentes

**`'mysql' no se reconoce como comando interno o externo` (Windows)**  
→ MySQL no está en el PATH. Usa MySQL Workbench (opción B del paso 2.2) o agrega MySQL al PATH (opción C).

**`Access denied for user 'root'@'localhost'`**  
→ Revisa que `DB_USER` y `DB_PASSWORD` en tu `.env` coincidan con tu configuración de MySQL.

**`Unknown database 'asteron'`**  
→ Crea primero la base de datos (paso 2.1) antes de importar el SQL.

**El frontend muestra "Error de conexión" o "Network Error"**  
→ El backend no está corriendo. Verifica que esté activo en el puerto 3000.

**Puerto 3000 o 5173 ocupado**  
→ Cambia `PORT` en `backend/.env` o el puerto en `frontend/vite.config.js`.

**`Error: Cannot find module`**  
→ Ejecuta `pnpm install` dentro de `backend/` y dentro de `frontend/` por separado.

**`git push` rechazado (rejected)**  
→ Primero haz `git pull origin main` para traer los últimos cambios y luego vuelve a intentar el push.

---

## Comandos rápidos de referencia

```bash
# Arrancar el sistema completo (dos terminales)
cd backend && pnpm dev           # Terminal 1 — backend en puerto 3000
cd frontend && pnpm dev          # Terminal 2 — frontend en puerto 5173

# Flujo de trabajo Git diario
git pull origin main             # sincronizar antes de trabajar
git add .
git commit -m "mensaje"
git push origin nombre/develop   # subir cambios a tu rama

# Resetear datos (solo si es necesario)
cd backend && pnpm seed
```
## Pruebas

Plan, matriz de casos, reporte y colección Postman en **[`docs/pruebas/`](docs/pruebas/README.md)**.

| Nivel | Herramienta | Comando | Estado (20 nov 2026) |
|---|---|---|---|
| Unitario + API (backend) | Vitest + Supertest, BD simulada | `cd backend && pnpm test:coverage` | 343 ✅ · cobertura de líneas 78,7 % (Programación 70,3 %) |
| Unitario + componente (frontend) | Vitest + Testing Library | `cd frontend && pnpm test:coverage` | 48 ✅ · cobertura de líneas 7,3 % |
| Integración con MySQL real | Vitest + Docker (`mysql-test`) | `docker compose up -d mysql-test && cd backend && pnpm test:integration` | 5 casos |
| API de caja negra | Postman / Newman | ver [`docs/pruebas/README.md`](docs/pruebas/README.md) | 29 peticiones · 59 validaciones ✅ |
| End-to-end | Playwright | `cd e2e && pnpm test` | 2 ✅ |

- **CI:** `.github/workflows/tests.yml` corre las pruebas de backend y frontend en cada PR a `develop` y `main` y falla si la cobertura baja del umbral (`backend/vitest.config.js`, `frontend/vite.config.js`). Los umbrales solo suben.
- **Ambiente de pruebas separado:** `bash docs/pruebas/preparar-ambiente.sh` crea la BD `asteron_test` y se levanta un backend aparte en el puerto 3001. Las pruebas que escriben datos no tocan la BD de desarrollo.
- **Rotación por capas** (Front, API, BD, E2E) y cobertura semanal: [`docs/matriz-rotacion.md`](docs/matriz-rotacion.md). Hallazgos por semana: [`docs/retos/`](docs/retos/).
- **Historial:** la semana 2 (Nixon, @nixonhalejo) configuró el CI con el primer umbral de cobertura (30 %) y las primeras pruebas AAA de `validarEmail()` / `validarPassword()`, con una mutación (`<` → `<=`) que el test detectó.
