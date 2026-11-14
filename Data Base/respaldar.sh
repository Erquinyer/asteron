#!/bin/bash
# ============================================================
# respaldar.sh — Copia de seguridad de la base asteron (RNF-16)
#
# Uso (desde la raíz del repo):
#   bash "Data Base/respaldar.sh"            → hace un respaldo y termina
#   INTERVALO_HORAS=24 bash "Data Base/respaldar.sh"
#                                            → respalda cada 24 h sin detenerse
#                                              (así lo corre el servicio "respaldo" de Docker)
#
# Cada respaldo queda en respaldos/asteron_AAAAMMDD_HHMMSS.sql.gz y solo se
# conservan los RETENER más recientes (7 por defecto).
#
# Conexión: toma DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME del entorno;
# si no están, los lee de backend/.env.
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/backend/.env"

# Lee solo las variables DB_* de backend/.env, sin ejecutar el archivo
if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r clave valor; do
    case "$clave" in
      DB_HOST|DB_PORT|DB_USER|DB_PASSWORD|DB_NAME)
        # Las variables que ya vienen del entorno tienen prioridad sobre el archivo
        [ -z "${!clave+x}" ] && export "$clave=$valor" ;;
    esac
  done < "$ENV_FILE"
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-asteron}"
RESPALDOS_DIR="${RESPALDOS_DIR:-$ROOT_DIR/respaldos}"
RETENER="${RETENER:-7}"

# La contraseña va por variable de entorno y no en la línea de comandos,
# así no aparece en la lista de procesos del servidor
export MYSQL_PWD="${DB_PASSWORD:-}"

respaldar() {
  mkdir -p "$RESPALDOS_DIR"
  local fecha archivo temporal
  fecha="$(date +%Y%m%d_%H%M%S)"
  archivo="$RESPALDOS_DIR/${DB_NAME}_${fecha}.sql.gz"
  temporal="$archivo.parcial"

  # --single-transaction: copia consistente sin bloquear las tablas InnoDB mientras la planta trabaja
  # --databases: el respaldo incluye CREATE DATABASE/USE, así se restaura con un solo comando
  # --no-tablespaces: evita pedir el privilegio PROCESS a usuarios que no son root
  # --set-gtid-purged=OFF: sin esto el respaldo no se puede cargar en un servidor que ya tiene historial GTID
  # Se escribe primero en .parcial: si mysqldump falla a mitad, no queda un respaldo incompleto con nombre válido.
  # La comprobación es explícita porque, en el modo automático (respaldar || ...), bash ignora "set -e".
  if ! mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
      --single-transaction --routines --triggers --events --no-tablespaces --set-gtid-purged=OFF \
      --databases "$DB_NAME" | gzip > "$temporal" \
    || ! gzip -t "$temporal"; then
    rm -f "$temporal"
    return 1
  fi
  mv "$temporal" "$archivo"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Respaldo creado: $archivo ($(du -h "$archivo" | awk '{print $1}'))"

  # Rotación: borra los más antiguos y deja solo los RETENER más recientes
  ls -1t "$RESPALDOS_DIR"/"${DB_NAME}"_*.sql.gz | tail -n +"$((RETENER + 1))" | while read -r viejo; do
    rm -f "$viejo"
    echo "  Eliminado por rotación: $(basename "$viejo")"
  done
}

if [ -n "${INTERVALO_HORAS:-}" ]; then
  echo "Respaldo automático de '$DB_NAME' cada $INTERVALO_HORAS h (se conservan $RETENER)"
  while true; do
    # Un fallo puntual (p. ej. la base reiniciando) no debe detener los respaldos siguientes
    respaldar || echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: el respaldo falló, se reintenta en el próximo ciclo" >&2
    sleep "$((INTERVALO_HORAS * 3600))"
  done
else
  respaldar
fi
