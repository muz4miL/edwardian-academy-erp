# Edwardian Academy ERP - VPS Deployment Script (PowerShell)
# This script deploys the fresh frontend build to your VPS

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Edwardian Academy ERP - VPS Deployment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$VPS_USER = "root"
$VPS_IP = "YOUR_VPS_IP_HERE"  # Replace with your actual VPS IP
$VPS_FRONTEND_PATH = "/var/www/edwardian-frontend"
$LOCAL_DIST_PATH = "./frontend/dist"

# Check if dist folder exists
if (-not (Test-Path $LOCAL_DIST_PATH)) {
    Write-Host "Error: frontend/dist folder not found!" -ForegroundColor Red
    Write-Host "Please run 'npm run build' in the frontend directory first."
    exit 1
}

Write-Host "Step 1: Verifying local build..." -ForegroundColor Yellow
Write-Host "Build folder: $LOCAL_DIST_PATH"
$size = (Get-ChildItem $LOCAL_DIST_PATH -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Build size: $([math]::Round($size, 2)) MB"
Write-Host ""

Write-Host "Step 2: Uploading build to VPS..." -ForegroundColor Yellow
Write-Host "Target: ${VPS_USER}@${VPS_IP}:${VPS_FRONTEND_PATH}"
Write-Host ""

# Check if rsync is available (via WSL or Git Bash)
$rsyncAvailable = Get-Command rsync -ErrorAction SilentlyContinue

if ($rsyncAvailable) {
    # Use rsync if available
    rsync -avz --delete -e "ssh" "$LOCAL_DIST_PATH/" "${VPS_USER}@${VPS_IP}:${VPS_FRONTEND_PATH}/"
} else {
    # Fallback to scp
    Write-Host "Rsync not found, using scp instead..." -ForegroundColor Yellow
    scp -r "$LOCAL_DIST_PATH/*" "${VPS_USER}@${VPS_IP}:${VPS_FRONTEND_PATH}/"
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Upload successful!" -ForegroundColor Green
} else {
    Write-Host "✗ Upload failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Setting permissions on VPS..." -ForegroundColor Yellow

# SSH into VPS and set proper permissions
$sshCommands = @"
sudo chown -R www-data:www-data /var/www/edwardian-frontend
sudo chmod -R 755 /var/www/edwardian-frontend
echo '✓ Permissions set'
"@

ssh "${VPS_USER}@${VPS_IP}" $sshCommands

Write-Host ""
Write-Host "Step 4: Reloading Nginx..." -ForegroundColor Yellow

# Reload nginx
ssh "${VPS_USER}@${VPS_IP}" "sudo systemctl reload nginx && echo '✓ Nginx reloaded'"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Open https://erp.edwardiansacademy.com in your browser"
Write-Host "2. Press Ctrl+Shift+R (hard refresh) to clear browser cache"
Write-Host "3. Open DevTools (F12) → Network tab"
Write-Host "4. Verify API calls go to: https://api.edwardiansacademy.com/api/*"
Write-Host ""
Write-Host "If you still see localhost:5001 errors:"
Write-Host "- Clear browser cache completely (Ctrl+Shift+Delete)"
Write-Host "- Try in incognito/private mode"
Write-Host "- Check browser console for any errors"
Write-Host ""
