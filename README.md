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
| MySQL | 8.0 o superior | https://dev.mysql.com/downloads/mysql/ |
| Git | cualquiera | https://git-scm.com |

Para verificar que están instalados, abre una terminal y ejecuta:

```bash
node -v
npm -v
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
npm install
```

### 3.3 — Ejecutar migraciones

Estos scripts crean tablas adicionales y configuran permisos. Ejecútalos **una sola vez**:

```bash
node scripts/migrate_admin_role.js
node scripts/migrate_acciones_modulo.js
```

### 3.4 — Cargar datos de prueba (seed)

Carga los datos reales de Macromet: clientes, proyectos, maquinaria, usuarios, etc.

```bash
npm run seed
```

> **Advertencia:** el seed borra y recrea todos los datos. Ejecútalo solo en la configuración inicial, nunca sobre una base de datos con datos propios.

### 3.5 — Iniciar el servidor backend

```bash
npm run dev
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
npm install
npm run dev
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
│   └── scripts/
│       ├── seed.js                      ← datos de prueba Macromet
│       ├── migrate_admin_role.js        ← migración de rol administrador
│       └── migrate_acciones_modulo.js   ← migración de permisos por acción
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
→ Ejecuta `npm install` dentro de `backend/` y dentro de `frontend/` por separado.

**`git push` rechazado (rejected)**  
→ Primero haz `git pull origin main` para traer los últimos cambios y luego vuelve a intentar el push.

---

## Comandos rápidos de referencia

```bash
# Arrancar el sistema completo (dos terminales)
cd backend && npm run dev        # Terminal 1 — backend en puerto 3000
cd frontend && npm run dev       # Terminal 2 — frontend en puerto 5173

# Flujo de trabajo Git diario
git pull origin main             # sincronizar antes de trabajar
git add .
git commit -m "mensaje"
git push origin nombre/develop   # subir cambios a tu rama

# Resetear datos (solo si es necesario)
cd backend && npm run seed
```
