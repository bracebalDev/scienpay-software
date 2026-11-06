#!/bin/bash
# Scienpay - Script de Restauración de Base de Datos PostgreSQL
set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Uso: ./scripts/restore.sh <ruta_al_archivo_sql>"
  exit 1
fi

DB_CONTAINER="${DB_CONTAINER:-scienpay_db}"
DB_USER="${DATABASE_USER:-scienpay_app}"
DB_NAME="${DATABASE_NAME:-scienpay_db}"

echo "[Scienpay Restore] Restaurando '$BACKUP_FILE' en contenedor '$DB_CONTAINER'..."

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"

echo "[Scienpay Restore] ¡Restauración completada con éxito!"
