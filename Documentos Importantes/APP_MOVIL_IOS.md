# Asteron como app móvil (iOS) — Prueba con Capacitor

> **Estado:** prueba en la rama `dev-alejo`. Nada de esto está en `develop` ni en `main`, así que la app web principal no cambia.
> **Responsable:** David Alejo

---

## 1. ¿Qué se busca?

Probar que el mismo frontend de Asteron (React + Vite) pueda instalarse en un iPhone como **app nativa**, sin volver a escribir las pantallas en otro lenguaje (como Flutter).

## 2. ¿Qué es Capacitor?

[Capacitor](https://capacitorjs.com) es una herramienta que toma una aplicación web ya compilada (la carpeta `dist/` que genera `npm run build`) y la empaqueta dentro de un proyecto nativo de iOS (Xcode) o Android (Android Studio).

- **Es el mismo código React**: no se duplican pantallas ni lógica.
- La app instalada se comunica con el **mismo backend** (Node.js + Express) y la **misma base de datos** MySQL.
- La web sigue funcionando igual con `npm run dev`.

```
frontend (React)  ──npm run build──►  dist/  ──npx cap sync──►  ios/ (proyecto Xcode)  ──►  iPhone
                                                                      │
                                                                      └──► llama a la API: http://IP_DEL_MAC:3000/api
```

---

## 3. Cambios realizados

### 3.1 Archivos nuevos

| Archivo / carpeta | Para qué sirve |
|---|---|
| `frontend/capacitor.config.json` | Configuración de la app: nombre (`Asteron`), identificador (`com.alejo.asteron`) y carpeta web (`dist`). |
| `frontend/ios/` | Proyecto nativo de iOS generado por Capacitor (se abre con Xcode). |
| `Data Base/setup_db.sh` | Script para montar la base de datos local desde cero en Mac (ver sección 6). |
| `Documentos Importantes/APP_MOVIL_IOS.md` | Este documento. |

### 3.2 Archivos modificados

| Archivo | Cambio |
|---|---|
| `frontend/package.json` | Se agregaron las dependencias `@capacitor/core`, `@capacitor/ios` y `@capacitor/cli` (v8). |
| `frontend/package-lock.json` | Actualizado por la instalación de las dependencias anteriores. |
| `backend/src/app.js` | Se agregaron a CORS los orígenes que usa la app nativa: `capacitor://localhost`, `http://localhost` y `https://localhost`. **No se quitó ninguno de los orígenes existentes.** |
| `frontend/ios/App/App/Info.plist` | Se agregó `NSAppTransportSecurity > NSAllowsArbitraryLoads = true` para permitir que la app llame al backend por `http` en la red local (iOS bloquea `http` por defecto). |

### 3.3 Lo que NO se cambió

- Ninguna pantalla, componente ni lógica del frontend.
- Ninguna ruta, controlador ni consulta del backend.
- El esquema de la base de datos.

---

## 4. Requisitos (solo para quien vaya a compilar la app de iOS)

- Mac con **Xcode** instalado.
- Un **Apple ID** (sirve la cuenta gratuita para instalar en tu propio iPhone).
- iPhone con cable o en la misma red que el Mac.
- Backend y MySQL funcionando localmente (ver `README.md`).

---

## 5. Cómo ejecutar la app en el iPhone

### 5.1 Conectar el iPhone y el Mac a la misma red

Puede ser el mismo Wi‑Fi o el **hotspot** del iPhone. Luego obtén la IP del Mac:

```bash
ipconfig getifaddr en0
```

### 5.2 Configurar las variables de entorno con la IP del Mac

> Los archivos `.env` **no se suben al repositorio** (están en `.gitignore`), así que cada uno pone su propia IP.

`backend/.env`
```env
FRONTEND_URL=http://IP_DEL_MAC:5173
```

`frontend/.env`
```env
VITE_API_URL=http://IP_DEL_MAC:3000/api
```

### 5.3 Levantar el backend

```bash
cd backend
npm run dev
```

### 5.4 Compilar el frontend y sincronizar con iOS

```bash
cd frontend
npm install
npm run build
npx cap sync ios
npx cap open ios
```

### 5.5 Instalar desde Xcode

1. En el panel izquierdo selecciona **App** → pestaña **Signing & Capabilities** → en **Team** elige tu Apple ID.
2. Conecta el iPhone y selecciónalo como destino en la barra superior.
3. Presiona **▶ Run**.
4. La primera vez, en el iPhone ve a **Ajustes → General → VPN y gestión de dispositivos** y confía en tu certificado de desarrollador.

### 5.6 Cada vez que cambie el código del frontend

```bash
npm run build
npx cap sync ios
```

Luego vuelve a darle **▶ Run** en Xcode.

---

## 6. Script de base de datos (`Data Base/setup_db.sh`)

Automatiza en Mac los pasos de la sección 2 y 3 del `README.md`:

1. Inicia MySQL con Homebrew si no está corriendo.
2. Pide la contraseña de `root` (Enter si no tiene).
3. Crea la base `asteron` e importa `asteron_v2.sql`.
4. Crea `backend/.env` a partir de `.env.example` y le pone la contraseña.
5. Ejecuta las migraciones y el seed.

```bash
bash "Data Base/setup_db.sh"
```

> ⚠️ **Borra y recrea** la base `asteron`. Úsalo solo para una instalación desde cero.

---

## 7. Ver la versión web desde el celular (sin instalar nada)

Con los `.env` configurados como en 5.2:

```bash
cd frontend
npm run dev -- --host
```

Y en el navegador del celular abre `http://IP_DEL_MAC:5173`.

---

## 8. Limitaciones actuales

- La app **depende del Mac**: backend y MySQL corren localmente, así que el celular debe estar en la misma red y los servidores encendidos.
- Si la IP del Mac cambia (otra red Wi‑Fi o se reinicia el hotspot), hay que actualizar los `.env`, volver a hacer `npm run build` y `npx cap sync ios`.
- Con Apple ID gratuito, la app instalada deja de abrir a los 7 días y hay que volver a instalarla desde Xcode.
- El permiso `NSAllowsArbitraryLoads` es solo para pruebas locales. Para una versión publicada, el backend debería estar en un servidor con `https` y ese permiso se quitaría.

## 9. Posibles siguientes pasos

- Agregar Android (`npx cap add android`).
- Ícono y pantalla de inicio (splash) con el logo de Macromet.
- Publicar el backend y la base de datos en un servidor para que la app funcione sin depender del Mac.

---

## 10. Registro de cambios

| Fecha | Cambio |
|---|---|
| 2026-09-23 | Instalación de Capacitor 8, generación del proyecto iOS, ajuste de CORS y permiso de red en `Info.plist`. |
| 2026-09-23 | Script `setup_db.sh` para montar la base de datos en Mac. |
