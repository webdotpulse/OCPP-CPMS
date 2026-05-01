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

The CMS utilizes Redis for caching, rate-limiting, and Pub/Sub message brokering across Node.js instances.

### Checking Redis Status
```bash
sudo systemctl status redis.service
```

### Restarting Redis
If you encounter caching anomalies or need to flush the cache after a significant database alteration:
```bash
sudo systemctl restart redis.service
```

### Accessing Redis CLI
To view cached data or manage keys manually:
```bash
redis-cli
```


---

## 5. SSL Certificates (Certbot / Let's Encrypt)

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

## 6. Security & Firewall (UFW)

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

## 7. Updating the Application

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
