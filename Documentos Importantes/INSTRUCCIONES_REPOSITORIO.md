# Instrucciones de configuración — Proyecto Asteron

Repositorio: https://github.com/Erquinyer/asteron

---

## Estructura de ramas

```
main                ← Producción (no tocar directamente)
  └── develop       ← Integración y pruebas
        ├── gabriel/develop   ← Rama de Gabriel
        ├── nixon/develop     ← Rama de Nixon
        └── david/develop     ← Rama de David
```

**Regla principal:** nunca trabajar directamente en `main` ni en `develop`.  
Cada uno trabaja en su propia rama y hace un Pull Request hacia `develop` cuando termina algo.

---

## Primer paso: ser agregado como colaborador

Pedirle a Gabriel que te agregue en:  
GitHub → Settings → Collaborators → Add people

---

## Clonar el repositorio

```bash
git clone https://github.com/Erquinyer/asteron.git
cd asteron
```

---

## Cambiarse a tu rama personal

**Nixon:**
```bash
git checkout nixon/develop
```

**David:**
```bash
git checkout david/develop
```

---

## Configurar variables de entorno

### Backend
```bash
cp backend/.env.example backend/.env
```
Abre `backend/.env` y completa con tus datos locales:
```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=asteron
JWT_SECRET=cambia_esto_por_algo_seguro
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:5173
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_app_password_gmail
```

### Frontend
```bash
cp frontend/.env.example frontend/.env
```
El archivo ya trae el valor correcto para desarrollo local:
```
VITE_API_URL=http://localhost:3000/api
```

---

## Restaurar la base de datos

```bash
mysql -u root -p < "Data Base/asteron_v2.sql"
```

Luego carga los datos de prueba de Macromet:
```bash
cd backend
node scripts/seed.js
```

---

## Instalar dependencias y correr el sistema

```bash
# Terminal 1 — Backend (puerto 3000)
cd backend
npm install
npm run dev

# Terminal 2 — Frontend (puerto 5173)
cd frontend
npm install
npm run dev
```

Abre el navegador en: http://localhost:5173

---

## Credenciales de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| `alejandro@macromet.com.co` | `macromet2026` | Gerente General |
| `soldador1@macromet.com.co` | `operario2026` | Operario |

---

## Flujo de trabajo diario

```
1. Asegúrate de estar en tu rama
   git checkout nixon/develop   (o david/develop)

2. Antes de empezar, trae los últimos cambios
   git pull origin develop
   git merge develop

3. Haz tus cambios y confirma
   git add .
   git commit -m "descripción de lo que hiciste"
   git push origin nixon/develop

4. Cuando termines una funcionalidad, abre un Pull Request en GitHub
   nixon/develop → develop
```

---

## Comandos git útiles

```bash
# Ver en qué rama estás
git branch

# Ver el estado de tus cambios
git status

# Ver el historial de commits
git log --oneline
```
