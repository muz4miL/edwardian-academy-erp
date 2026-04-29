# 🚀 STEP-BY-STEP DEPLOYMENT GUIDE

Follow these steps EXACTLY. I'll guide you through each one.

---

## ✅ STEP 1: Find Your VPS IP Address

**What to do:**
Look at your VPS dashboard or check the deployment runbook.

**Expected result:**
You should have an IP address like: `123.456.789.012`

**Tell me:** What is your VPS IP address?

---

## ✅ STEP 2: Test SSH Connection

**What to do:**
Open a NEW terminal (Git Bash or PowerShell) and run:

```bash
ssh root@YOUR_VPS_IP
```

Replace `YOUR_VPS_IP` with your actual IP.

**Expected result:**
- It will ask for a password
- Enter your root password
- You should see a command prompt like: `root@server:~#`

**If successful:** Type `exit` to close the connection for now.

**Tell me:** Did the SSH connection work? (yes/no)

---

## ✅ STEP 3: Upload the Fresh Build

**What to do:**
From your LOCAL terminal (in the project directory), run:

```bash
rsync -avz --delete frontend/dist/ root@YOUR_VPS_IP:/var/www/edwardian-frontend/
```

Replace `YOUR_VPS_IP` with your actual IP.

**What will happen:**
- It will ask for your password
- You'll see files being uploaded (progress bar)
- Takes 1-2 minutes

**Expected result:**
```
sent 10.80M bytes  received 1.23K bytes  speed: 2.5MB/s
total size is 10.80M
```

**Tell me:** Did the upload complete successfully? (yes/no)

---

## ✅ STEP 4: Set Permissions on VPS

**What to do:**
SSH into your VPS:

```bash
ssh root@YOUR_VPS_IP
```

Then run these commands ONE BY ONE:

```bash
# Command 1: Set ownership
sudo chown -R www-data:www-data /var/www/edwardian-frontend

# Command 2: Set permissions
sudo chmod -R 755 /var/www/edwardian-frontend

# Command 3: Verify files were updated
ls -lah /var/www/edwardian-frontend/index.html
```

**Expected result for Command 3:**
You should see a RECENT timestamp (today's date).

**Tell me:** What date/time does it show for index.html?

---

## ✅ STEP 5: Reload Nginx

**What to do:**
Still in the SSH session, run:

```bash
sudo systemctl reload nginx
```

**Expected result:**
No output = success!

**Optional - Check nginx status:**
```bash
sudo systemctl status nginx
```

Should show: `Active: active (running)`

**Tell me:** Did nginx reload successfully? (yes/no)

---

## ✅ STEP 6: Check Backend is Running

**What to do:**
Still in SSH, run:

```bash
pm2 status
```

**Expected result:**
```
┌─────┬──────────────────┬─────────┬─────────┐
│ id  │ name             │ status  │ restart │
├─────┼──────────────────┼─────────┼─────────┤
│ 0   │ edwardian-api    │ online  │ 0       │
└─────┴──────────────────┴─────────┴─────────┘
```

**If status is NOT "online":**
```bash
pm2 restart edwardian-api
```

**Tell me:** Is the backend status "online"? (yes/no)

---

## ✅ STEP 7: Exit SSH

**What to do:**
```bash
exit
```

You're now back on your local machine.

---

## ✅ STEP 8: Clear Browser Cache

**What to do:**

1. Open your browser
2. Press `Ctrl + Shift + Delete`
3. Select "Cached images and files"
4. Select "All time"
5. Click "Clear data"
6. **Close the browser completely**
7. Reopen the browser

**Tell me:** Did you clear the cache? (yes/no)

---

## ✅ STEP 9: Test the Website

**What to do:**

1. Open: https://erp.edwardiansacademy.com
2. Press `F12` to open DevTools
3. Go to the **Console** tab
4. Login with Owner credentials

**What to look for:**

❌ **BAD (Old build still cached):**
```
ERR_CONNECTION_REFUSED localhost:5001/api/notifications
```

✅ **GOOD (New build working):**
```
GET https://api.edwardiansacademy.com/api/notifications
GET https://api.edwardiansacademy.com/api/dashboard/stats
```

**Tell me:** What do you see in the console? (share screenshot or describe)

---

## ✅ STEP 10: Verify Network Calls

**What to do:**

1. In DevTools, go to the **Network** tab
2. Refresh the page (`Ctrl + Shift + R`)
3. Look at the API calls

**What to look for:**

All API calls should go to:
```
https://api.edwardiansacademy.com/api/*
```

NOT:
```
http://localhost:5001/api/*
```

**Tell me:** Are all API calls going to api.edwardiansacademy.com? (yes/no)

---

## 🎯 SUCCESS CRITERIA

✅ No `localhost:5001` errors in console  
✅ All API calls go to `https://api.edwardiansacademy.com`  
✅ Dashboard widgets load with data  
✅ No `ERR_CONNECTION_REFUSED` errors  
✅ Images load correctly  

---

## 🆘 TROUBLESHOOTING

### If you still see localhost:5001 errors:

**Try this:**
1. Open browser in **Incognito/Private mode**
2. Go to https://erp.edwardiansacademy.com
3. Check console again

**If it works in incognito:**
- Your browser cache is stubborn
- Clear cache again and restart browser

**If it still doesn't work:**
- Share a screenshot of the browser console
- Share a screenshot of the Network tab
- I'll help you debug further

---

## 📞 READY TO START?

**Tell me:**
1. Your VPS IP address
2. Confirm you're ready to start

Then we'll go through each step together! 🚀
