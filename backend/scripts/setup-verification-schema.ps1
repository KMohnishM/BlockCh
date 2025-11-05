# Apply new verification schema changes

Write-Host "Applying verification schema changes..." -ForegroundColor Cyan

# Get database credentials from environment
$DB_PASSWORD = $env:SUPABASE_DB_PASSWORD
$DB_HOST = $env:SUPABASE_DB_HOST
$DB_NAME = $env:SUPABASE_DB_NAME
$DB_PORT = $env:SUPABASE_DB_PORT
$DB_USER = $env:SUPABASE_DB_USER

if (-not $DB_PASSWORD -or -not $DB_HOST -or -not $DB_NAME -or -not $DB_PORT -or -not $DB_USER) {
    Write-Host "Error: Database environment variables not set. Please set the following:" -ForegroundColor Red
    Write-Host "SUPABASE_DB_PASSWORD" -ForegroundColor Yellow
    Write-Host "SUPABASE_DB_HOST" -ForegroundColor Yellow
    Write-Host "SUPABASE_DB_NAME" -ForegroundColor Yellow
    Write-Host "SUPABASE_DB_PORT" -ForegroundColor Yellow
    Write-Host "SUPABASE_DB_USER" -ForegroundColor Yellow
    exit 1
}

# Create a temporary PGPASSFILE
$env:PGPASSFILE = Join-Path $env:TEMP "pgpass_temp.conf"
"${DB_HOST}:${DB_PORT}:${DB_NAME}:${DB_USER}:${DB_PASSWORD}" | Out-File $env:PGPASSFILE -Encoding ASCII

# Set file permissions (Windows doesn't care about this but included for completeness)
if ($IsWindows) {
    icacls $env:PGPASSFILE /inheritance:r /grant:r "${env:USERNAME}:(R)"
} else {
    chmod 600 $env:PGPASSFILE
}

try {
    # Run the schema update
    Write-Host "Applying schema changes..." -ForegroundColor Yellow
    $schemaFile = Join-Path $PSScriptRoot "..\database\verification_schema.sql"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $schemaFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Schema changes applied successfully!" -ForegroundColor Green
    } else {
        Write-Host "Error applying schema changes" -ForegroundColor Red
        exit 1
    }
} finally {
    # Clean up the temporary PGPASSFILE
    Remove-Item $env:PGPASSFILE -Force
    Remove-Item Env:\PGPASSFILE
}

Write-Host "Setup completed!" -ForegroundColor Green