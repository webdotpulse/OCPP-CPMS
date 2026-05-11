# Quirk Profiles Manual

## What are Quirk Profiles?

In the Open-Source Charging Station Management System (CSMS), **Quirk Profiles** provide a powerful mechanism to dynamically normalize and correct telemetry data directly on the backend. This allows the system to support a wide range of charging hardware, some of which may send non-standard, malformed, or incomplete data through Open Charge Point Protocol (OCPP) messages.

Unlike Configuration Profiles, which send `ChangeConfiguration` commands to update the internal software behavior of a charger, Quirk Profiles intercept the data *after* it leaves the charger but *before* it is saved into the database and displayed to the user.

## Why are they used?

Different charging hardware manufacturers occasionally have bugs or inconsistencies in their firmware:
1. **Missing Power Readings**: Some chargers may send voltage (`V`) and current (`A`) correctly during a session, but fail to calculate and report the active power (`W`).
2. **Incorrect Energy Units**: A charger might send energy readings in `kWh` (e.g., `12.5`) instead of the standard `Wh` expected by the CSMS (e.g., `12500`).
3. **Missing Energy Accumulation**: A charger may report the instantaneous power draw but not the total energy consumed over the duration of the charging session.
4. **Firmware Limitations**: Some legacy hardware simply cannot be updated with a Configuration Profile to solve the issue.

Quirk Profiles allow operators to correct these issues seamlessly on the server side without needing manufacturer firmware patches.

## How do they work?

### Database Architecture
Quirk Profiles are managed through two main components in the Prisma database schema:
1. `QuirkProfile`: Contains the name, description, and the JSON `rules` that define what mutations to apply.
2. `Charger`: Can optionally be linked to a single `ChargerQuirkProfile` (via the `quirkProfileId` field).

### Normalization Process
When a charger sends a `MeterValues` payload (usually containing telemetry like energy, power, voltage, and current) to the CSMS:
1. The backend OCPP handlers (`v16Handlers.ts` or `v21Handlers.ts`) identify if the originating charger is linked to a Quirk Profile.
2. If linked, the payload and the JSON rules are passed through the `quirkNormalizer.ts` module.
3. The normalizer evaluates the rules against the payload and mutates the data.
4. The cleaned, accurate data is then forwarded to the `MeterValueService` for persistence and broadcast to the dashboard.

---

## Examples of Rules

The JSON `rules` object allows for granular data correction:

### 1. `calculatePowerFromVoltageAndCurrent`
* **Condition**: If the payload is missing `powerValue` or it's `0`, but it *does* contain both `voltageValue` and `currentValue`.
* **Action**: Multiplies Voltage by Current to calculate Power in Watts (`W`), and injects it into the payload.
* **Example Usage**: Hardware that fails to natively calculate power.

### 2. `energyMultiplier`
* **Condition**: The rule specifies a numerical multiplier, and the payload contains an `energyValue`.
* **Action**: Multiplies the reported energy value by the specified factor.
* **Example Usage**: A charger reports `12` (kWh) instead of `12000` (Wh). You would use a multiplier rule of `1000`.

### 3. `estimateEnergyFromPower`
* **Condition**: The rule is enabled.
* **Action**: Tracks the `powerValue` (Watts) and the time elapsed since the last reading (in hours), and integrates them to estimate the `energyValue` (Watt-hours). It maintains this running total across the transaction using Redis.
* **Example Usage**: A charger natively lacks an energy meter but reports real-time power draw.

---

## Managing Quirk Profiles via the UI

The Quirk Profiles page (`/quirk-profiles`) provides an administrative interface to manage and assign these data rules:

### Creating a Quirk Profile
1. Navigate to **Quirk Profiles** in the side navigation menu.
2. Click **Create Profile**.
3. Provide a Name and an optional Description.
4. Provide the rules in valid JSON format. Example:
   ```json
   {
     "calculatePowerFromVoltageAndCurrent": true,
     "energyMultiplier": 1000
   }
   ```
5. Save the profile.

### Applying a Quirk Profile
1. Navigate to the **Chargers** list and click on an individual charger to open its details page.
2. Go to the **Configuration** tab.
3. Under the Hardware Quirk Profile section, select your Quirk Profile from the dropdown menu and apply it. Future messages from that charger will automatically run through the normalizer.
