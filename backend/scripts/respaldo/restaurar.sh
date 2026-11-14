#!/usr/bin/env bash
# ============================================================
# Restauración de un respaldo de Asteron (RNF-16).
#
# Uso, desde la carpeta backend:
#   ./scripts/respaldo/restaurar.sh ../respaldos/asteron_20261113_230000.sql
#   ./scripts/respaldo/restaurar.sh ../respaldos/asteron_20261113_230000.sql asteron_prueba
# Con un segundo argumento restaura en otra base (por ejemplo para verificar un
# respaldo sin tocar la base en uso). Sin él, REEMPLAZA la base DB_NAME de .env.
# ============================================================
set -euo pipefail

ARCHIVO="${1:-}"
if [ -z "$ARCHIVO" ] || [ ! -f "$ARCHIVO" ]; then
  echo "Indica el archivo de respaldo. Ejemplo: ./scripts/respaldo/restaurar.sh ../respaldos/asteron_20261113_230000.sql" >&2
  exit 1
fi

BACKEND_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
if [ -f "$BACKEND_DIR/.env" ]; then
  set -a; . "$BACKEND_DIR/.env"; set +a
fi
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-asteron}"
DESTINO="${2:-$DB_NAME}"

if [ "$DESTINO" = "$DB_NAME" ]; then
  read -r -p "Esto reemplaza TODOS los datos de la base \"$DB_NAME\". Escribe SI para continuar: " RESPUESTA
  [ "$RESPUESTA" = "SI" ] || { echo "Restauración cancelada."; exit 1; }
fi

# El respaldo trae "CREATE DATABASE `asteron`" y "USE `asteron`": se cambian por
# el nombre de destino para poder restaurar en una base distinta.
export MYSQL_PWD="${DB_PASSWORD:-}"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "DROP DATABASE IF EXISTS \`$DESTINO\`"
sed -e "s/^CREATE DATABASE .*\`$DB_NAME\`/CREATE DATABASE \`$DESTINO\`/" \
    -e "s/^USE \`$DB_NAME\`;/USE \`$DESTINO\`;/" "$ARCHIVO" \
  | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER"

TABLAS=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -N -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DESTINO'")
echo "Restaurado \"$ARCHIVO\" en la base \"$DESTINO\" ($TABLAS tablas)."
