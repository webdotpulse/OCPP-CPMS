# Setup Guide & Deployment Manual (Ubuntu on Google Cloud)

This guide walks you through the steps to set up both the Backend and Frontend of the Open-Source OCPP 1.6 CMS on a local machine, as well as providing **detailed production deployment instructions for a Google Cloud Ubuntu VM**.

---

## 1. Local Development Setup

If you want to run the project locally for development or testing, follow these steps.

### Prerequisites (Local)
- **Node.js** 20 or higher (LTS recommended)
- **PostgreSQL** database
- **Redis** server

### 1.1 Backend Setup
```bash
cd Backend
npm install
cp .env.example .env # Update DATABASE_URL and secrets
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### 1.2 Frontend Setup
```bash
cd ../Frontend
npm install
npm run dev
```

---

## 2. Production Deployment on Google Cloud (Ubuntu VM)

This section provides a step-by-step manual for deploying the application to a Google Cloud Platform (GCP) Ubuntu VM.

**Production Architecture Overview:**
- **Frontend URL:** `https://ui.mobilitypulse.com` (served via Nginx)
- **Backend/API URL:** `https://ocpp.mobilitypulse.com` (served via Nginx, routing to Backend Node.js process)
- **OCPP WebSocket:** Handled on `ocpp.mobilitypulse.com` and proxied to the backend WS port.
- **Process Manager:** PM2
- **Database:** PostgreSQL installed locally on the VM (or use Cloud SQL)
- **Web Server:** Nginx (acts as a reverse proxy for Node.js apps)

### 2.1 Server Provisioning & Initial Setup

1. Create a VM Instance on Google Cloud Platform using an **Ubuntu 24.04 LTS or Debian 12** image.
2. Assign a **Static External IP Address** to your VM in the GCP Console.
3. Configure your DNS provider (Combell hosting) to point:
   - `ui.mobilitypulse.com` -> `A Record` -> `[Your VM Static IP]`
   - `ocpp.mobilitypulse.com` -> `A Record` -> `[Your VM Static IP]`
4. Open GCP Firewall rules for the VM to allow traffic on ports **80 (HTTP)** and **443 (HTTPS)**.

SSH into your VM and update packages:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install git -y
```

**Configure UFW Firewall (Recommended):**
It's a best practice to enable UFW and only allow necessary ports.
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2.2 Install Prerequisites

**Install Node.js (v20+) & PM2:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g npm@latest
sudo npm install -g pm2
```

**Install PostgreSQL:**
*(If using Google Cloud SQL, skip this and use the Cloud SQL connection string)*
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql.service

# Setup Database and User
cd /tmp
sudo -u postgres psql -c "CREATE DATABASE ocpp_cms;"
sudo -u postgres psql -c "CREATE USER cms_user WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "ALTER ROLE cms_user SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "ALTER ROLE cms_user SET default_transaction_isolation TO 'read committed';"
sudo -u postgres psql -c "ALTER ROLE cms_user SET timezone TO 'UTC';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ocpp_cms TO cms_user;"
```

**Install Redis:**
```bash
sudo apt install redis-server -y
sudo systemctl start redis.service
sudo systemctl enable redis.service
```

**Install Nginx & Certbot:**
```bash
sudo apt install nginx -y
sudo apt install certbot python3-certbot-nginx -y
```

### 2.3 Clone & Setup the Application

```bash
sudo mkdir -p /var/www
cd /var/www/
sudo git clone <YOUR_REPOSITORY_URL> ocpp-cms
sudo chown -R $USER:$USER /var/www/ocpp-cms
cd ocpp-cms
```

#### Backend Setup
```bash
cd /var/www/ocpp-cms/Backend
npm install

# Create environment file
cat <<EOT >> .env
DATABASE_URL="postgresql://cms_user:your_secure_password@localhost:5432/ocpp_cms?schema=public"
PORT=3000
OCPP_PORT=9220
OCPP_LOG_WS_PORT=3001
JWT_SECRET="generate_a_very_secure_random_string_here"
REDIS_URL="redis://localhost:6379"
EOT

# Generate and migrate DB
npx prisma generate
npx prisma migrate deploy

# Build and start with PM2
npm run build
pm2 start dist/server.js --name "ocpp-backend"
```

#### Frontend Setup
```bash
cd /var/www/ocpp-cms/Frontend
npm install

# Build Next.js application
npm run build

# Start frontend with PM2
pm2 start npm --name "ocpp-frontend" -- start
```

Save the PM2 process list so it restarts on reboot. We also install the PM2 log rotation module to prevent log files from taking up all disk space over time.
```bash
pm2 save
pm2 startup
# Run the command PM2 outputs to setup systemd
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:retain 14
```

### 2.4 Configure Nginx as a Reverse Proxy

Create an Nginx configuration for the **Backend** (`ocpp.mobilitypulse.com`):
```bash
sudo nano /etc/nginx/sites-available/ocpp.mobilitypulse.com
```
Add the following configuration:
```nginx
server {
    listen 80;
    server_name ocpp.mobilitypulse.com;

    # REST API Routing
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # OCPP WebSocket Routing (Port 9220)
    location /OCPP/ {
        proxy_pass http://localhost:9220/OCPP/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # OCPP Logs WebSocket Routing (Port 3001)
    location /ocpp-logs {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Create an Nginx configuration for the **Frontend Dashboard** (`ui.mobilitypulse.com`):
```bash
sudo nano /etc/nginx/sites-available/ui.mobilitypulse.com
```
Add the following configuration:
```nginx
server {
    listen 80;
    server_name ui.mobilitypulse.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
*Note: The frontend is explicitly configured to run on port 3002 in its package.json scripts to avoid conflicts with the backend.*

Enable both sites:
```bash
sudo ln -s /etc/nginx/sites-available/ocpp.mobilitypulse.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/ui.mobilitypulse.com /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 2.5 Secure with SSL (Certbot)

Run Certbot to automatically fetch and configure Let's Encrypt SSL certificates for both domains.

```bash
sudo certbot --nginx -d ocpp.mobilitypulse.com
sudo certbot --nginx -d ui.mobilitypulse.com
```
Follow the prompts. Certbot will automatically modify your Nginx configurations to enforce HTTPS and handle WebSocket upgrade headers securely over WSS.

---

## 3. Post-Installation Initial Setup

Since this is a fresh installation, you'll need to create an initial admin user and at least one charging station.

### Create Admin User
To securely create the first admin user, you can run the initialization script on the VM:
```bash
cd /var/www/ocpp-cms/Backend
npm run create-admin -- "admin_email" "admin_password"
```

### Connecting a Charger in Production
Once deployed and SSL is configured, point your OCPP 1.6 charger (or simulator) to your secure WebSocket endpoint:
```
wss://ocpp.mobilitypulse.com/OCPP/1.6/{chargerId}
```
*Note the use of `wss://` instead of `ws://` now that SSL is active.*

## Troubleshooting Production

- **Nginx Error Logs:** `sudo tail -f /var/log/nginx/error.log`
- **Backend/Frontend PM2 Logs:** `pm2 logs`
- **Database Connection:** Ensure the `DATABASE_URL` in `.env` uses the exact password and user you created in Postgres.
- **WebSockets disconnecting:** Check that Nginx is configured to properly pass the `Upgrade` and `Connection` headers as shown in the Nginx config snippet.