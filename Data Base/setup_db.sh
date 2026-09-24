#!/bin/bash
# ============================================================
# setup_db.sh — Crea la base de datos asteron desde cero (macOS)
# Uso (desde la raíz del repo):  bash "Data Base/setup_db.sh"
# ADVERTENCIA: borra y recrea la base asteron con datos de prueba.
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
SQL_FILE="$SCRIPT_DIR/asteron_v2.sql"

echo "== 1/5 Verificando MySQL =="
if ! mysqladmin ping >/dev/null 2>&1; then
  echo "MySQL no está corriendo. Iniciándolo con Homebrew..."
  brew services start mysql
  for i in {1..15}; do
    mysqladmin ping >/dev/null 2>&1 && break
    sleep 1
  done
fi

echo ""
read -s -p "Contraseña de root de MySQL (Enter si no tiene): " DB_PASS
echo ""
export MYSQL_PWD="$DB_PASS"

if ! mysql -u root -e "SELECT 1" >/dev/null 2>&1; then
  echo "No se pudo conectar a MySQL como root. Revisa la contraseña o que MySQL esté corriendo."
  exit 1
fi

echo "== 2/5 Creando base asteron e importando esquema =="
mysql -u root < "$SQL_FILE"
echo "Tablas creadas: $(mysql -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='asteron'")"

echo "== 3/5 Configurando backend/.env =="
if [ ! -f "$BACKEND_DIR/.env" ]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo ".env creado desde .env.example"
fi
PW="$DB_PASS" perl -pi -e 's/^DB_PASSWORD=.*/DB_PASSWORD=$ENV{PW}/' "$BACKEND_DIR/.env"

echo "== 4/5 Instalando dependencias y ejecutando migraciones =="
cd "$BACKEND_DIR"
[ -d node_modules ] || npm install
node scripts/migrate_admin_role.js
node scripts/migrate_acciones_modulo.js

echo "== 5/5 Cargando datos de prueba (seed) =="
npm run seed

echo ""
echo "Listo. Ahora ejecuta:  cd backend && npm run dev"
