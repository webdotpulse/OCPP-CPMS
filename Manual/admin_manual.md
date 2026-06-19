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

**Install Node.js (v24+) & PM2:**
```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
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
# Explicitly grant schema privileges (Required for PostgreSQL 15+)
sudo -u postgres psql -d ocpp_cms -c "GRANT ALL ON SCHEMA public TO cms_user;"
```

**Install Redis:**
*Note: Make sure to use the exact service name `redis-server` (not `redis.service`) when interacting with systemd.*
```bash
sudo apt install redis-server -y
sudo systemctl start redis-server
sudo systemctl enable redis-server
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

# Create environment file for Frontend
cat <<EOT >> .env
NEXT_PUBLIC_API_URL="https://ocpp.mobilitypulse.com/api"
EOT

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

Since this is a fresh installation, you'll need to create an initial superadmin user and at least one charging station.

### Create superadmin user
To securely create the first superadmin user, ensure the database tables exist and run the initialization script on the VM:
```bash
cd /var/www/ocpp-cms/Backend
npm run create-superadmin -- "superadmin_email" "superadmin_password"
```
*(This command automatically runs `npx prisma db push` before creating the superadmin user).*

### Connecting a Charger in Production
Once deployed and SSL is configured, point your OCPP 1.6 or OCPP 2.1/2.0.1 charger to your secure WebSocket endpoint:
```
wss://ocpp.mobilitypulse.com/OCPP/1.6/{chargerId}
```
or
```
wss://ocpp.mobilitypulse.com/OCPP/2.1/{chargerId}
```
*Note the use of `wss://` instead of `ws://` now that SSL is active.*

## Cleanup / Restart Installation

If you encounter issues during installation or want to restart from scratch, you can use the following commands to wipe the current installation:

```bash
# Remove application directory
sudo rm -rf /var/www/ocpp-cms

# Drop database and user
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ocpp_cms;"
sudo -u postgres psql -c "DROP USER IF EXISTS cms_user;"

# Stop and delete PM2 processes
pm2 delete ocpp-backend || true
pm2 delete ocpp-frontend || true
pm2 save --force

# Remove Nginx configurations
sudo rm -f /etc/nginx/sites-available/ocpp.mobilitypulse.com
sudo rm -f /etc/nginx/sites-enabled/ocpp.mobilitypulse.com
sudo rm -f /etc/nginx/sites-available/ui.mobilitypulse.com
sudo rm -f /etc/nginx/sites-enabled/ui.mobilitypulse.com
sudo systemctl restart nginx
```

## Troubleshooting Production

- **Nginx Error Logs:** `sudo tail -f /var/log/nginx/error.log`
- **Backend/Frontend PM2 Logs:** `pm2 logs`
- **Database Connection:** Ensure the `DATABASE_URL` in `.env` uses the exact password and user you created in Postgres.
- **WebSockets disconnecting:** Check that Nginx is configured to properly pass the `Upgrade` and `Connection` headers as shown in the Nginx config snippet.
# Google Cloud VM Operational Manual

This manual provides detailed instructions for managing and operating the Open-Source OCPP CMS when deployed on a Google Cloud Platform (GCP) Ubuntu Virtual Machine.

---

## 1. Process Management (PM2)

The Node.js applications (Backend API and Frontend Next.js Dashboard) are managed by PM2, a production process manager. PM2 ensures the applications stay alive forever, auto-restarting them if they crash.

### Checking Process Status
To see the list of running applications, their memory usage, and CPU consumption:
```bash
pm2 status
```
Or use the rich monitoring dashboard:
```bash
pm2 monit
```

### Restarting Applications
If you need to restart the applications (e.g., after changing `.env` variables or deploying new code):
```bash
# Restart the backend
pm2 restart ocpp-backend

# Restart the frontend
pm2 restart ocpp-frontend

# Restart everything managed by PM2
pm2 restart all
```

### Checking Logs
PM2 automatically captures `console.log` and `console.error` outputs.

```bash
# View real-time logs for all apps
pm2 logs

# View logs for a specific app
pm2 logs ocpp-backend
pm2 logs ocpp-frontend

# View the last 1000 lines of logs
pm2 logs --lines 1000
```

*Note: We have installed `pm2-logrotate` to automatically manage log file sizes, ensuring they don't consume all VM disk space.*

---

## 2. Web Server Management (Nginx)

Nginx acts as a reverse proxy, handling incoming HTTPS requests and routing them to the PM2-managed Node.js applications on their respective local ports (3000, 3001, 3002, 9220).

### Checking Nginx Status
```bash
sudo systemctl status nginx
```

### Restarting or Reloading Nginx
If you make changes to the Nginx configuration files in `/etc/nginx/sites-available/`:
```bash
# Test the configuration for syntax errors before restarting
sudo nginx -t

# If the test is successful, reload Nginx gracefully
sudo systemctl reload nginx

# Alternatively, do a full restart
sudo systemctl restart nginx
```

### Viewing Nginx Logs
If an application is returning a 502 Bad Gateway or 504 Gateway Timeout, the issue is often visible in Nginx logs:
```bash
# Nginx Error Logs
sudo tail -f /var/log/nginx/error.log

# Nginx Access Logs
sudo tail -f /var/log/nginx/access.log
```

---

## 3. Database Management (PostgreSQL)

The CMS relies on PostgreSQL. If you are using a local Postgres installation on the VM (rather than Cloud SQL), follow these steps.

### Checking Database Status
```bash
sudo systemctl status postgresql
```

### Backing Up the Database
It is critical to regularly backup your production database. You can create a SQL dump:
```bash
# Dump the ocpp_cms database to a file
pg_dump -U cms_user -W -F t ocpp_cms > /home/$USER/ocpp_cms_backup_$(date +%F).tar
```
*You will be prompted for the `cms_user` password.*

### Restoring the Database
```bash
# Restore from a backup file
pg_restore -U cms_user -W -d ocpp_cms -1 /home/$USER/ocpp_cms_backup_YYYY-MM-DD.tar
```


---

## 4. Redis Management

The CMS utilizes Redis for caching, rate-limiting, and Pub/Sub message brokering across Node.js instances. A running Redis server is strictly required for the backend to function.

### Checking Redis Status
```bash
sudo systemctl status redis-server
```

### Restarting Redis
If you encounter caching anomalies or need to flush the cache after a significant database alteration:
```bash
sudo systemctl restart redis-server
```

### Accessing Redis CLI
To view cached data or manage keys manually:
```bash
redis-cli

# Example: View all active keys
127.0.0.1:6379> KEYS *
```

---

## 5. Load Management Service

The backend dynamically dispatches power limits (via the `SetChargingProfile` OCPP command) using the `LoadManagementService`.
This service continually analyzes active charging sessions to prevent grid overload by obeying the Station or Charge Group's `maxPower` settings.

### Checking Load Management Activity
The Load Management Service logs are part of the standard backend logs. You can monitor its calculations via PM2:
```bash
pm2 logs ocpp-backend --grep "LoadManagement"
```


---

## 6. SSL Certificates (Certbot / Let's Encrypt)

The VM uses Certbot to manage Let's Encrypt SSL certificates.

### Automatic Renewal
Certbot installs a systemd timer that attempts to renew certificates automatically before they expire (valid for 90 days). You can check the status of this timer:
```bash
sudo systemctl status certbot.timer
```

### Manual Renewal & Testing
To manually test the renewal process (dry run):
```bash
sudo certbot renew --dry-run
```
To force a renewal (only do this if a certificate is actually expiring soon or revoked):
```bash
sudo certbot renew
```

---

## 7. Security & Firewall (UFW)

The VM relies on UFW (Uncomplicated Firewall) combined with GCP's VPC Firewall rules.

### Checking Firewall Status
```bash
sudo ufw status verbose
```

You should see rules allowing:
- `22/tcp` (OpenSSH)
- `80/tcp` (Nginx HTTP)
- `443/tcp` (Nginx HTTPS)

*Do not expose PostgreSQL (5432) or Node.js ports (3000, 3001, 3002, 9220) to the public web via UFW. Nginx handles external traffic securely.*

---

## 8. Updating the Application

When new changes are pushed to the GitHub repository, here is the general workflow to deploy them to the VM:

```bash
cd /var/www/ocpp-cms

# Pull latest code
git pull origin main

# 1. Update Backend
cd Backend
npm install
npm run prisma:generate
npx prisma migrate deploy # Apply any new database migrations
npm run build
pm2 restart ocpp-backend

# 2. Update Frontend
cd ../Frontend
npm install
npm run build
pm2 restart ocpp-frontend
```
