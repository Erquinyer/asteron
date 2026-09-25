# Asteron como app móvil (iOS y Android) — Prueba con Capacitor

> **Estado:** prueba en la rama `dev-alejo`. Nada de esto está en `develop` ni en `main`, así que la app web principal no cambia.
> **Responsable:** David Alejo

---

## 1. ¿Qué se busca?

Probar que el mismo frontend de Asteron (React + Vite) pueda instalarse en **iPhone y en Android** como app nativa, sin volver a escribir las pantallas en otro lenguaje (como Flutter).

## 2. ¿Qué es Capacitor?

[Capacitor](https://capacitorjs.com) es una herramienta que toma una aplicación web ya compilada (la carpeta `dist/` que genera `npm run build`) y la empaqueta dentro de un proyecto nativo de iOS (Xcode) y de Android (Android Studio).

- **Es el mismo código React para las dos plataformas**: no se duplican pantallas ni lógica.
- Las apps se comunican con el **mismo backend** (Node.js + Express) y la **misma base de datos** MySQL.
- La web sigue funcionando igual con `npm run dev`.

```
                                        ┌──► ios/      (Xcode)          ──► iPhone
frontend (React) ──npm run build──► dist/ ──npx cap sync──┤
                                        └──► android/  (Android Studio) ──► Android

Ambas apps llaman a la API:  http://IP_DEL_MAC:3000/api
```

---

## 3. Cambios realizados

### 3.1 Archivos nuevos

| Archivo / carpeta | Para qué sirve |
|---|---|
| `frontend/capacitor.config.json` | Configuración común: nombre (`Asteron`), identificador (`com.alejo.asteron`), carpeta web (`dist`) y ajustes de red para Android. |
| `frontend/ios/` | Proyecto nativo de iOS generado por Capacitor (se abre con Xcode). |
| `frontend/android/` | Proyecto nativo de Android generado por Capacitor (se abre con Android Studio). |
| `Data Base/setup_db.sh` | Script para montar la base de datos local desde cero en Mac (ver sección 8). |
| `Documentos Importantes/APP_MOVIL.md` | Este documento. |

### 3.2 Archivos modificados

| Archivo | Cambio |
|---|---|
| `frontend/package.json` | Dependencias `@capacitor/core`, `@capacitor/ios`, `@capacitor/android` y `@capacitor/cli` (v8). |
| `frontend/package-lock.json` | Actualizado por la instalación de las dependencias anteriores. |
| `backend/src/app.js` | Se agregaron a CORS los orígenes que usan las apps nativas: `capacitor://localhost` (iOS) y `http://localhost` / `https://localhost` (Android). **No se quitó ninguno de los orígenes existentes.** |

### 3.3 Ajustes de red para usar `http` en pruebas locales

Por seguridad, iOS y Android bloquean por defecto las conexiones `http` (sin `s`). Como el backend local corre en `http://IP_DEL_MAC:3000`, se habilitaron solo para pruebas:

| Plataforma | Dónde | Ajuste |
|---|---|---|
| iOS | `frontend/ios/App/App/Info.plist` | `NSAppTransportSecurity > NSAllowsArbitraryLoads = true` |
| Android | `frontend/capacitor.config.json` | `server.androidScheme = "http"` y `server.cleartext = true` |
| Android | `frontend/android/app/src/main/AndroidManifest.xml` | `android:usesCleartextTraffic="true"` en `<application>` |

### 3.4 Ajuste de pantalla en iOS (barra de estado / Dynamic Island)

En el iPhone, la app se dibujaba por debajo de la barra de estado (hora, batería, Dynamic Island). Como la barra de navegación de la landing y la barra superior del panel son `sticky top-0`, quedaban tapadas y en vertical no se podía llegar al botón **Iniciar sesión**.

Se solucionó con `"ios": { "contentInset": "always" }` en `frontend/capacitor.config.json`, que hace que la app respete el área segura de la pantalla. **No se modificó ningún componente de React**, así que la web no cambia.

### 3.5 Ícono y pantalla de inicio (splash) con el logo de Asteron

Los íconos y la pantalla de carga de iOS y Android se generan automáticamente desde dos imágenes guardadas en `frontend/assets/`:

| Archivo | Uso |
|---|---|
| `frontend/assets/logo.png` | Logo oscuro (1024×1024, fondo transparente). Copia de `frontend/public/logo-icon.png`. Se usa sobre fondo blanco. |
| `frontend/assets/logo-dark.png` | El mismo logo en blanco, para el modo oscuro del celular. |

Para regenerarlos (por ejemplo, si cambia el logo), desde `frontend/`:

```bash
npx @capacitor/assets generate --iconBackgroundColor "#ffffff" --iconBackgroundColorDark "#080B14" --splashBackgroundColor "#ffffff" --splashBackgroundColorDark "#080B14"
npx cap sync
```

La herramienta reemplaza las imágenes dentro de `frontend/ios/App/App/Assets.xcassets/` y `frontend/android/app/src/main/res/`.

### 3.6 Lo que NO se cambió

- Ninguna pantalla, componente ni lógica del frontend.
- Ninguna ruta, controlador ni consulta del backend.
- El esquema de la base de datos.

---

## 4. Requisitos

| Para | Necesitas |
|---|---|
| iOS | Mac con **Xcode** y un **Apple ID** (sirve la cuenta gratuita). |
| Android | **Android Studio** (Mac, Windows o Linux) y un celular Android con **Depuración USB** activada, o un emulador. |
| Ambos | Backend y MySQL funcionando localmente (ver `README.md`) y el celular en la misma red que el computador. |

---

## 5. Preparación común (iOS y Android)

### 5.1 Conectar el celular y el computador a la misma red

Puede ser el mismo Wi‑Fi o el **hotspot** del celular. Luego obtén la IP del computador:

```bash
# Mac
ipconfig getifaddr en0
```
```cmd
:: Windows (busca "Dirección IPv4")
ipconfig
```

### 5.2 Configurar las variables de entorno con esa IP

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

### 5.4 Compilar el frontend y sincronizar con las apps

```bash
cd frontend
npm install
npm run build
npx cap sync
```

`npx cap sync` copia la web compilada a **ios/** y **android/** al mismo tiempo.

---

## 6. Instalar la app

### 6.1 iPhone (Xcode)

```bash
npx cap open ios
```

1. En el panel izquierdo selecciona **App** → pestaña **Signing & Capabilities** → en **Team** elige tu Apple ID.
2. Conecta el iPhone y selecciónalo como destino en la barra superior.
3. Presiona **▶ Run**.
4. La primera vez, en el iPhone ve a **Ajustes → General → VPN y gestión de dispositivos** y confía en tu certificado de desarrollador.

### 6.2 Android (Android Studio)

```bash
npx cap open android
```

1. Espera a que Android Studio termine de sincronizar Gradle (barra inferior).
2. En el celular: **Ajustes → Acerca del teléfono** → toca 7 veces **Número de compilación** → vuelve a **Ajustes → Opciones de desarrollador** → activa **Depuración USB**.
3. Conecta el celular por cable y acepta el aviso de depuración.
4. Selecciónalo arriba como dispositivo y presiona **▶ Run**.

### 6.3 Cada vez que cambie el código del frontend

```bash
npm run build
npx cap sync
```

Luego vuelve a darle **▶ Run** en Xcode o Android Studio.

---

## 7. Generar instaladores para compartir la app

Cada sistema usa su propio formato de instalador:

| Formato | Sistema | ¿Sirve en celular? |
|---|---|---|
| `.apk` | Android | Sí |
| `.ipa` | iPhone / iPad | Sí, pero con restricciones de Apple |
| `.dmg` | macOS (computador Mac) | No |

> La app que se instala desde Xcode con **▶ Run** ya es la app nativa; es lo mismo que haría un `.ipa`.

### 7.1 Android — generar un `.apk`

Requiere **Android Studio**.

1. Compila y sincroniza:
   ```bash
   cd frontend
   npm run build
   npx cap sync android
   npx cap open android
   ```
2. En Android Studio: **Build → Generate App Bundles or APKs → Generate APKs**.
3. Al terminar, aparece un aviso con el enlace **locate**. El archivo queda en:
   `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
4. Comparte el `.apk` por WhatsApp, Drive o cable.
5. En el celular Android, al abrirlo, permite **instalar apps de orígenes desconocidos** cuando lo pida.

> El `.apk` de tipo *debug* es suficiente para pruebas. Para publicar en Google Play se genera un `.aab` firmado (**Build → Generate Signed App Bundle**) y se necesita una cuenta de Google Play Console.

### 7.2 iPhone — opciones

Apple no permite instalar un `.ipa` libremente: toda app debe estar firmada con una cuenta de Apple.

| Opción | Cuenta necesaria | Cómo se instala | Limitaciones |
|---|---|---|---|
| **Xcode ▶ Run** (la que usamos) | Apple ID gratuito | Con cable desde un Mac | Solo en tus dispositivos; deja de abrir a los 7 días y hay que reinstalar. No permite generar un `.ipa` para compartir. |
| **TestFlight** | Apple Developer Program (pago anual) | Los demás instalan la app **TestFlight** y abren un enlace de invitación | Cada versión de prueba dura 90 días. |
| **Ad Hoc (`.ipa`)** | Apple Developer Program | Se genera el `.ipa` desde **Product → Archive** en Xcode | Solo en iPhones registrados previamente (por su UDID). |
| **App Store** | Apple Developer Program | Descarga normal desde la App Store | Requiere revisión de Apple. |

**Recomendación para el equipo:** quien tenga Mac la instala con Xcode (sección 6.1); quien tenga Android usa el `.apk` (sección 7.1).

### 7.3 Importante para cualquier instalador

La dirección del backend queda **fija dentro de la app** en el momento de compilar (`VITE_API_URL` en `frontend/.env`). Hoy apunta a la IP local del computador, así que la app instalada solo funciona si ese computador está encendido, con el backend corriendo y en la misma red. Para repartirla y que funcione desde cualquier lugar, primero hay que publicar el backend y la base de datos en un servidor y recompilar con esa dirección.

---

## 8. Script de base de datos (`Data Base/setup_db.sh`)

Automatiza en Mac los pasos 2 y 3 del `README.md`:

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

## 9. Ver la versión web desde el celular (sin instalar nada)

Con los `.env` configurados como en 5.2:

```bash
cd frontend
npm run dev -- --host
```

Y en el navegador del celular abre `http://IP_DEL_MAC:5173`.

---

## 10. Limitaciones actuales

- Las apps **dependen del computador**: backend y MySQL corren localmente, así que el celular debe estar en la misma red y los servidores encendidos.
- Si la IP cambia (otra red Wi‑Fi o se reinicia el hotspot), hay que actualizar los `.env`, volver a hacer `npm run build` y `npx cap sync`.
- iOS con Apple ID gratuito: la app deja de abrir a los 7 días y hay que volver a instalarla desde Xcode.
- Los permisos de `http` (sección 3.3) son solo para pruebas locales. Para una versión publicada, el backend debería estar en un servidor con `https` y esos permisos se quitarían.

## 11. Posibles siguientes pasos

- Publicar el backend y la base de datos en un servidor para que la app funcione sin depender del computador.
- Publicar el backend en un servidor para poder repartir el `.apk` y usar TestFlight en iPhone.

---

## 12. Registro de cambios

| Fecha | Cambio |
|---|---|
| 2026-09-23 | Instalación de Capacitor 8, generación del proyecto iOS, ajuste de CORS y permiso de red en `Info.plist`. |
| 2026-09-23 | Script `setup_db.sh` para montar la base de datos en Mac. |
| 2026-09-23 | Ajuste `ios.contentInset` para que la app no quede debajo de la barra de estado del iPhone. |
| 2026-09-23 | Se agrega la plataforma Android (`frontend/android/`) y los ajustes de red para `http` en pruebas locales. |
| 2026-09-23 | Guía para generar instaladores (`.apk` en Android y opciones en iPhone). |
| 2026-09-23 | Checklist de pruebas por módulo en `CHECKLIST_PRUEBAS_MOVIL.md`. |
| 2026-09-25 | Ícono y pantalla de inicio con el logo de Asteron en iOS y Android (`frontend/assets/`). |
