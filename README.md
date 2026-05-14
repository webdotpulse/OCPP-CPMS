<p align="center">
  <a href="https://www.mobilitypulse.com" target="_blank">
    <img src="https://www.mobilitypulse.com/assets/images/logo/logo.svg" alt="MobilityPulse – Community EV Charging Platform" height="64" style="max-width: 100%; height: auto; max-height: 64px;" />
  </a>
</p>

<h1 align="center">OCPP Charge Management System</h1>

<p align="center">
  A full-stack <strong>OCPP 1.6 & 2.1/2.0.1 Charge Point Management System (CPMS)</strong> EV charging platform.
</p>

<p align="center">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-24%2B-green?logo=node.js" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16%2B-black?logo=next.js" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-15%2B-blue?logo=postgresql" />
  <img alt="Redis" src="https://img.shields.io/badge/Redis-7%2B-red?logo=redis" />
  <img alt="OCPP" src="https://img.shields.io/badge/OCPP-1.6%20%7C%202.1-orange" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [High-Level Architecture](#high-level-architecture)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Connecting a Charger](#connecting-a-charger)
- [Testing](#testing)

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
    API -->|"Dynamic Power Limits"| LMS["Load Management Service"]
    LMS -->|"SetChargingProfile"| OCPP
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
│   │   ├── api/              # REST API routes (auth, stations, chargers, connectors, etc.)
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
└── README.md                 # This file
```

---

## Key Features

### ⚡ OCPP 1.6 & 2.1/2.0.1 Protocol
- Full support for core OCPP 1.6 & 2.1/2.0.1 JSON messages.

### 🖥️ Real-Time Dashboard
- Live charger status monitoring.
- Active session tracking with live energy and duration counters.
- Real-time OCPP message log viewer.

### 🎛️ Remote Control
- Start/stop charging sessions remotely, reset chargers, unlock connectors.

### 🔑 RFID Management
- Full whitelist management for RFID-authorized sessions.

### 🏢 Multi-Station & Multi-Charger
- Manage multiple charging stations across different locations.

### 💰 Tariff Management
- Define and manage tariffs per station. Associate pricing with charging sessions.

### ⚡ Smart Charging & Load Management
- Intelligent power distribution via `LoadManagementService`.

### ⚠️ Note on Roaming & Payments
- **OCPI & OICP Roaming**: Currently only partially implemented with foundational database schemas (`OcpiEndpoint`, `OicpEndpoint`) and placeholder API routes. Further implementation is required.
- **Payments**: The `/api/payments` endpoints and UI components are currently mock implementations/placeholders (ready for Stripe/Mollie integration but not functional yet).

---

## Technology Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24+ |
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
| Framework | Next.js 16+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |

---

## Quick Start

### Prerequisites
- **Node.js** 24.15.0 or higher
- **PostgreSQL** 15+
- **Redis** 7+

### 1. Backend Setup
```bash
cd Backend
cp .env.example .env
# Edit .env — set your DATABASE_URL and other variables
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

### 2. Frontend Setup (new terminal)
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

## Configuration

### Backend Environment Variables (`Backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/ocpp_cms` |
| `PORT` | REST API port | `3000` |
| `OCPP_PORT` | OCPP WebSocket port | `9220` |
| `OCPP_LOG_WS_PORT` | Live log WebSocket port | `3001` |
| `JWT_SECRET` | Secret for JWT signing | `your-strong-secret-key` |
| `TZ` | Timezone | `Europe/Brussels` |

---

## Connecting a Charger

Once the backend is running, connect any OCPP 1.6 & 2.1/2.0.1 compliant charger to:

```
ws://<your-host>:9220/OCPP/[1.6|2.1]/<charger-id>
```

> **Note:** `<charger-id>` must match the `charger_id` of a charger registered in the system.

## Testing

The Backend uses `jest` for unit testing with ESM support. You can run the tests using:
```bash
cd Backend
NODE_OPTIONS=--experimental-vm-modules npm run test
```
The Frontend uses ESLint.
```bash
cd Frontend
npm run lint
```
