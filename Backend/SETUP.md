# Setup Guide - Open-Source OCPP CMS

This guide provides all the commands you need to set up the Open-Source OCPP 1.6 CMS.

## Prerequisites

Before starting, ensure you have:
- **Node.js** 18 or higher
- **PostgreSQL** database running locally or remotely
- **Redis** server running locally or remotely

## Quick Setup Steps

### Step 1: Generate Prisma Client

```bash
cd d:/cms/new-open-source/Backend
npm run prisma:generate
```

### Step 2: Run Database Migration

```bash
npm run prisma:migrate
```

Or use `npm run prisma:push` for direct schema sync (no migration files).

### Step 3: Start Development Server

```bash
npm run dev
```

This will start:
- **Express API server** on port 3000
- **OCPP WebSocket server** on port 9220
- **OCPP logs WebSocket** on port 3001

## Environment Variables

Edit `.env` file with your settings:

```env
# Database (REQUIRED)
DATABASE_URL="postgresql://user:password@localhost:5432/database_name?schema=public"

# Server Configuration
PORT=3000
NODE_ENV=development

# OCPP Configuration
OCPP_PORT=9220
HEARTBEAT_INTERVAL_SECONDS=300
OFFLINE_THRESHOLD_SECONDS=60

# OCPP Logs WebSocket
OCPP_LOG_WS_PORT=3001

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# JWT Secret (for API authentication)
JWT_SECRET="your-jwt-secret-key-change-in-production"

# Log Level (error, warn, info, debug)
LOG_LEVEL=info
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with watch mode |
| `npm run start` | Start production server |
| `npm run build` | Build TypeScript to dist/ |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Create and run database migrations |
| `npm run prisma:push` | Push schema to database directly |
| `npm run prisma:studio` | Open Prisma Studio (DB GUI) |

## Initial Data Setup

After starting the server, you'll need to create initial data:

### 1. Create Admin User

```bash
# You'll need to implement auth endpoints or use Prisma Studio
npm run prisma:studio
# Then create a user with role "admin"
```

### 2. Create a Charging Station

```bash
curl -X POST http://localhost:3000/api/stations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "station_name": "Demo Station",
    "street_name": "123 Main St",
    "state": "California",
    "city": "San Francisco",
    "postal_code": "94102",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "on_site_person_name": "John Doe",
    "on_site_contact_details": "555-1234",
    "emergency_contact": "555-5678",
    "owner_id": 1
  }'
```

### 3. Create a Charger

```bash
curl -X POST http://localhost:3000/api/chargers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "model": "OCPP-1.6-Sim",
    "name": "CHARGER-001",
    "manufacturer": "OpenCharge",
    "serial_number": "SN123456",
    "manufacturing_date": "2023-01-01T00:00:00.000Z",
    "power_capacity": 22000,
    "power_consumption": 100,
    "firmware_version": "1.0.0",
    "warranty_period": "2 years",
    "service_contacts": "support@example.com",
    "charging_station_id": 1,
    "owner_id": 1
  }'
```

### 4. Create RFID Tag (for testing)

```bash
curl -X POST http://localhost:3000/api/rfid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "rfid_tag": "RFID123456",
    "name": "Test User",
    "email": "test@example.com",
    "phone": "555-9999",
    "type": "postpaid",
    "active": true,
    "owner_id": 1
  }'
```

## Connecting a Charger

Connect your OCPP 1.6 charger to:

```
ws://localhost:9220/OCPP/1.6/{chargerId}
```

Where `{chargerId}` is the `charger_id` from the database.

## Troubleshooting

### Prisma Issues

**Error:** `Cannot find module '../../generated/prisma/client'`

```bash
# Generate Prisma client
npm run prisma:generate
```

**Error:** Database connection failed

```bash
# Check DATABASE_URL in .env
# Verify PostgreSQL is running
psql -U postgres -c "SELECT 1"
```

### Port Conflicts

**Error:** `EADDRINUSE: address already in use`

```bash
# Find process using the port
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <PID> /F
```

### TypeScript Errors

**Error:** Type definitions not found

```bash
# Regenerate Prisma types
npm run prisma:generate

# Restart dev server
npm run dev
```

## Next Steps

1. Review [TEST_CASES.md](./TEST_CASES.md) to verify functionality
2. Connect a real charger to `ws://localhost:9220/OCPP/1.6/{chargerId}`
3. Test the API endpoints using the provided examples
4. Build a frontend for the CMS

## API Endpoints Summary

| Endpoint | Method | Auth Required |
|----------|---------|---------------|
| `/health` | GET | No |
| `/api/chargers` | GET, POST | Yes |
| `/api/chargers/:id` | GET, PUT, DELETE | Yes |
| `/api/chargers/:id/status` | GET | Yes |
| `/api/stations` | GET, POST | Yes |
| `/api/stations/:id` | GET, PUT, DELETE | Yes |
| `/api/stations/:id/chargers` | GET | Yes |
| `/api/connectors` | GET, POST | Yes |
| `/api/connectors/:id` | GET, PUT, DELETE | Yes |
| `/api/rfid` | GET, POST | Yes |
| `/api/rfid/:id` | GET, PUT, DELETE | Yes |
| `/api/rfid/:id/toggle` | PATCH | Yes |
| `/api/transactions` | GET | Yes |
| `/api/transactions/active` | GET | Yes |
| `/api/transactions/charger/:chargerName` | GET | Yes |
| `/api/transactions/stats` | GET | Yes |
| `/api/ocpp/connected` | GET | Yes |
| `/api/ocpp/remote-start` | POST | Yes |
| `/api/ocpp/remote-stop` | POST | Yes |
| `/api/ocpp/get-configuration` | POST | Yes |
| `/api/ocpp/set-configuration` | POST | Yes |
| `/api/ocpp/reset` | POST | Yes |
| `/api/ocpp/unlock` | POST | Yes |
| `/api/ocpp/trigger-message` | POST | Yes |
| `/api/dashboard/overview` | GET | Yes |
| `/api/dashboard/live-sessions` | GET | Yes |
| `/api/dashboard/distribution` | GET | Yes |
| `/api/dashboard/chargers-status` | GET | Yes |
