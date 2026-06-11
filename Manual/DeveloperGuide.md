# Developer Integration & API Guide

Welcome to the Developer Integration & API Guide for the OCPP Central Processing Management System (CPMS). This guide provides the necessary information for developers to integrate with our system, covering authentication, core REST endpoints, real-time WebSocket subscriptions, and handling custom hardware quirks.

---

## 1. Authentication

To interact with the REST API, you must obtain a JSON Web Token (JWT). The API uses Bearer Token authentication.

### Obtaining a Token

Send a POST request to `/api/auth/login` (or `/api/auth/register` to create an account) with your credentials.

**Endpoint:** `POST /api/auth/register`

**Request Payload:**
```json
{
  "email": "developer@example.com",
  "password": "your-secure-password"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"developer@example.com", "password":"your-secure-password"}'
```

**Response Payload:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "developer@example.com",
    "role": "user"
  }
}
```
*(Note: After registration or login, you will receive a token in the response or via the login endpoint. Ensure you use this token for subsequent requests).*

### Using the Token

Include the JWT in the `Authorization` header of your HTTP requests:

```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**Important:** Role-based access control (RBAC) is enforced. State-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`) generally require an `admin` role, unless modifying your own profile.

---

## 2. Core Endpoints

Here are the top 5 most critical REST endpoints for interacting with the CPMS.

### 2.1 Fetching Connected Chargers

Retrieve a list of all currently connected chargers.

**Endpoint:** `GET /api/ocpp/connected`
**Authentication:** Required

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/ocpp/connected \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Response Payload:**
```json
{
  "success": true,
  "data": [
    {
      "chargerId": 1,
      "protocol": "ocpp1.6",
      "connectedSince": "2023-10-27T10:00:00Z"
    }
  ],
  "count": 1
}
```

### 2.2 Triggering a Remote Start

Initiate a charging session remotely on a specific charger and connector.

**Endpoint:** `POST /api/ocpp/remote-start`
**Authentication:** Required (Admin)

**Request Payload (TypeScript Interface & JSON):**
```typescript
interface RemoteStartRequest {
  chargerId: number;
  connectorId: number;
  idTag: string;
}
```

```json
{
  "chargerId": 1,
  "connectorId": 1,
  "idTag": "DEADBEEF"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/ocpp/remote-start \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"chargerId": 1, "connectorId": 1, "idTag": "DEADBEEF"}'
```

**Response Payload:**
```json
{
  "success": true,
  "status": "Accepted"
}
```

### 2.3 Triggering a Remote Stop

Stop an active charging session remotely.

**Endpoint:** `POST /api/ocpp/remote-stop`
**Authentication:** Required (Admin)

**Request Payload (TypeScript Interface & JSON):**
```typescript
interface RemoteStopRequest {
  chargerId: number;
  transactionId: string | number;
}
```

```json
{
  "chargerId": 1,
  "transactionId": 12345
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/ocpp/remote-stop \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"chargerId": 1, "transactionId": 12345}'
```

**Response Payload:**
```json
{
  "success": true,
  "status": "Accepted"
}
```

### 2.4 Querying Transactions

Retrieve a list of charging transactions, including pagination and filtering.

**Endpoint:** `GET /api/transactions`
**Authentication:** Required

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `status` (optional): Filter by status (e.g., "completed")
- `chargerId` (optional): Filter by charger ID
- `search` (optional): Search by transaction ID or status

**cURL Example:**
```bash
curl -X GET "http://localhost:3000/api/transactions?page=1&limit=10&status=completed" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Response Payload:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1,
        "transactionId": "12345",
        "charger_id": 1,
        "status": "completed",
        "createdAt": "2023-10-27T10:00:00Z"
      }
    ],
    "rfidSessions": []
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 2.5 Setting a Charging Profile

Apply a charging profile (e.g., for load balancing or V2G) to a charger.

**Endpoint:** `POST /api/ocpp/set-charging-profile`
**Authentication:** Required (Admin)

**Request Payload (TypeScript Interface & JSON):**
```typescript
interface SetChargingProfileRequest {
  chargerId: number;
  connectorId: number;
  csChargingProfiles: any; // OCPP Charging Profile object
}
```

```json
{
  "chargerId": 1,
  "connectorId": 1,
  "csChargingProfiles": {
    "chargingProfileId": 100,
    "stackLevel": 0,
    "chargingProfilePurpose": "TxProfile",
    "chargingProfileKind": "Absolute",
    "chargingSchedule": {
      "chargingRateUnit": "A",
      "chargingSchedulePeriod": [
        {
          "startPeriod": 0,
          "limit": 16.0
        }
      ]
    }
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/ocpp/set-charging-profile \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"chargerId": 1, "connectorId": 1, "csChargingProfiles": {"chargingProfileId": 100, "stackLevel": 0, "chargingProfilePurpose": "TxProfile", "chargingProfileKind": "Absolute", "chargingSchedule": {"chargingRateUnit": "A", "chargingSchedulePeriod": [{"startPeriod": 0, "limit": 16.0}]}}}'
```

**Response Payload:**
```json
{
  "success": true,
  "status": "Accepted"
}
```

---

## 3. WebSocket Subscriptions

For real-time telemetry and transaction updates, custom frontends or mobile apps can connect to our Socket.IO server.

**Connection Endpoint:**
`ws://<your-server-host>/api/realtime`

**Configuration:**
The Socket.IO server is configured with the path `/api/realtime`. Ensure your Socket.IO client matches this path.

**Client Example (JavaScript):**
```javascript
import { io } from "socket.io-client";

// Connect to the Socket.IO server
const socket = io("http://localhost:3000", {
  path: "/api/realtime"
});

socket.on("connect", () => {
  console.log("Connected to Realtime WebSocket:", socket.id);
});

// Listen for charger status updates
socket.on("CHARGER_STATUS_UPDATE", (payload) => {
  console.log("Live Update Received:", payload);
  // payload structure varies, but typically includes:
  // { chargerId: number, connectorId: number, status: string, errorCode: string }
});

socket.on("disconnect", () => {
  console.log("Disconnected from Realtime WebSocket");
});
```

---

## 4. Adding Custom Hardware Quirks

If an EVSE brand violates standard OCPP specifications (e.g., failing to report power values, incorrect energy formatting), you can normalize this behavior using our Quirks Engine.

### How to Add a Quirk

1. **Identify the Issue:** Determine what the charger is reporting incorrectly via the `ocppLog` table or the `/api/chargers/:id/logs` endpoint.
2. **Define the Rule in the Database:** The CPMS uses a database-driven `quirk-profiles` system. Create a profile that defines the necessary transformations.
3. **The Normalizer Logic:** The backend uses `Backend/src/ocpp/quirkNormalizer.ts` to apply these rules.

### Supported Quirk Rules (`quirkNormalizer.ts`)

- `calculatePowerFromVoltageAndCurrent`: (Boolean) If the charger doesn't report `powerValue`, the engine will calculate it using single-phase ($V \times I$) or 3-phase ($\sum V_{Ln} \times I_{Ln}$) formulas.
- `energyMultiplier`: (Number) Multiplies the `energyValue` by a constant (useful if the charger reports in Wh instead of kWh, or vice-versa).
- `estimateEnergyFromPower`: (Boolean) Estimates energy consumption over time if the charger only reports power (W) but not energy (Wh).

### Example: Fixing a Charger Missing Power Values

Suppose a new brand "ZapCharge" reports Voltage and Current but no Power.

1. **Create the Quirk Profile via API:**

**Endpoint:** `POST /api/quirk-profiles` (assuming a generic CRUD endpoint exists based on routes)

**Payload:**
```json
{
  "name": "ZapCharge Power Fix",
  "brand": "ZapCharge",
  "rules": {
    "calculatePowerFromVoltageAndCurrent": true
  }
}
```

2. **Assign the Profile:** Ensure the specific charger or brand is mapped to this quirk profile in your database configuration.

3. **Under the Hood:** When a `MeterValues` request arrives, `quirkNormalizer.ts` intercepts it:

```typescript
// Inside quirkNormalizer.ts
if (rules.calculatePowerFromVoltageAndCurrent && (!powerValue || powerValue === 0)) {
  if (payload.voltage_L1 != null && payload.current_L1 != null /* ... */) {
    // 3-phase calculation
    powerValue = (payload.voltage_L1 * payload.current_L1) + ...
  } else if (voltageValue != null && currentValue != null) {
    // Single phase fallback
    powerValue = voltageValue * currentValue;
  }
}
```

By defining these rules, the CPMS will automatically clean the incoming data before it hits the core transaction logic or the database, ensuring seamless operation regardless of hardware compliance issues.
