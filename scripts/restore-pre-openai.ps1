# Restaura el proyecto al estado anterior a la integración OpenAI
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backup = Join-Path $root ".restore-point\pre-openai"

if (-not (Test-Path $backup)) {
    Write-Host "ERROR: No se encontró el backup en $backup" -ForegroundColor Red
    exit 1
}

Write-Host "Restaurando desde $backup ..." -ForegroundColor Yellow

Copy-Item (Join-Path $backup "services\openaiService.js") (Join-Path $root "services\") -Force
Copy-Item (Join-Path $backup "services\autoReplyService.js") (Join-Path $root "services\") -Force
Copy-Item (Join-Path $backup "config\env.js") (Join-Path $root "config\") -Force
Copy-Item (Join-Path $backup "package.json") (Join-Path $root) -Force
Copy-Item (Join-Path $backup ".env.example") (Join-Path $root) -Force

# Eliminar archivos añadidos por OpenAI (si existen)
$toRemove = @(
    "config\openai.js",
    "utils\complexMessage.js",
    "RESTORE_POINT.md"
)
foreach ($f in $toRemove) {
    $path = Join-Path $root $f
    if (Test-Path $path) { Remove-Item $path -Force; Write-Host "Eliminado: $f" }
}

Set-Location $root
npm install

Write-Host ""
Write-Host "Restauración completada. Revisa .env (quita variables OPENAI_* extra si las añadiste)." -ForegroundColor Green
Write-Host "Reinicia el bot: npm start" -ForegroundColor Green
