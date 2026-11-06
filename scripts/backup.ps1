# Scienpay - PowerShell Backup Script
param(
  [string]$BackupDir = "./backups"
)

if (!(Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$BackupDir/scienpay_backup_$timestamp.sql"

Write-Host "[Scienpay Backup] Creando respaldo de PostgreSQL..." -ForegroundColor Cyan
docker exec -t scienpay_db pg_dump -U scienpay_app -d scienpay_db --clean --if-exists > $backupFile
Write-Host "[Scienpay Backup] ¡Respaldo completado en $backupFile!" -ForegroundColor Green
