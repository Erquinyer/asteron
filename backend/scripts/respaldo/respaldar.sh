#!/usr/bin/env bash
# ============================================================
# Respaldo de la base de datos de Asteron (RNF-16).
# Genera respaldos/asteron_AAAAMMDD_HHMMSS.sql con estructura y datos, y
# conserva solo los últimos RETENCION respaldos (7 por defecto).
#
# Uso, desde la carpeta backend:   pnpm respaldo
# Lee DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME de backend/.env.
# Variables opcionales: RESPALDO_DIR (../respaldos), RETENCION (7)
# Para programarlo cada noche en macOS o Linux (crontab -e):
#   0 23 * * * cd /ruta/a/asteron/backend && ./scripts/respaldo/respaldar.sh >> ../respaldos/respaldo.log 2>&1
# ============================================================
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
if [ -f "$BACKEND_DIR/.env" ]; then
  set -a; . "$BACKEND_DIR/.env"; set +a
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-asteron}"
RESPALDO_DIR="${RESPALDO_DIR:-$BACKEND_DIR/../respaldos}"
RETENCION="${RETENCION:-7}"

if ! command -v mysqldump >/dev/null 2>&1; then
  echo "No se encontró mysqldump. Instala el cliente de MySQL (en macOS: brew install mysql-client)." >&2
  exit 1
fi

mkdir -p "$RESPALDO_DIR"
ARCHIVO="$RESPALDO_DIR/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"

# --single-transaction: copia consistente sin bloquear las tablas (InnoDB)
# --set-gtid-purged=OFF: el respaldo se puede restaurar en otra base o servidor
# MYSQL_PWD evita escribir la contraseña en la línea de comandos
MYSQL_PWD="${DB_PASSWORD:-}" mysqldump \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF \
  --databases "$DB_NAME" > "$ARCHIVO.tmp"
mv "$ARCHIVO.tmp" "$ARCHIVO"

echo "Respaldo creado: $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"

# Retención: borra los más antiguos y deja solo los últimos $RETENCION
i=0
for f in $(ls -1t "$RESPALDO_DIR"/"${DB_NAME}"_*.sql 2>/dev/null); do
  i=$((i + 1))
  if [ "$i" -gt "$RETENCION" ]; then
    rm -f "$f"
    echo "Respaldo antiguo eliminado: $f"
  fi
done
