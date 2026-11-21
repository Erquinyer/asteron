#!/bin/bash
# ============================================================
# restaurar.sh — Restaura un respaldo creado con respaldar.sh (RNF-16)
#
# Uso (desde la raíz del repo):
#   bash "Data Base/restaurar.sh" respaldos/asteron_20261113_020000.sql.gz
#        → reemplaza la base asteron con el contenido del respaldo
#   bash "Data Base/restaurar.sh" respaldos/asteron_20261113_020000.sql.gz asteron_prueba
#        → lo restaura en otra base (asteron_prueba) para revisarlo sin tocar la real
#
# Antes de reemplazar la base real se hace un respaldo de seguridad del estado
# actual, por si el archivo elegido no era el correcto.
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/backend/.env"

ARCHIVO="${1:-}"
if [ -z "$ARCHIVO" ] || [ ! -f "$ARCHIVO" ]; then
  echo "Uso: bash \"Data Base/restaurar.sh\" <archivo.sql.gz> [base_destino]"
  echo "Respaldos disponibles:"
  ls -1t "$ROOT_DIR"/respaldos/*.sql.gz 2>/dev/null || echo "  (ninguno en respaldos/)"
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r clave valor; do
    case "$clave" in
      DB_HOST|DB_PORT|DB_USER|DB_PASSWORD|DB_NAME)
        [ -z "${!clave+x}" ] && export "$clave=$valor" ;;
    esac
  done < "$ENV_FILE"
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-asteron}"
DESTINO="${2:-$DB_NAME}"
export MYSQL_PWD="${DB_PASSWORD:-}"

gzip -t "$ARCHIVO" || { echo "El archivo está dañado o no es un respaldo .sql.gz válido"; exit 1; }

if [ "$DESTINO" = "$DB_NAME" ]; then
  echo "ADVERTENCIA: se reemplazarán todos los datos de la base '$DB_NAME' en $DB_HOST con:"
  echo "  $ARCHIVO"
  read -r -p "Escribe RESTAURAR para continuar: " confirmacion
  [ "$confirmacion" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }

  echo "== Respaldo de seguridad del estado actual =="
  bash "$SCRIPT_DIR/respaldar.sh"
fi

echo "== Restaurando en '$DESTINO' =="
# El respaldo trae "CREATE DATABASE `asteron`" y "USE `asteron`"; si el destino es otro,
# solo se reescriben esas dos líneas para que los datos caigan en la base indicada
gunzip -c "$ARCHIVO" \
  | sed -E "s/^(CREATE DATABASE .*|USE )\`[^\`]+\`/\1\`$DESTINO\`/" \
  | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER"

TABLAS=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -N -e \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DESTINO'")
echo "Restauración completa: $TABLAS tablas en '$DESTINO'."
