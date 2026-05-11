# Configuration Profiles Manual

## What are Configuration Profiles?

In the Open-Source Charging Station Management System (CSMS), **Configuration Profiles** are reusable collections of standard Open Charge Point Protocol (OCPP) configuration keys and values. They are designed to streamline the management of chargers and ensure consistent reporting of metrics, telemetry data, and connection settings across different charger brands.

Rather than configuring individual chargers manually one by one, administrators can define a preset "Profile" (e.g., "Perfect Session", "Recovery Profile") and apply it to one or multiple chargers instantly. When applied, the CSMS communicates with the charger and dispatches standard `ChangeConfiguration` OCPP commands to update the charger's internal state.

## Why are they used?

### 1. **Standardizing Charger Behavior**
Different charger manufacturers often ship with inconsistent default configurations. Some might report energy every 15 minutes, while others don't report power or state-of-charge (SoC) natively during a session. A standard configuration profile ensures all connected hardware follows the same rules.

### 2. **High-Resolution Telemetry**
Features like the Dashboard rely on accurate real-time data (`currentPower`, `energyConsumed`, `soc`). Configuration Profiles ensure that chargers are instructed to report the exact subset of required `MeterValues` at a precise interval (e.g., every 30 seconds).

### 3. **Data Recovery**
If a transaction is currently ongoing but the system detects missing data (such as missing `Power` or `SoC`), the system can dynamically construct and apply a "Recovery Profile" targeted specifically to correct the missing data feed for that charger mid-transaction.

### 4. **Reliability and Connectivity Settings**
Profiles can manage essential network and security features such as WebSocket ping intervals, message retry attempts, and local authorization list limitations.

---

## How do they work?

### Database Architecture
Configuration Profiles consist of two primary Prisma database models:
1. `ConfigurationProfile`: Stores the profile metadata (Name, Description).
2. `ConfigurationProfileItem`: A one-to-many relationship storing the individual configuration key-value pairs (e.g., `key: "MeterValueSampleInterval"`, `value: "30"`).

### Dispatch Mechanism
When an administrator clicks "Apply Profile" on a specific charger:
1. The backend (`config-profiles.controller.ts`) loads the specified profile and all its items.
2. It verifies the target charger is currently **Online**.
3. It iterates over each item, dispatching a `ChangeConfiguration` OCPP command to the charger via the `remoteControl.ts` module.
4. If the charger responds with an `Accepted` or `RebootRequired` status, the backend successfully records the updated parameter locally in the `ChargerConfiguration` database table.
5. The UI provides a report on how many keys were successfully configured versus how many failed (usually due to a read-only parameter or unsupported key by the specific charger brand).

---

## Pre-defined Use Cases and Generators

The backend provides endpoints to auto-generate helpful standard profiles:

### The "Super Extreme Advanced & Extended Profile"
Generates an exhaustive list of standard OCPP 1.6 configurations.
**Key configurations include:**
* `MeterValuesSampledData`: `Energy.Active.Import.Register,Power.Active.Import,SoC,Current.Import,Current.Offered,Voltage,Frequency,Temperature`
* `MeterValueSampleInterval`: `30` (Reports data every 30 seconds)
* `ClockAlignedDataInterval`: `900` (15 minutes)
* `WebSocketPingInterval`: `60`

### The "Recovery Profile"
If a specific transaction (`transactionId`) is lacking metrics, the backend evaluates the missing fields. For example, if `soc` and `currentPower` are null, it dynamically generates a profile containing:
* `MeterValuesSampledData`: `Energy.Active.Import.Register,Power.Active.Import,SoC`
* `MeterValueSampleInterval`: `15` (Fast recovery interval)

---

## Managing Profiles via the UI

The Configuration Profiles page (`/config-profiles`) provides a complete interface for managing your presets:

### Creating a Profile
1. Navigate to **Configuration Profiles** in the side navigation.
2. Click **New Profile**.
3. Enter a Profile Name and Description.
4. Add custom Keys and Values, or click **Load Perfect Session Preset** to populate a standard set of reliable metrics.
5. Save the profile.

### Applying a Profile
1. Navigate to the **Chargers** list and click on an individual charger to open its details page.
2. Go to the **Configuration** tab.
3. Scroll down to the **Apply Configuration Profile** section.
4. Select the desired profile from the dropdown list.
5. Click **Apply Profile**. Ensure the charger is online, as offline chargers will reject the commands.

### Exporting & Importing
You can export profiles directly to JSON format. This is particularly useful when migrating configurations between staging and production environments, or when sharing standardized profiles with other CSMS operators.
Use the **Export** button on any profile card, and the **Import Profile** button at the top of the page to load it back in.
