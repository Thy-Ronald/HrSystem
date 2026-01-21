# Script to update .env file with MySQL database configuration
# Run this script: powershell -ExecutionPolicy Bypass -File update-env.ps1

$envPath = Join-Path $PSScriptRoot ".env"

# Check if .env exists, if not create it
if (-not (Test-Path $envPath)) {
    Write-Host "Creating new .env file..."
    New-Item -Path $envPath -ItemType File | Out-Null
}

# Read existing content
$existingContent = Get-Content $envPath -Raw -ErrorAction SilentlyContinue

# Database configuration to add
$dbConfig = @"

# Database Configuration (MySQL 8+)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=hr_system
DB_CONNECTION_LIMIT=10
DB_SSL=false
"@

# Check if database config already exists
if ($existingContent -match "DB_HOST") {
    Write-Host "Database configuration already exists in .env file."
    Write-Host "Please update manually if needed."
} else {
    # Append database configuration
    Add-Content -Path $envPath -Value $dbConfig
    Write-Host "✓ Database configuration added to .env file"
    Write-Host ""
    Write-Host "⚠ IMPORTANT: Update DB_PASSWORD with your MySQL password"
    Write-Host "⚠ Update other database settings if needed"
}
