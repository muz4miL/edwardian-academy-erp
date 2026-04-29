#!/bin/bash
# Quick Deploy Script - Edwardian Academy ERP
# This script will guide you through the deployment process

set -e

echo "=========================================="
echo "Edwardian Academy ERP - Quick Deploy"
echo "=========================================="
echo ""

# Check if VPS IP is provided
if [ -z "$1" ]; then
    echo "Usage: ./quick-deploy.sh YOUR_VPS_IP"
    echo ""
    echo "Example: ./quick-deploy.sh 123.456.789.012"
    echo ""
    exit 1
fi

VPS_IP=$1
VPS_USER="root"
VPS_PATH="/var/www/edwardian-frontend"
LOCAL_DIST="./frontend/dist"

echo "Configuration:"
echo "  VPS IP: $VPS_IP"
echo "  VPS User: $VPS_USER"
echo "  VPS Path: $VPS_PATH"
echo "  Local Build: $LOCAL_DIST"
echo ""

# Check if dist folder exists
if [ ! -d "$LOCAL_DIST" ]; then
    echo "❌ Error: Build folder not found at $LOCAL_DIST"
    echo "Please run 'npm run build' in the frontend directory first."
    exit 1
fi

echo "✓ Build folder found"
echo ""

# Confirm deployment
read -p "Deploy to $VPS_IP? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "Step 1/4: Uploading files to VPS..."
rsync -avz --delete -e "ssh" "$LOCAL_DIST/" "$VPS_USER@$VPS_IP:$VPS_PATH/" || {
    echo "❌ Upload failed. Please check your SSH connection and VPS IP."
    exit 1
}
echo "✓ Upload complete"
echo ""

echo "Step 2/4: Setting permissions..."
ssh "$VPS_USER@$VPS_IP" "sudo chown -R www-data:www-data $VPS_PATH && sudo chmod -R 755 $VPS_PATH" || {
    echo "❌ Permission setting failed."
    exit 1
}
echo "✓ Permissions set"
echo ""

echo "Step 3/4: Reloading Nginx..."
ssh "$VPS_USER@$VPS_IP" "sudo systemctl reload nginx" || {
    echo "❌ Nginx reload failed."
    exit 1
}
echo "✓ Nginx reloaded"
echo ""

echo "Step 4/4: Verifying deployment..."
ssh "$VPS_USER@$VPS_IP" "ls -lah $VPS_PATH/index.html" || {
    echo "⚠️  Warning: Could not verify index.html"
}
echo ""

echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Open https://erp.edwardiansacademy.com"
echo "2. Press Ctrl+Shift+R to hard refresh"
echo "3. Check browser console (F12)"
echo "4. Verify API calls go to https://api.edwardiansacademy.com"
echo ""
echo "If you still see localhost:5001 errors:"
echo "- Clear browser cache completely"
echo "- Try incognito/private mode"
echo "- Check the troubleshooting guide in DEPLOYMENT_INSTRUCTIONS.md"
echo ""
