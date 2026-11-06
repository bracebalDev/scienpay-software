# Scienpay - PowerShell Restore Script
param(
  [Parameter(Mandatory=$true)]
  [string]$BackupFile
)

if (!(Test-Path $BackupFile)) {
  Write-Error "El archivo de respaldo '$BackupFile' no existe."
  exit 1
}

Write-Host "[Scienpay Restore] Restaurando $BackupFile en scienpay_db..." -ForegroundColor Cyan
Get-Content $BackupFile | docker exec -i scienpay_db psql -U scienpay_app -d scienpay_db
Write-Host "[Scienpay Restore] ¡Restauración finalizada exitosamente!" -ForegroundColor Green
