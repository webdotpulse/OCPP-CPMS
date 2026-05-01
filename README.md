<p align="center">
  <a href="https://www.mobilitypulse.com" target="_blank">
    <img src="https://www.mobilitypulse.com/assets/images/logo/logo.svg" alt="MobilityPulse – Community EV Charging Platform" height="64" style="max-width: 100%; height: auto; max-height: 64px;" />
  </a>
</p>

<h1 align="center">OCPP Charge Management System</h1>

<p align="center">
  A production-ready, full-stack <strong>OCPP 1.6 & 2.1/2.0.1 Charge Point Management System (CPMS)</strong> EV charging platform.
</p>

<p align="center">
  <a href="https://github.com/savekar-ev/open-source-csms/blob/main/LICENSE"><img alt="License: ISC" src="https://img.shields.io/badge/License-ISC-blue.svg" /></a>
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-20%2B-green?logo=node.js" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15%2B-black?logo=next.js" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-15%2B-blue?logo=postgresql" />
  <img alt="Redis" src="https://img.shields.io/badge/Redis-7%2B-red?logo=redis" />
  <img alt="OCPP" src="https://img.shields.io/badge/OCPP-1.6%20%7C%202.1-orange" />
  <a href="https://csms.savekar.com"><img alt="Live Demo" src="https://img.shields.io/badge/Live%20Demo-csms.savekar.com-brightgreen" /></a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [High-Level Architecture](#high-level-architecture)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Configuration](#configuration)
- [Connecting a Charger](#connecting-a-charger)
- [Contributing](#contributing)
- [About MobilityPulse](#about-mobilitypulse)
- [License](#license)

---

## High-Level Architecture

The system consists of four primary layers that work together to manage EV chargers end-to-end:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OCPP CMS – High-Level Architecture              │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐         OCPP 1.6 & 2.1/2.0.1 WebSocket         ┌──────────────────────────┐
  │   EV Chargers /  │ ◄─────────────────────────────────► │   OCPP WebSocket Server  │
  │   Charge Points  │    ws://host:9220/OCPP/[1.6|2.1]/{id}     │   (Node.js / ws library) │
  └──────────────────┘                                     └────────────┬─────────────┘
                                                                        │
                                                                        │  Internal Events
                                                                        ▼
  ┌──────────────────┐        HTTPS / REST API            ┌──────────────────────────┐
  │  Next.js Admin   │ ◄─────────────────────────────────► │   Express REST API       │
  │  Dashboard       │    http://host:3000/api/v1/...      │   (TypeScript / Prisma)  │
  │  (Frontend UI)   │                                     └────────────┬─────────────┘
  └──────────────────┘                                                  │
                                                                        │  ORM Queries
                                                                        ▼
  ┌──────────────────┐      WebSocket (Live Logs)         ┌──────────────────────────┐
  │  OCPP Log        │ ◄─────────────────────────────────► │   PostgreSQL Database    │
  │  Viewer (UI)     │    ws://host:3001                   │   (via Prisma ORM)       │
  └──────────────────┘                                     └──────────────────────────┘
                                                                        │
                                                                        │  Pub/Sub & Caching
                                                                        ▼
                                                           ┌──────────────────────────┐
                                                           │   Redis (ioredis)        │
                                                           └──────────────────────────┘
```

```mermaid
flowchart TD
    CP["⚡ EV Charge Points\n(Physical Chargers)"]
    OCPP["OCPP WebSocket Server\nws://:9220/OCPP/[1.6|2.1]/{id}"]
    API["Backend REST API\nExpress + TypeScript\nhttp://:3000"]
    DB[("PostgreSQL Database\n(via Prisma ORM)")]
    UI["🖥️ Admin Dashboard\nNext.js 15 + shadcn/ui\nhttp://:3002"]
    LOGS["📋 Live OCPP Log Viewer\nWebSocket Stream\nws://:3001"]

    CP <-->|"OCPP 1.6 & 2.1/2.0.1 JSON\nWebSocket"| OCPP
    OCPP -->|"Internal events\n& data writes"| API
    API <-->|"ORM queries\n& migrations"| DB
    UI <-->|"HTTPS / REST"| API
    UI <-->|"WebSocket stream"| LOGS
    OCPP -->|"Real-time\nlog broadcast"| LOGS
    OCPP <-->|"Pub/Sub\n& Caching"| REDIS[("Redis Cache")]
    API <-->|"Pub/Sub\n& Caching"| REDIS
```

### Key Data Flows

| Flow | Protocol | Description |
|------|----------|-------------|
| Charger ↔ OCPP Server | OCPP 1.6 & 2.1/2.0.1 (WebSocket JSON) | Boot, Heartbeat, Authorize, Start/Stop Transaction, MeterValues |
| Dashboard ↔ API | HTTPS REST | Station management, analytics, RFID, tariffs, user auth |
| Dashboard ↔ Log Server | WebSocket | Real-time OCPP message streaming for monitoring/debugging |
| API ↔ Database | Prisma ORM (SQL) | All persistent data — chargers, sessions, tariffs, users |

---

## Project Structure

```
open-source-csms/
├── Backend/                  # Node.js + TypeScript OCPP & API server
│   ├── src/
│   │   ├── ocpp/             # OCPP 1.6 & 2.1/2.0.1 WebSocket handler & message processors
│   │   ├── api/              # REST API routes (auth, stations, chargers, rfid, etc.)
│   │   │   ├── auth/
│   │   │   ├── stations/
│   │   │   ├── chargers/
│   │   │   ├── connectors/
│   │   │   ├── transactions/
│   │   │   ├── rfid/
│   │   │   ├── tariffs/
│   │   │   └── dashboard/
│   │   ├── middleware/       # Auth & error handling middleware
│   │   ├── config/           # App configuration
│   │   └── utils/            # Shared utilities
│   ├── prisma/               # Prisma schema & migrations
│   └── package.json
│
├── Frontend/                 # Next.js 15 admin dashboard
│   ├── app/                  # App Router pages & layouts
│   ├── components/           # Reusable UI components (shadcn/ui based)
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # API client & utility functions
│   └── package.json
│
├── SETUP.md                  # Detailed setup guide
└── README.md                 # This file
```

---

## Key Features

### ⚡ OCPP 1.6 & 2.1/2.0.1 Protocol
- Full support for core OCPP 1.6 & 2.1/2.0.1 JSON messages: `BootNotification`, `Heartbeat`, `Authorize`, `StartTransaction`, `StopTransaction`, `MeterValues`, `StatusNotification`, `ChangeAvailability`, `Reset`, `UnlockConnector`, `TriggerMessage`, and more.

### 🖥️ Real-Time Dashboard
- Live charger status monitoring (Available, Charging, Faulted, Offline)
- Active session tracking with live energy and duration counters
- Real-time OCPP message log viewer for debugging

### 🎛️ Remote Control
- Start/stop charging sessions remotely
- Reset chargers (Soft/Hard)
- Unlock connectors
- Change charger availability

### 🔑 RFID Management
- Full whitelist management for RFID-authorized sessions
- Add, remove, and manage authorized tags from the dashboard

### 📊 Analytics & Reporting
- Transaction history with filtering
- Energy usage statistics per station and charger
- Status distribution and availability metrics

### 🏢 Multi-Station & Multi-Charger
- Manage multiple charging stations across different locations
- Each station supports multiple chargers with multiple connectors

### 💰 Tariff Management
- Define and manage tariffs per station
- Associate pricing with charging sessions

### 🔗 OCPI Integration (Placeholder)
- Foundational schema and placeholder routes configured for future OCPI 2.2.1 roaming implementations.

### 💳 Payments Integration (Placeholder)
- Placeholder models and routes added to enable future Stripe/Mollie integration for automated transaction billing.

### 🔒 Authentication
- JWT-based authentication for the admin dashboard
- Role-based access control

---

## Technology Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript |
| Framework | Express.js |
| OCPP Protocol | Native `ws` WebSocket library |
| Database | PostgreSQL 15+ |
| Caching/PubSub | Redis (ioredis) |
| ORM | Prisma |
| Auth | JWT (jsonwebtoken) |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State Management | React Hooks & Context API |
| Icons | Lucide React |

---

## Quick Start

### Prerequisites
- **Node.js** 20 or higher — [Download](https://nodejs.org/)
- **PostgreSQL** 15+ — [Download](https://www.postgresql.org/download/) or use a cloud provider

### 1. Clone the repository
```bash
git clone https://github.com/savekar-ev/open-source-csms.git
cd open-source-csms
```

### 2. Backend Setup
```bash
cd Backend
cp .env.example .env
# Edit .env — set your DATABASE_URL and other variables
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### 3. Frontend Setup (new terminal)
```bash
cd Frontend
npm install
npm run dev
```

### Service Endpoints

| Service | URL | Description |
|---------|-----|-------------|
| Admin Dashboard | `http://localhost:3002` | Frontend UI |
| REST API | `http://localhost:3000` | Backend API |
| OCPP WebSocket | `ws://localhost:9220` | Charger connections |
| OCPP Log Stream | `ws://localhost:3001` | Live log viewer |

---

## Detailed Setup & Production Deployment

For a step-by-step guide covering local environment configuration, as well as a complete manual for **Production Deployment on Google Cloud (Ubuntu VM)** — see **[SETUP.md](./SETUP.md)**.

## Documentation

- **[User Manual](./USER_MANUAL.md)**: A comprehensive guide on how to navigate the CMS dashboard, manage stations/chargers, RFID tags, and use remote operations.
- **[Proposed Improvements](./PROPOSED_IMPROVEMENTS.md)**: An outline of architectural enhancements and advanced features (e.g., Docker, Redis, OCPI) recommended for production scaling.

---

## Configuration

### Backend Environment Variables (`.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/ocpp_cms` |
| `PORT` | REST API port | `3000` |
| `OCPP_PORT` | OCPP WebSocket port | `9220` |
| `OCPP_LOG_WS_PORT` | Live log WebSocket port | `3001` |
| `JWT_SECRET` | Secret for JWT signing | `your-strong-secret-key` |

---

## Connecting a Charger

Once the backend is running, connect any OCPP 1.6 & 2.1/2.0.1 compliant charger or simulator to:

```
ws://<your-host>:9220/OCPP/[1.6|2.1]/<charger-id>
```

> **Note:** `<charger-id>` must match the `charger_id` of a charger registered in the system (via the dashboard or database seeding).

### Testing with a Simulator
You can use any OCPP 1.6 & 2.1/2.0.1 simulator such as:
- [OCPP Simulator (Web)](https://github.com/nickvdyck/webboss-ocpp) 
- [SteVe Test Client](https://github.com/steve-community/steve)

---

## Contributing

We welcome contributions from the community! Here's how to get started:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Commit your changes**: `git commit -m 'feat: add your feature'`
4. **Push the branch**: `git push origin feature/your-feature-name`
5. **Open a Pull Request** with a clear description of what you changed and why

### Contribution Guidelines
- Follow the existing code style (TypeScript, Prettier formatting)
- Add meaningful commit messages (we follow [Conventional Commits](https://www.conventionalcommits.org/))
- For large features, please open an **Issue** first to discuss the approach
- Ensure the backend compiles (`npm run build`) and the database schema is consistent

### Reporting Issues
Found a bug or have a feature request? [Open an issue](https://github.com/savekar-ev/open-source-csms/issues) on GitHub with as much detail as possible.

---

## About MobilityPulse

**MobilityPulse** is India's first WhatsApp + UPI EV charging platform — enabling property owners, housing societies, and businesses to monetize EV charging with our affordable, app-less CMS solution. Users can initiate charging sessions directly via WhatsApp with no downloads required.

We open-source our core OCPP CMS so the broader EV ecosystem can benefit, innovate, and grow together.

| | |
|---|---|
| 🌐 **Website** | [mobilitypulse.com](https://www.mobilitypulse.com) |
| ⚡ **Cloud CSMS** | [csms.savekar.com](https://csms.savekar.com) |
| 🔬 **OCPI Simulator** | [GitHub](https://github.com/savekar-ev/Savekar-OCPI-2.2.1-EMSP-Simulator-Project) |
| 📧 **Contact** | [savekarev@gmail.com](mailto:savekarev@gmail.com) |
| 📞 **Phone** | +91 9588033707 |
| 📍 **Location** | Bangalore, Karnataka, India |

---

## License

This project is licensed under the **ISC License**. See the [LICENSE](./LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by the <a href="https://www.mobilitypulse.com">MobilityPulse</a> team &nbsp;|&nbsp; Powering India's EV Future
</p>
