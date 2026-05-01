# Open-Source OCPP CMS

A barebone OCPP 1.6 & 2.1/2.0.1 Charge Point Management System that anyone can build their business logic on top of. This is a starting point for managing electric vehicle charging stations with support for OCPP 1.6 & 2.1/2.0.1 protocol.

## Features

- **OCPP 1.6 & 2.1/2.0.1 WebSocket Server** - Connect and communicate with OCPP-compliant chargers
- **REST API** - Complete API for managing chargers, stations, connectors, RFID tags, and transactions
- **Real-time Dashboard** - Monitor charging sessions and system status
- **OCPP Remote Control** - Start/stop charging, reset chargers, unlock connectors remotely
- **RFID Whitelist** - Manage RFID tags for authorized charging
- **OCPP Logs Streaming** - WebSocket endpoint for real-time OCPP message logging
- **Post-Paid Billing** - Track charging sessions and calculate amounts for post-paid users
- **TypeScript** - Full TypeScript implementation with type safety

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Express API Server                        │
│                      (Port 3000)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │         REST API Endpoints                   │     │
│  ├─────────────────────────────────────────────────────┤     │
│  │  • /api/chargers      (CRUD + Status)          │     │
│  │  • /api/stations      (CRUD)                    │     │
│  │  • /api/connectors    (CRUD)                    │     │
│  │  • /api/rfid          (CRUD + Toggle)            │     │
│  │  • /api/transactions (List + Stats)                │     │
│  │  • /api/ocpp         (Remote Control)            │     │
│  │  • /api/dashboard      (Overview + Live Sessions)    │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │        OCPP WebSocket Server                 │     │
│  │               (Port 9220)                        │     │
│  ├─────────────────────────────────────────────────────┤     │
│  │  • BootNotification  →  Authenticate chargers       │     │
│  │  • Heartbeat        →  Track online status        │     │
│  │  • Authorize       →  Validate RFID tags         │     │
│  │  • StartTransaction →  Begin charging session      │     │
│  │  • StopTransaction  →  End charging session        │     │
│  │  • MeterValues      →  Track energy consumption    │     │
│  │  • StatusNotification →  Update connector status    │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │     OCPP Logs WebSocket Server              │     │
│  │               (Port 3001)                            │     │
│  ├─────────────────────────────────────────────────────┤     │
│  │  • Real-time OCPP message streaming              │     │
│  │  • Broadcasts to all connected dashboard clients   │     │
│  │  • Historical log replay on new connections       │     │
│  └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                      │
├─────────────────────────────────────────────────────────────────┤
│  • User              - Admin/operator accounts                 │
│  • ChargingStation   - Site/location data                     │
│  • Charger           - OCPP device information                │
│  • Connector         - Charge point connectors                 │
│  • RfidUser          - RFID whitelist for authorized users     │
│  • RfidSession       - Post-paid charging sessions             │
│  • Transaction       - Basic transaction tracking               │
│  • OcppLog           - OCPP message logging for debugging      │
│  • Tariff            - Pricing configuration                   │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Caching/PubSub:** Redis (ioredis)
- **WebSocket:** Native `ws` library
- **Logging:** Winston
- **Authentication:** JWT (jsonWebToken)

## Getting Started

### Prerequisites

- Node.js 20 or higher
- PostgreSQL database

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migration
npm run prisma:migrate

# Start development server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/database"
PORT=3000
OCPP_PORT=9220
OCPP_LOG_WS_PORT=3001
JWT_SECRET="your-secret-key"
REDIS_URL="redis://localhost:6379"
LOG_LEVEL=info
```

## OCPP Message Flow

### 1. Charger Connection

```
Charger → ws://localhost:9220/OCPP/1.6/{chargerId}
CMS ← Verify charger exists in database
CMS ← Send: BootNotification.conf (Accepted, interval=300)
```

### 2. Authentication

```
User → Swipe RFID card at charger
Charger → Send: Authorize.req (idTag)
CMS ← Lookup RFID in whitelist
CMS → Send: Authorize.conf (idTagInfo.status = "Accepted")
```

### 3. Charging Session

```
Charger → Send: StartTransaction.req (idTag, meterStart)
CMS ← Create Transaction/RfidSession
CMS → Send: StartTransaction.conf (transactionId)
Charger → Send: MeterValues.req (periodic)
CMS ← Update energy consumption
User → Swipe card to stop
Charger → Send: StopTransaction.req (transactionId, meterStop)
CMS ← Close session, calculate amount
CMS → Send: StopTransaction.conf
```

## API Reference

### Health Check

```http
GET /health
```

### Chargers

```http
GET    /api/chargers              # List all chargers
GET    /api/chargers/:id         # Get specific charger
GET    /api/chargers/:id/status  # Get charger status
POST   /api/chargers             # Create charger
PUT    /api/chargers/:id         # Update charger
DELETE  /api/chargers/:id         # Delete charger
POST   /api/chargers/connectors  # Bulk create connectors
```

### Stations

```http
GET    /api/stations              # List all stations
GET    /api/stations/:id         # Get specific station
GET    /api/stations/:id/chargers # Get station chargers
POST   /api/stations             # Create station
PUT    /api/stations/:id         # Update station
DELETE  /api/stations/:id         # Delete station
```

### Connectors

```http
GET    /api/connectors    # List all connectors
GET    /api/connectors/:id # Get specific connector
POST   /api/connectors    # Create connector
PUT    /api/connectors/:id # Update connector
DELETE  /api/connectors/:id # Delete connector
```

### RFID Tags

```http
GET    /api/rfid         # List all tags
GET    /api/rfid/:id     # Get specific tag
POST   /api/rfid         # Create tag
PUT    /api/rfid/:id     # Update tag
PATCH   /api/rfid/:id/toggle # Activate/deactivate tag
DELETE  /api/rfid/:id     # Delete tag
```

### Transactions

```http
GET    /api/transactions              # List all transactions
GET    /api/transactions/active   # Get active sessions
GET    /api/transactions/charger/:name # Get charger transactions
GET    /api/transactions/stats        # Get statistics
GET    /api/transactions/:id         # Get specific transaction
GET    /api/transactions/rfid/:id # Get RFID session
```

### OCPP Remote Control

```http
GET    /api/ocpp/connected              # Get connected chargers
POST   /api/ocpp/remote-start          # Start charging remotely
POST   /api/ocpp/remote-stop           # Stop charging remotely
POST   /api/ocpp/get-configuration     # Get charger config
POST   /api/ocpp/set-configuration     # Set charger config
POST   /api/ocpp/reset                 # Reset charger
POST   /api/ocpp/unlock                 # Unlock connector
POST   /api/ocpp/trigger-message       # Trigger status message
```

### Dashboard

```http
GET    /api/dashboard/overview        # System metrics
GET    /api/dashboard/live-sessions    # Active charging sessions
GET    /api/dashboard/distribution    # Connector status distribution
GET    /api/dashboard/chargers-status # All chargers with status
```

## OCPP Logs WebSocket

Connect to `ws://localhost:3001` to receive real-time OCPP message logs:

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.on('message', (data) => {
  const message = JSON.parse(data);

  if (message.type === 'welcome') {
    console.log(`Connected. Total clients: ${message.clientCount}`);
  }

  if (message.type === 'history') {
    console.log(`Received ${message.logs.length} historical logs`);
  }

  if (message.type === 'log') {
    console.log(`New log:`, message.log);
  }
});
```

## Database Schema

See [prisma/schema.prisma](./prisma/schema.prisma) for complete schema definition.

Key models:
- **User** - Admin/operator accounts
- **ChargingStation** - Physical charging locations
- **Charger** - OCPP charging points
- **Connector** - Individual charge connectors
- **RfidUser** - RFID whitelist entries
- **RfidSession** - Post-paid charging sessions
- **Transaction** - Basic transaction tracking
- **OcppLog** - Message logging for debugging

## Development

```bash
# Run in watch mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Open Prisma Studio
npm run prisma:studio
```

## Testing

See [TEST_CASES.md](./TEST_CASES.md) for comprehensive test cases covering all functionality.

## Project Structure

```
Backend/
├── src/
│   ├── config/
│   │   ├── database.ts      # Prisma client setup
│   │   └── index.ts        # Application configuration
│   ├── ocpp/
│   │   ├── chargerRegistry.ts    # Connected charger management
│   │   ├── messageHandlers.ts    # OCPP message processors
│   │   ├── ocppServer.ts        # WebSocket server
│   │   ├── remoteControl.ts      # OCPP remote commands
│   │   └── logsWebSocket.ts     # Logs streaming server
│   ├── api/
│   │   ├── chargers/        # Chargers API routes
│   │   ├── stations/        # Stations API routes
│   │   ├── connectors/      # Connectors API routes
│   │   ├── rfid/           # RFID tags API routes
│   │   ├── transactions/    # Transactions API routes
│   │   ├── ocpp/           # OCPP remote control API
│   │   └── dashboard/      # Dashboard API routes
│   ├── middleware/
│   │   ├── auth.ts          # JWT authentication
│   │   └── errorHandler.ts # Error handling
│   ├── types/
│   │   └── index.ts        # TypeScript type definitions
│   ├── utils/
│   │   └── logger.ts       # Winston logging
│   ├── app.ts             # Express app setup
│   └── server.ts          # Application entry point
├── prisma/
│   └── schema.prisma     # Database schema
├── generated/
│   └── prisma/
│       └── client/        # Generated Prisma client
├── logs/                 # Application logs
├── .env                  # Environment variables
├── package.json
├── tsconfig.json
├── SETUP.md
├── TEST_CASES.md
└── README.md
```

## License

ISC

## Contributing

This is an open-source base CMS. Feel free to extend it with your business logic:
- Payment gateway integration
- User authentication UI
- Advanced analytics
- Mobile app APIs
- OCPI integration
- SMS/Email notifications
