# Respaldo y restauración de la base de datos

Cubre el requisito **RNF-16: copia de seguridad periódica y procedimiento de restauración**.

| | |
|---|---|
| **Qué se respalda** | La base `asteron` completa: estructura, datos, rutinas y triggers (`mysqldump --single-transaction`, sin bloquear las tablas) |
| **Frecuencia** | Cada 24 horas (configurable) |
| **Retención** | Los últimos 7 respaldos (configurable) |
| **Dónde quedan** | Carpeta `respaldos/` en la raíz del repositorio, ignorada por Git porque contiene datos reales |
| **Pérdida máxima de datos** | Lo registrado desde el último respaldo (máximo 24 horas) |

## 1. Respaldo automático con Docker

Al levantar el sistema con `docker compose up -d`, el servicio `respaldo` genera un archivo `respaldos/asteron_AAAAMMDD_HHMMSS.sql` al arrancar y luego cada 24 horas.

Para cambiar la frecuencia o la retención, edita `RESPALDO_HORAS` y `RETENCION` en el servicio `respaldo` de `docker-compose.yml`.

Revisar que esté funcionando:

```bash
docker compose logs respaldo
ls -lh respaldos/
```

## 2. Respaldo manual (MySQL instalado en el equipo)

Requiere el cliente de MySQL (`mysqldump`). En macOS: `brew install mysql-client`.

```bash
cd backend
pnpm respaldo
```

Usa los datos de conexión de `backend/.env` y aplica la misma retención de 7 archivos.

Para programarlo todas las noches a las 11 p. m. en macOS o Linux, agrega esta línea con `crontab -e`:

```
0 23 * * * cd /ruta/a/asteron/backend && ./scripts/respaldo/respaldar.sh >> ../respaldos/respaldo.log 2>&1
```

## 3. Restaurar un respaldo

### Verificar un respaldo sin tocar la base en uso (recomendado primero)

```bash
cd backend
./scripts/respaldo/restaurar.sh ../respaldos/asteron_20261113_230000.sql asteron_verificacion
```

Crea la base `asteron_verificacion` con el contenido del respaldo e indica cuántas tablas restauró. Puedes revisarla y luego borrarla con `DROP DATABASE asteron_verificacion;`.

### Reemplazar la base en uso

```bash
cd backend
./scripts/respaldo/restaurar.sh ../respaldos/asteron_20261113_230000.sql
```

El script pide escribir `SI` antes de reemplazar los datos. Después reinicia el backend.

### Con Docker

```bash
docker compose exec -T mysql mysql -uroot -pasteron_docker < respaldos/asteron_20261113_230000.sql
docker compose restart backend
```

## 4. Prueba periódica de restauración

Un respaldo solo sirve si se puede restaurar. Una vez al mes:

1. Toma el respaldo más reciente de `respaldos/`.
2. Restáuralo en `asteron_verificacion` (paso 3).
3. Compara el número de proyectos, pedidos y usuarios con la base en uso.
4. Anota la fecha y el resultado en la tabla de abajo.

| Fecha | Respaldo probado | Tablas restauradas | Resultado | Responsable |
|---|---|---|---|---|
| 2026-11-13 | asteron_20261113_191355.sql (48 KB) | 19 de 19, en `asteron_verificacion` | Correcto | David Alejo |
