# Smart Charging Load Management

## Overview
Smart Charging Load Management ensures that the total power draw of a group of active EV chargers does not exceed the hardware constraints (maximum power or amperage) of their shared electrical infrastructure.

The system operates in real-time, continuously monitoring the "active power" of running transactions and dispatching dynamic OCPP configuration limits (`SetChargingProfile`) to chargers if the combined load surpasses defined safety thresholds.

## How it works (Real-Time Power vs Capacity)

The backend (`LoadManagementService.ts`) runs a continuous background engine that checks the live load of active transactions:

1. **Aggregation of Active Load:**
   The service queries the database for all active transactions (status: `initiated` or `charging`) within a given `ChargeGroup`. It sums up the `currentPower` (in Watts, converted to kW) and the `current` (in Amps) reported by the chargers' most recent `MeterValues`.
   * *Fallback:* If live `currentPower` metrics are unavailable (e.g., chargers aren't reporting power), it safely falls back to summing the theoretical maximum `power_capacity` of the active chargers.

2. **Threshold Checking:**
   The aggregated live load is compared against the maximum capacity constraints defined on the `ChargeGroup`:
   * `maxAmperage` (in Amps)
   * `maxPower` (in Kilowatts)

3. **Dynamic Throttling (Fair-Share Distribution):**
   If the aggregated load exceeds the defined constraints, the system automatically intervenes. It calculates a "fair-share" distribution by dividing the maximum available capacity by the number of currently active transactions.
   * For Amperage limits: It dispatches an OCPP `SetChargingProfile` with `chargingProfileId: 101` and `chargingRateUnit: "A"`.
   * For Power limits: It dispatches an OCPP `SetChargingProfile` with `chargingProfileId: 100` and `chargingRateUnit: "W"`.
   These profiles instruct the charge points to immediately throttle their output to the assigned limit.

4. **Dynamic Recovery:**
   If a car leaves or finishes charging, the aggregated load will drop. Once the load safely falls back below the threshold, the service dispatches a `ClearChargingProfile` command to remove the restrictive limits, allowing the remaining chargers to resume charging at full speed.

## How it is Activated / Disabled

**Activation:**
The Smart Charging Engine is globally enabled by default. It is initialized automatically when the backend server boots up (`server.ts`):
```typescript
import { loadManagementService } from "./services/LoadManagementService.js";
loadManagementService.startSmartChargingEngine();
```
This starts an automated loop that checks capacities every 60 seconds.

**Disabling:**
Currently, the Smart Charging Engine runs globally on a 60-second interval. To disable it entirely, you would need to remove or comment out the `loadManagementService.startSmartChargingEngine()` line in `Backend/src/server.ts`.

To disable it for a specific group of chargers without changing code, you can simply remove the `maxPower` and `maxAmperage` limits from their configured `ChargeGroup` in the database or UI. If these limits are empty or null, the service skips balancing for that group.

## Configuration

You can configure Smart Charging logic by grouping chargers into a `ChargeGroup` and setting its constraints:

1. **Create or Edit a Charge Group:** (e.g., "The Matrix Battery")
2. **Assign Chargers:** Assign the physical or simulated chargers to this group.
3. **Set Constraints:** Define the physical constraints of the electrical panel the group shares:
   * **Max Power (kW):** The total kilowatt capacity available to the group.
   * **Max Amperage (A):** The total amperage available to the group.

As long as a `ChargeGroup` has these fields configured and chargers are assigned to it, the engine will automatically manage the load dynamically based on the live data received from the chargers.
