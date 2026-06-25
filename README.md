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

## 1. Clonar el repositorio

```bash
git clone https://github.com/Erquinyer/asteron.git
cd asteron
```

---

## 2. Configurar la base de datos

### 2.1 — Crear la base de datos en MySQL

Abre tu cliente MySQL (terminal, MySQL Workbench, DBeaver, etc.) y ejecuta:

```sql
CREATE DATABASE IF NOT EXISTS asteron CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2.2 — Importar el esquema

Desde la carpeta raíz del proyecto, ejecuta en tu terminal:

```bash
mysql -u root -p asteron < "Data Base/asteron_v2.sql"
```

> Si tu usuario root **no tiene contraseña**, usa: `mysql -u root asteron < "Data Base/asteron_v2.sql"`  
> Si usas un usuario diferente, reemplaza `root` por tu usuario.

---

## 3. Configurar el backend

### 3.1 — Crear el archivo de variables de entorno

Entra a la carpeta `backend` y copia el archivo de ejemplo:

```bash
cd backend
cp .env.example .env
```

Luego abre el archivo `.env` con cualquier editor de texto y ajusta los valores según tu configuración local:

```env
PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=        ← pon tu contraseña de MySQL aquí (vacío si no tiene)
DB_NAME=asteron

JWT_SECRET=asteron_super_secret_2026
JWT_EXPIRES_IN=8h

FRONTEND_URL=http://localhost:5173

EMAIL_USER=         ← opcional, solo para recuperación de contraseña
EMAIL_PASS=         ← opcional
```

### 3.2 — Instalar dependencias del backend

Estando dentro de `backend/`:

```bash
npm install
```

### 3.3 — Ejecutar migraciones

Estos scripts crean tablas adicionales y configuran permisos del sistema. Ejecútalos **una sola vez**:

```bash
node scripts/migrate_admin_role.js
node scripts/migrate_acciones_modulo.js
```

### 3.4 — Cargar datos de prueba (seed)

Este script carga los datos reales de Macromet: clientes, proyectos, maquinaria, usuarios, etc.

```bash
npm run seed
```

> **Advertencia:** el seed borra y recrea todos los datos. Ejecútalo solo una vez en la configuración inicial, no en una base de datos con datos propios.

### 3.5 — Iniciar el servidor backend

```bash
npm run dev
```

Deberías ver en consola:
```
🚀 Servidor corriendo en http://localhost:3000
✅ Conexión a MySQL exitosa
```

---

## 4. Configurar el frontend

Abre una **nueva terminal** (el backend debe seguir corriendo en la anterior) y desde la raíz del proyecto:

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

Abre esa URL en tu navegador.

---

## 5. Credenciales de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador Sistema | `admin@macromet.com.co` | `admin2026` |
| Gerente General | `alejandro@macromet.com.co` | `macromet2026` |
| Operario | `soldador1@macromet.com.co` | `operario2026` |

---

## Estructura del proyecto

```
asteron/
├── Data Base/
│   └── asteron_v2.sql          ← esquema completo de la base de datos
├── backend/
│   ├── .env.example            ← plantilla de variables de entorno
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

**`Access denied for user 'root'@'localhost'`**  
→ Revisa que `DB_USER` y `DB_PASSWORD` en tu `.env` coincidan con tu configuración de MySQL.

**`Unknown database 'asteron'`**  
→ Asegúrate de haber creado la base de datos (paso 2.1) antes de importar el SQL.

**El frontend dice "Error de conexión" o "Network Error"**  
→ Verifica que el backend esté corriendo en el puerto 3000 antes de abrir el frontend.

**Puerto 3000 o 5173 ocupado**  
→ Cambia el puerto en `backend/.env` (variable `PORT`) o en `frontend/vite.config.js`.

**`Error: Cannot find module`**  
→ Asegúrate de haber ejecutado `npm install` tanto en `backend/` como en `frontend/`.

---

## Comandos rápidos de referencia

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev

# Resetear datos (solo si es necesario)
cd backend && npm run seed
```
