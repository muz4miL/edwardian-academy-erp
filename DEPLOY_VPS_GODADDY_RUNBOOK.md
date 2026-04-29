# Edwardian ERP Deployment Runbook (VPS + GoDaddy + Dual Domain)

This runbook deploys:
- ERP app on ERP_DOMAIN
- Public website on PUBLIC_DOMAIN
- API on API_DOMAIN
- One VPS (Ubuntu 24.04)
- PM2 + Nginx + Let's Encrypt SSL

## 1) Fill These Values First

- VPS_IP: your server public IP
- GITHUB_REPO: https://github.com/muz4miL/edwardian-academy-erp.git
- PUBLIC_DOMAIN: your public website domain (example: academy-public.com)
- ERP_DOMAIN: your ERP domain (example: erp.academy-admin.com)
- API_DOMAIN: your API domain (example: api.academy-admin.com)
- MONGODB_URI: Atlas URI recommended

## 2) GoDaddy DNS

Create A records pointing to VPS_IP:

- PUBLIC_DOMAIN @ -> VPS_IP
- PUBLIC_DOMAIN www -> VPS_IP
- ERP_DOMAIN @ (or the host you use) -> VPS_IP
- API_DOMAIN @ (or api host) -> VPS_IP

Wait for propagation (usually 5 to 30 minutes).

## 3) Initial VPS Setup (Ubuntu 24.04)

SSH into your VPS as root, then run:

sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx ufw ca-certificates gnupg
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential
sudo npm install -g pm2
sudo apt install -y certbot python3-certbot-nginx

node -v
npm -v
pm2 -v

Firewall:

sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status

## 4) Clone Project

cd /var/www
sudo git clone GITHUB_REPO edwardian-academy-erp
sudo chown -R $USER:$USER /var/www/edwardian-academy-erp
cd /var/www/edwardian-academy-erp

## 5) Backend Environment

cd /var/www/edwardian-academy-erp/backend
cp .env.example .env

Edit .env:

NODE_ENV=production
PORT=5000
MONGODB_URI=MONGODB_URI
JWT_SECRET=PUT_A_LONG_RANDOM_SECRET_HERE
JWT_EXPIRES_IN=7d

# Must include every frontend origin calling API
CORS_ALLOWED_ORIGINS=https://ERP_DOMAIN,https://PUBLIC_DOMAIN,https://www.PUBLIC_DOMAIN

# Optional legacy single origin
CLIENT_URL=https://ERP_DOMAIN

# Cookie controls
COOKIE_SAME_SITE=strict
COOKIE_SECURE=true
# COOKIE_DOMAIN=.your-domain.com
# STUDENT_COOKIE_SAME_SITE=lax
# STUDENT_COOKIE_SECURE=true

Install and start backend:

npm ci
pm2 start server.js --name edwardian-api
pm2 save
pm2 startup systemd -u $(whoami) --hp $HOME

Run the printed pm2 startup command once if it asks.

## 6) Frontend Environment + Build

cd /var/www/edwardian-academy-erp/frontend
cp .env.example .env.production

Edit .env.production:

VITE_API_BASE_URL=https://API_DOMAIN
VITE_API_URL=https://API_DOMAIN/api

Install/build:

npm ci
npm run build

Publish build:

sudo mkdir -p /var/www/edwardian-frontend
sudo rsync -av --delete dist/ /var/www/edwardian-frontend/
sudo chown -R www-data:www-data /var/www/edwardian-frontend

## 7) Nginx Config

Create file:

sudo nano /etc/nginx/sites-available/edwardian

Paste this and replace domain values:

server {
    listen 80;
    server_name API_DOMAIN;

    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
}

server {
    listen 80;
    server_name ERP_DOMAIN;

    root /var/www/edwardian-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name PUBLIC_DOMAIN www.PUBLIC_DOMAIN;

    root /var/www/edwardian-frontend;
    index index.html;

    # Public domain default page
    location = / {
        return 302 /public-home;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

Enable and reload:

sudo ln -sf /etc/nginx/sites-available/edwardian /etc/nginx/sites-enabled/edwardian
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

## 8) SSL (Let's Encrypt)

sudo certbot --nginx -d API_DOMAIN -d ERP_DOMAIN -d PUBLIC_DOMAIN -d www.PUBLIC_DOMAIN

Verify auto-renew:

sudo systemctl status certbot.timer
sudo certbot renew --dry-run

## 9) Smoke Test Checklist

API:

curl -I https://API_DOMAIN/
curl -I https://API_DOMAIN/api/auth/me

Frontend:

- Open https://ERP_DOMAIN/login
- Open https://PUBLIC_DOMAIN (should redirect to /public-home)
- Test owner login
- Test student portal login
- Test receipt print endpoint and image loading

Uploads:

- Upload a student image
- Confirm image URL loads from https://API_DOMAIN/uploads/...

## 10) Future Update Workflow (Safe)

cd /var/www/edwardian-academy-erp

git pull origin main

cd backend
npm ci
pm2 restart edwardian-api --update-env

cd ../frontend
npm ci
npm run build
sudo rsync -av --delete dist/ /var/www/edwardian-frontend/
sudo systemctl reload nginx

## 10.1) Clone Current Data Into Production (Exact Seed)

Use this when you want deployed DB to match your current local DB exactly.

Set SOURCE_DB_NAME to your actual local DB name (for this repo it is commonly `edwardianAcademyDB`).

1. On source machine (your current DB host), create a compressed dump:

mongodump --uri="mongodb://127.0.0.1:27017/SOURCE_DB_NAME" --db SOURCE_DB_NAME --archive=edwardian-live-seed.gz --gzip

2. Copy dump archive to VPS:

scp edwardian-live-seed.gz root@187.127.108.180:/var/www/edwardian-academy-erp/backend/

3. On VPS, run the production clone seed command:

cd /var/www/edwardian-academy-erp/backend
npm run seed:clone:prod -- --archive /var/www/edwardian-academy-erp/backend/edwardian-live-seed.gz --source-db SOURCE_DB_NAME --target-db edwardian-erp --target-uri "mongodb://127.0.0.1:27017/edwardian-erp"

4. Restart API:

pm2 restart edwardian-api --update-env

## 11) Rollback Workflow

cd /var/www/edwardian-academy-erp
git log --oneline -n 10
git checkout COMMIT_HASH

cd backend
npm ci
pm2 restart edwardian-api --update-env

cd ../frontend
npm ci
npm run build
sudo rsync -av --delete dist/ /var/www/edwardian-frontend/
sudo systemctl reload nginx

## 12) Database Recommendation

Recommended: MongoDB Atlas for easier backup and recovery.

If you use local MongoDB on VPS, enforce all of these:
- Bind to localhost only
- Authentication enabled
- Daily automated backup

Done right, this setup is production-safe and update-friendly.
