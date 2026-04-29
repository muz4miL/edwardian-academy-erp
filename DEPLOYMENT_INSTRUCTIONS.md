# 🚀 Edwardian Academy ERP - Production Deployment Instructions

## ✅ Build Status: READY FOR DEPLOYMENT

The fresh frontend build has been created successfully with the updated API configuration.

**Build Location:** `frontend/dist/`  
**Build Size:** 3.5 MB (compressed: ~1 MB)  
**API Configuration:** Runtime detection enabled for `edwardiansacademy.com`

---

## 📋 Deployment Options

Choose ONE of the following methods:

### **Option 1: Automated Script (RECOMMENDED)**

#### For Linux/Mac/Git Bash:
```bash
# 1. Edit the script and replace YOUR_VPS_IP_HERE with your actual VPS IP
nano deploy-to-vps.sh

# 2. Make it executable
chmod +x deploy-to-vps.sh

# 3. Run the deployment
./deploy-to-vps.sh
```

#### For Windows PowerShell:
```powershell
# 1. Edit the script and replace YOUR_VPS_IP_HERE with your actual VPS IP
notepad deploy-to-vps.ps1

# 2. Run the deployment
.\deploy-to-vps.ps1
```

---

### **Option 2: Manual Deployment (Step-by-Step)**

#### Step 1: Upload Build to VPS

**Using rsync (recommended):**
```bash
rsync -avz --delete frontend/dist/ root@YOUR_VPS_IP:/var/www/edwardian-frontend/
```

**Using scp (alternative):**
```bash
scp -r frontend/dist/* root@YOUR_VPS_IP:/var/www/edwardian-frontend/
```

#### Step 2: SSH into VPS and Set Permissions
```bash
ssh root@YOUR_VPS_IP

# Set proper ownership
sudo chown -R www-data:www-data /var/www/edwardian-frontend

# Set proper permissions
sudo chmod -R 755 /var/www/edwardian-frontend

# Reload nginx to clear server cache
sudo systemctl reload nginx

# Exit SSH
exit
```

---

### **Option 3: Rebuild on VPS (Alternative)**

If you prefer to rebuild directly on the VPS:

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Navigate to project
cd /var/www/edwardian-academy-erp

# Pull latest code (if pushed to GitHub)
git pull origin main

# Navigate to frontend
cd frontend

# Install dependencies
npm ci

# Build
npm run build

# Deploy
sudo rsync -av --delete dist/ /var/www/edwardian-frontend/

# Set permissions
sudo chown -R www-data:www-data /var/www/edwardian-frontend

# Reload nginx
sudo systemctl reload nginx
```

---

## 🧪 Verification Steps

After deployment, follow these steps to verify everything works:

### 1. Clear Browser Cache
- **Hard Refresh:** Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- **Or Clear Cache:** Press `Ctrl + Shift + Delete` and clear cached images and files
- **Or Use Incognito:** Open in private/incognito mode

### 2. Check API Calls in Browser Console

1. Open https://erp.edwardiansacademy.com
2. Press `F12` to open DevTools
3. Go to **Network** tab
4. Login with Owner credentials
5. **Verify:** All API calls should go to `https://api.edwardiansacademy.com/api/*`

**✅ SUCCESS:** You see `https://api.edwardiansacademy.com/api/...` requests  
**❌ FAILURE:** You still see `localhost:5001` requests

### 3. Check Console for Errors

In the **Console** tab, you should NOT see:
- ❌ `ERR_CONNECTION_REFUSED` errors
- ❌ `localhost:5001` connection errors
- ❌ CORS errors

### 4. Test Dashboard Functionality

- ✅ Monthly Revenue widget loads
- ✅ Monthly Expenses widget loads
- ✅ Notifications load (no errors)
- ✅ Student list loads
- ✅ Finance page works
- ✅ Images load correctly

---

## 🔧 Troubleshooting

### Issue: Still seeing localhost:5001 errors

**Solution 1: Clear Browser Cache Completely**
```
1. Press Ctrl + Shift + Delete
2. Select "Cached images and files"
3. Select "All time"
4. Click "Clear data"
5. Close and reopen browser
```

**Solution 2: Verify Deployment**
```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Check if files were updated
ls -lah /var/www/edwardian-frontend/

# Check the index.html modification time (should be recent)
stat /var/www/edwardian-frontend/index.html

# Check nginx is serving the right directory
sudo nginx -T | grep "root /var/www/edwardian-frontend"
```

**Solution 3: Force Nginx Cache Clear**
```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Restart nginx (not just reload)
sudo systemctl restart nginx

# Check nginx status
sudo systemctl status nginx
```

### Issue: Permission denied errors

**Solution:**
```bash
ssh root@YOUR_VPS_IP
sudo chown -R www-data:www-data /var/www/edwardian-frontend
sudo chmod -R 755 /var/www/edwardian-frontend
sudo systemctl reload nginx
```

### Issue: API calls still failing

**Check Backend Status:**
```bash
ssh root@YOUR_VPS_IP

# Check if backend is running
pm2 status

# Check backend logs
pm2 logs edwardian-api --lines 50

# Restart backend if needed
pm2 restart edwardian-api
```

**Check API Endpoint:**
```bash
# Test API directly
curl -I https://api.edwardiansacademy.com/api/auth/me

# Should return 401 (unauthorized) not connection error
```

---

## 📊 Expected Results

After successful deployment:

1. **Browser Console Network Tab:**
   ```
   GET https://api.edwardiansacademy.com/api/auth/me
   GET https://api.edwardiansacademy.com/api/notifications
   GET https://api.edwardiansacademy.com/api/dashboard/stats
   ```

2. **No Console Errors:**
   - No `ERR_CONNECTION_REFUSED`
   - No `localhost:5001` references
   - No CORS errors

3. **Dashboard Loads:**
   - All widgets display data
   - No loading spinners stuck
   - Images load correctly

---

## 🆘 Need Help?

If you're still experiencing issues after following these steps:

1. **Take a screenshot** of:
   - Browser console (F12 → Console tab)
   - Network tab showing failed requests
   - The dashboard page

2. **Provide this information:**
   - Which deployment method you used
   - Any error messages from the deployment process
   - Browser and version you're using
   - Whether you cleared the cache

3. **Check these files on VPS:**
   ```bash
   # Verify nginx config
   sudo cat /etc/nginx/sites-available/edwardian
   
   # Check nginx error logs
   sudo tail -50 /var/log/nginx/error.log
   
   # Check if frontend files exist
   ls -lah /var/www/edwardian-frontend/
   ```

---

## 📝 Notes

- The build includes runtime API URL detection
- No environment variables are hardcoded in the build
- The same build works for any domain containing `edwardiansacademy.com`
- Browser cache MUST be cleared after deployment
- Nginx cache MUST be cleared on the server

---

**Last Build:** $(date)  
**Build Tool:** Vite 7.3.0  
**Build Time:** 15.05s  
**Status:** ✅ Ready for Production
