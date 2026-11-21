#!/usr/bin/env bash
# Prepara el AMBIENTE DE PRUEBAS, separado del de desarrollo:
#   - Base de datos `asteron_test` (la de desarrollo es `asteron` y no se toca).
#   - Mismo esquema (Data Base/asteron_v2.sql), datos de prueba (seed) y migraciones.
# Después se levanta un backend aparte en el puerto 3001 apuntando a esa base:
#   cd backend && DB_NAME=asteron_test PORT=3001 node server.js
#
# Uso (desde la raíz del repositorio):  bash docs/pruebas/preparar-ambiente.sh
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
BD_PRUEBAS="asteron_test"

# Credenciales de MySQL: las mismas de backend/.env (no se imprimen)
leer() { grep -E "^$1=" "$RAIZ/backend/.env" | head -1 | cut -d= -f2- ; }
DB_HOST="${DB_HOST:-$(leer DB_HOST)}"
DB_USER="${DB_USER:-$(leer DB_USER)}"
export MYSQL_PWD="${DB_PASSWORD:-$(leer DB_PASSWORD)}"

echo "→ Creando la base $BD_PRUEBAS desde cero"
# ¡Cuidado! El esquema empieza con `DROP DATABASE IF EXISTS asteron;` y luego
# CREATE/USE asteron. Se cambia el nombre en TODAS las líneas que nombran la
# base (DROP, CREATE y USE); si quedara una sola sin cambiar, borraría la base
# de desarrollo.
# (Sin \b: el sed de macOS no lo entiende y no cambiaría nada.)
ESQUEMA="$(sed -E "/^(DROP DATABASE|CREATE DATABASE|USE )/ s/([ \`])asteron([\`; ]|\$)/\1$BD_PRUEBAS\2/g" "$RAIZ/Data Base/asteron_v2.sql")"
if printf '%s\n' "$ESQUEMA" | grep -qE "^(DROP DATABASE|CREATE DATABASE|USE ).*[ \`]asteron([\`; ]|\$)"; then
  echo "✖ El esquema todavía nombra la base 'asteron': no se ejecuta nada." >&2
  exit 1
fi
printf '%s\n' "$ESQUEMA" | mysql -h "${DB_HOST:-localhost}" -u "${DB_USER:-root}"

echo "→ Cargando datos de prueba y migraciones en $BD_PRUEBAS"
cd "$RAIZ/backend"
DB_NAME="$BD_PRUEBAS" node scripts/seed.js
DB_NAME="$BD_PRUEBAS" node scripts/migrar.js

echo "✅ Ambiente de pruebas listo. Levanta el backend de pruebas con:"
echo "   cd backend && DB_NAME=$BD_PRUEBAS PORT=3001 node server.js"
