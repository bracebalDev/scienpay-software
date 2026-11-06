#!/bin/bash
# Scienpay - Script de Respaldo de Base de Datos PostgreSQL
set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/scienpay_backup_${TIMESTAMP}.sql"

DB_CONTAINER="${DB_CONTAINER:-scienpay_db}"
DB_USER="${DATABASE_USER:-scienpay_app}"
DB_NAME="${DATABASE_NAME:-scienpay_db}"

echo "[Scienpay Backup] Iniciando respaldo de '$DB_NAME' desde contenedor '$DB_CONTAINER'..."

docker exec -t "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists > "$BACKUP_FILE"

echo "[Scienpay Backup] ¡Respaldo completado exitosamente en: $BACKUP_FILE!"
