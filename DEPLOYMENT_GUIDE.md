# DEPLOYMENT GUIDE

This document provides step-by-step instructions for deploying the Edwardian Academy ERP MERN Stack Application to a VPS (Ubuntu/Debian).

## 1. Prerequisites Installation

Connect to your VPS via SSH:
```bash
ssh root@your_vps_ip
```

Update your package lists and install necessary dependencies:
```bash
# Update System
sudo apt update && sudo apt upgrade -y

# Install Git and Nginx
sudo apt install git nginx -y

# Install Node.js (v20.x recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node and npm versions
node -v
npm -v

# Install PM2 (Process Manager for Node.js)
sudo npm install -g pm2
```

## 2. Setting Up the Project

Clone the repository or extract the source code archive on your server (e.g., in `/var/www/edwardian-erp`):

```bash
mkdir -p /var/www/edwardian-erp
# If using zip: unzip Edwardian_SourceCode.zip -d /var/www/edwardian-erp
cd /var/www/edwardian-erp
```

## 3. Environment Variables Configuration

You need to set up environment variables for both the backend and frontend. 

1. **Backend Configuration:**
   Copy the `.env.example` file to create a `.env` file in the backend directory.
   ```bash
   cd /var/www/edwardian-erp/backend
   cp ../.env.example .env
   nano .env
   ```
   **Crucial Edits:**
   - Set `NODE_ENV=production`
   - Set `MONGODB_URI` to your production MongoDB database.
   - Set `JWT_SECRET` to a secure random string.
   - Set `CLIENT_URL` to your production domain (e.g., `https://yourdomain.com`).
   - Ensure `PORT=5001`.

2. **Frontend Configuration:**
   Create an `.env` file in the frontend directory.
   ```bash
   cd /var/www/edwardian-erp/frontend
   nano .env
   ```
   **Add the following:**
   ```env
   VITE_API_BASE_URL=https://yourdomain.com
   VITE_API_URL=https://yourdomain.com/api
   ```

## 4. Starting the Node.js Backend

Install dependencies and start the backend using PM2:

```bash
cd /var/www/edwardian-erp/backend
npm install

# Start the app via PM2
pm2 start server.js --name "edwardian-backend"

# Ensure PM2 starts on server reboot
pm2 startup
pm2 save
```

## 5. Building the React Frontend

Navigate to the frontend directory, install dependencies, and build the production bundle:

```bash
cd /var/www/edwardian-erp/frontend
npm install
npm run build
```

This will create a `dist` folder inside the `frontend` directory containing the static files.

## 6. Nginx Reverse Proxy Configuration

Create an Nginx server block configuration to serve the frontend and route `/api` traffic to the backend.

```bash
sudo nano /etc/nginx/sites-available/edwardian-erp
```

Paste the following Nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com; # Replace with your actual domain or IP

    # Serve Frontend Static Files
    root /var/www/edwardian-erp/frontend/dist;
    index index.html;

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Route /api to Node.js Backend
    location /api/ {
        # Assuming backend runs on 5001 and API endpoints prefix with /api
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Pass real client IP
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the configuration and restart Nginx:

```bash
# Link the config to sites-enabled
sudo ln -s /etc/nginx/sites-available/edwardian-erp /etc/nginx/sites-enabled/

# Test Nginx config for syntax errors
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 7. Next Steps

- Point your domain's A-record to the VPS IP address.
- Install Let's Encrypt SSL via Certbot to secure the application.
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
