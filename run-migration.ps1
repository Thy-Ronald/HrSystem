# Database Migration Script for Windows PowerShell
# This script runs the performance optimization migration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Migration - Performance Indexes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Database configuration from .env
$DB_USER = "root"
$DB_NAME = "hr_system"
$MIGRATION_FILE = "backend\migrations\001_add_performance_indexes.sql"

Write-Host "Database: $DB_NAME" -ForegroundColor Yellow
Write-Host "User: $DB_USER" -ForegroundColor Yellow
Write-Host "Migration: $MIGRATION_FILE" -ForegroundColor Yellow
Write-Host ""

# Check if migration file exists
if (-Not (Test-Path $MIGRATION_FILE)) {
    Write-Host "ERROR: Migration file not found!" -ForegroundColor Red
    Write-Host "Expected location: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "Migration file found ✓" -ForegroundColor Green
Write-Host ""

# Prompt for password (or press Enter if no password)
Write-Host "Enter MySQL password (or press Enter if no password):" -ForegroundColor Yellow
$password = Read-Host -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host ""
Write-Host "Running migration..." -ForegroundColor Cyan

# Run the migration
try {
    if ($plainPassword -eq "") {
        # No password
        Get-Content $MIGRATION_FILE | mysql -u $DB_USER $DB_NAME
    } else {
        # With password
        Get-Content $MIGRATION_FILE | mysql -u $DB_USER -p$plainPassword $DB_NAME
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "✓ Migration completed successfully!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Indexes created:" -ForegroundColor Cyan
        Write-Host "  ✓ idx_repo_assigned_date" -ForegroundColor Green
        Write-Host "  ✓ idx_repo_status" -ForegroundColor Green
        Write-Host "  ✓ idx_repo_state" -ForegroundColor Green
        Write-Host "  ✓ idx_repo_date_status" -ForegroundColor Green
        Write-Host "  ✓ idx_github_issue_id" -ForegroundColor Green
        Write-Host ""
        Write-Host "Table created:" -ForegroundColor Cyan
        Write-Host "  ✓ github_user_issue_stats" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next step: Restart your backend server" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "ERROR: Migration failed!" -ForegroundColor Red
        Write-Host "Please check the error message above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
