#!/bin/bash
# Edwardian Academy ERP - VPS Deployment Script
# This script deploys the fresh frontend build to your VPS

set -e  # Exit on any error

echo "=========================================="
echo "Edwardian Academy ERP - VPS Deployment"
echo "=========================================="
echo ""

# Configuration
VPS_USER="root"
VPS_IP="YOUR_VPS_IP_HERE"  # Replace with your actual VPS IP
VPS_FRONTEND_PATH="/var/www/edwardian-frontend"
LOCAL_DIST_PATH="./frontend/dist"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if dist folder exists
if [ ! -d "$LOCAL_DIST_PATH" ]; then
    echo -e "${RED}Error: frontend/dist folder not found!${NC}"
    echo "Please run 'npm run build' in the frontend directory first."
    exit 1
fi

echo -e "${YELLOW}Step 1: Verifying local build...${NC}"
echo "Build folder: $LOCAL_DIST_PATH"
echo "Build size: $(du -sh $LOCAL_DIST_PATH | cut -f1)"
echo ""

echo -e "${YELLOW}Step 2: Uploading build to VPS...${NC}"
echo "Target: $VPS_USER@$VPS_IP:$VPS_FRONTEND_PATH"
echo ""

# Upload the dist folder to VPS
rsync -avz --delete \
    -e "ssh" \
    "$LOCAL_DIST_PATH/" \
    "$VPS_USER@$VPS_IP:$VPS_FRONTEND_PATH/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Upload successful!${NC}"
else
    echo -e "${RED}✗ Upload failed!${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Setting permissions on VPS...${NC}"

# SSH into VPS and set proper permissions
ssh "$VPS_USER@$VPS_IP" << 'ENDSSH'
    sudo chown -R www-data:www-data /var/www/edwardian-frontend
    sudo chmod -R 755 /var/www/edwardian-frontend
    echo "✓ Permissions set"
ENDSSH

echo ""
echo -e "${YELLOW}Step 4: Reloading Nginx...${NC}"

# Reload nginx to clear any server-side cache
ssh "$VPS_USER@$VPS_IP" << 'ENDSSH'
    sudo systemctl reload nginx
    echo "✓ Nginx reloaded"
ENDSSH

echo ""
echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Open https://erp.edwardiansacademy.com in your browser"
echo "2. Press Ctrl+Shift+R (hard refresh) to clear browser cache"
echo "3. Open DevTools (F12) → Network tab"
echo "4. Verify API calls go to: https://api.edwardiansacademy.com/api/*"
echo ""
echo "If you still see localhost:5001 errors:"
echo "- Clear browser cache completely (Ctrl+Shift+Delete)"
echo "- Try in incognito/private mode"
echo "- Check browser console for any errors"
echo ""
