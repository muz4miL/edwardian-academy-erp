# VPS Deployment Playbook
## React + Node.js + MongoDB on Ubuntu VPS (Nginx + PM2)

> Written after a painful 3-day deployment of Edwardian Academy ERP.
> Follow this exactly and you'll be live in under 2 hours.

---

## MISTAKES TO NEVER REPEAT

1. **Never deploy without gzip enabled** — a 3.5MB JS bundle over a slow connection = blank page for minutes
2. **Never use `no-store` on hashed assets** — Vite hashes filenames, cache them for 1 year
3. **Never enable HTTP/2 without testing** — caused `ERR_HTTP2_PROTOCOL_ERROR` on nginx with certain SSL configs
4. **Never deploy without code splitting** — one 3.5MB chunk stalls; 8 × 200KB chunks load in parallel
5. **Never leave `credentials: 'include'` missing** — causes silent auth failures on every API call
6. **Always set `VITE_API_BASE_URL` before building** — wrong URL baked into bundle = broken in production
7. **Never SCP while SSH is open to same server** — causes connection conflicts
8. **Always fix file permissions after SCP** — nginx runs as `www-data`, wrong ownership = 403 errors

---

## PRE-DEPLOYMENT CHECKLIST (do this BEFORE touching the VPS)

### 1. Verify environment variables
```
frontend/.env must contain:
VITE_API_BASE_URL=https://api.YOURDOMAIN.com

backend/.env must contain:
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://erp.YOURDOMAIN.com   ← CORS origin
COOKIE_DOMAIN=.YOURDOMAIN.com             ← for cross-subdomain cookies
```

### 2. Verify CORS in backend
Every API response must allow your frontend origin with credentials:
```js
// In your Express app
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,   // ← CRITICAL for cookie auth
}));
```

### 3. Verify all frontend API calls have credentials
```ts
// Every fetch() call must have:
credentials: 'include'
// Without this, auth cookies are never sent → 401 on every request
```

### 4. Build with code splitting
Your `vite.config.ts` must have this:
```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-ui': ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
        'vendor-charts': ['recharts'],
        'vendor-pdf': ['@react-pdf/renderer'],
        'vendor-motion': ['framer-motion'],
        'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        'vendor-query': ['@tanstack/react-query'],
      },
    },
  },
},
```
This turns one 3.5MB file into 8 parallel chunks. Critical for slow connections.

### 5. Run the build locally and verify
```bash
cd frontend
npm run build
# Check dist/assets/ — you should see multiple vendor-*.js files
# Largest single file should be under 600KB gzipped
```

---

## VPS SETUP (one-time, first deployment only)

### Step 1: Connect and update
```bash
ssh root@YOUR_VPS_IP
apt update && apt upgrade -y
```

### Step 2: Install Node.js (via nvm — never use apt for Node)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node --version  # should show v20.x.x
```

### Step 3: Install PM2 and nginx
```bash
npm install -g pm2
apt install nginx -y
```

### Step 4: Install MongoDB (if self-hosted) or skip if using Atlas
```bash
# Skip this if using MongoDB Atlas (recommended)
```

### Step 5: Create web directories
```bash
mkdir -p /var/www/YOUR_APP_frontend
mkdir -p /var/www/YOUR_APP_backend
```

### Step 6: Clone or upload backend
```bash
# Option A: git clone
git clone YOUR_REPO /var/www/YOUR_APP_backend

# Option B: SCP from local
scp -r ./backend/* root@YOUR_VPS_IP:/var/www/YOUR_APP_backend/
```

### Step 7: Install backend dependencies and create .env
```bash
cd /var/www/YOUR_APP_backend
npm install
nano .env   # paste your production env vars
```

### Step 8: Start backend with PM2
```bash
pm2 start server.js --name YOUR_APP_api
pm2 save
pm2 startup   # run the command it outputs to auto-start on reboot
```

### Step 9: Verify backend is running
```bash
pm2 list                          # should show "online"
curl http://localhost:5000/api/health   # should return JSON
```

---

## NGINX CONFIGURATION (copy-paste this, replace YOUR values)

Save as `/etc/nginx/sites-available/YOUR_APP`:

```nginx
# API subdomain → Node.js backend
server {
    server_name api.YOURDOMAIN.com;
    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/YOURDOMAIN.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOURDOMAIN.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# ERP subdomain → React frontend
server {
    server_name erp.YOURDOMAIN.com;
    root /var/www/YOUR_APP_frontend;
    index index.html;

    # Hashed assets (JS/CSS) — cache 1 year, immutable
    # Vite puts content hash in filename so this is safe
    location /assets/ {
        sendfile on;
        tcp_nopush on;
        tcp_nodelay on;
        output_buffers 2 512k;
        postpone_output 0;
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # Images and fonts at root level — cache 7 days
    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        add_header Cache-Control "public, max-age=604800";
        try_files $uri =404;
    }

    # index.html — never cache (so new deploys are picked up instantly)
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        try_files $uri =404;
    }

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/YOURDOMAIN.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOURDOMAIN.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP → HTTPS redirects
server {
    if ($host = erp.YOURDOMAIN.com) { return 301 https://$host$request_uri; }
    listen 80;
    server_name erp.YOURDOMAIN.com;
    return 404;
}

server {
    if ($host = api.YOURDOMAIN.com) { return 301 https://$host$request_uri; }
    listen 80;
    server_name api.YOURDOMAIN.com;
    return 404;
}
```

Enable it:
```bash
ln -s /etc/nginx/sites-available/YOUR_APP /etc/nginx/sites-enabled/
nginx -t   # must say "syntax ok"
systemctl reload nginx
```

---

## NGINX GLOBAL CONFIG `/etc/nginx/nginx.conf`

Replace the http {} block with this (critical — gzip was disabled by default):

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Only modern TLS
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    access_log /var/log/nginx/access.log;

    # GZIP — critical for performance, disabled by default on Ubuntu
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        application/json
        application/javascript
        text/xml
        application/xml
        application/xml+rss
        text/javascript
        application/wasm
        font/woff
        font/woff2
        image/svg+xml;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

**DO NOT enable HTTP/2** (`listen 443 ssl http2`) — causes `ERR_HTTP2_PROTOCOL_ERROR` on some nginx/SSL combinations.

---

## SSL CERTIFICATES (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx -y

# Get certs for all your subdomains at once
certbot --nginx -d YOURDOMAIN.com -d www.YOURDOMAIN.com -d erp.YOURDOMAIN.com -d api.YOURDOMAIN.com

# Verify auto-renewal works
certbot renew --dry-run
```

---

## FRONTEND DEPLOYMENT (every time you update)

```bash
# 1. On your LOCAL machine — build
cd frontend
npm run build

# 2. Upload to VPS
scp -r dist/* root@YOUR_VPS_IP:/var/www/YOUR_APP_frontend/

# 3. On VPS — fix permissions
ssh root@YOUR_VPS_IP "chown -R www-data:www-data /var/www/YOUR_APP_frontend && systemctl reload nginx"
```

That's it. 3 commands. Done.

---

## BACKEND DEPLOYMENT (every time you update)

```bash
# 1. Upload changed files
scp -r backend/* root@YOUR_VPS_IP:/var/www/YOUR_APP_backend/

# 2. On VPS — install deps and restart
ssh root@YOUR_VPS_IP "cd /var/www/YOUR_APP_backend && npm install && pm2 restart YOUR_APP_api"
```

---

## VERIFICATION CHECKLIST (run after every deployment)

```bash
# 1. Backend is running
pm2 list   # status = online

# 2. API responds
curl https://api.YOURDOMAIN.com/api/health

# 3. Gzip is working (must see Content-Encoding: gzip)
curl -sI -H "Accept-Encoding: gzip" https://erp.YOURDOMAIN.com/assets/index-*.js | grep content-encoding

# 4. Caching is working (must see max-age=31536000)
curl -sI https://erp.YOURDOMAIN.com/assets/index-*.js | grep cache-control

# 5. Frontend loads
curl -sI https://erp.YOURDOMAIN.com/login | grep "HTTP/1.1 200"

# 6. CORS works
curl -sI -X OPTIONS https://api.YOURDOMAIN.com/api/auth/me \
  -H "Origin: https://erp.YOURDOMAIN.com" | grep -i "access-control"
```

All 6 must pass before you tell anyone the site is live.

---

## BROWSER VERIFICATION (30 seconds)

1. Open site in **incognito** (no cache)
2. Open DevTools → Network tab
3. Reload
4. Check:
   - All JS files show status **200** (not pending/stalled)
   - `index.html` shows `Cache-Control: no-cache`
   - `/assets/*.js` shows `Cache-Control: max-age=31536000`
   - `Content-Encoding: gzip` on JS files
   - No `ERR_HTTP2_PROTOCOL_ERROR` in console
   - Page loads in **under 5 seconds** on first visit

---

## PROMPT TO GIVE YOUR AI ASSISTANT FOR NEXT DEPLOYMENT

Copy this entire block and paste it at the start of your next session:

---

```
I need to deploy a React + Node.js + MongoDB web app to a VPS.
Tech stack: Vite + React + TypeScript frontend, Express + MongoDB backend, Ubuntu VPS, nginx, PM2.

CRITICAL REQUIREMENTS — do not skip any of these:

1. GZIP: Enable gzip in /etc/nginx/nginx.conf for JS/CSS/JSON. Ubuntu nginx has it disabled by default. Without this a 3.5MB JS bundle takes minutes to load.

2. CACHING: Vite hashes asset filenames. Set Cache-Control: public, max-age=31536000, immutable on /assets/ location. Set no-cache only on index.html.

3. NO HTTP/2: Do NOT use "listen 443 ssl http2" — causes ERR_HTTP2_PROTOCOL_ERROR on file transfers.

4. CODE SPLITTING: Add manualChunks to vite.config.ts splitting react, ui libs, charts, pdf, motion, forms, query into separate vendor chunks. This prevents one large stalled download from blocking the page.

5. CREDENTIALS: Every frontend fetch() call must have credentials: 'include' for cookie-based auth to work cross-subdomain.

6. CORS: Backend must have credentials: true in cors() config and FRONTEND_URL must match exactly.

7. SPA ROUTING: nginx location / must have try_files $uri $uri/ /index.html — without this direct URL access returns 404.

8. PERMISSIONS: After every SCP upload run: chown -R www-data:www-data /var/www/APPDIR

9. BUILD FIRST: Always build locally, verify chunk sizes, then deploy. Never deploy source files.

10. VERIFY: After deployment test gzip, caching, CORS, and page load in incognito before declaring done.

The domain is: [YOUR DOMAIN]
VPS IP: [YOUR IP]
Frontend path: /var/www/[APP]_frontend
Backend path: /var/www/[APP]_backend
Backend port: 5000
```

---

## ESTIMATED TIME WITH THIS PLAYBOOK

| Task | Time |
|------|------|
| VPS initial setup | 20 min |
| SSL certificates | 5 min |
| nginx config | 10 min |
| Backend deploy | 10 min |
| Frontend build + deploy | 10 min |
| Verification | 5 min |
| **Total** | **~60 min** |

Compare to 3 days without it.
