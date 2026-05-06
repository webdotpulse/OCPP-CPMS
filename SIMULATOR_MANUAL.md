# MobilityPulse Simulator Manual

The OCPP Simulator is an integrated tool designed to help administrators and developers test the Charge Point Management System (CPMS) without requiring physical EV chargers. It acts as a real OCPP 1.6 and 2.1 client, communicating with the platform over WebSockets just like physical hardware.

## Accessing the Simulator

To access the Simulator UI, log into the web platform as an Admin and navigate to the **Simulator** page via the left sidebar.

## Spawning a Simulator

On the Simulator dashboard, you'll find a form at the top:
1.  **Charger ID:** A unique name for your simulated charger (e.g., `Sim-286`).
2.  **Protocol:** Choose between OCPP 1.6 or OCPP 2.1.
3.  **Type:** Choose whether the simulated charger outputs AC or DC current.
4.  **Max Power (kW):** The maximum power output capability (e.g., 22kW, 50kW, 150kW).

Click **"Spawn Simulator"**.

**Note:** The system will automatically register the charger and a default connector in the backend database. You will immediately see the charger appear in the standard "Chargers" list within the platform.

## Controlling a Simulator

Once spawned, the simulator will appear as a card on the dashboard.

### Status Indicators
The card will show the current OCPP state:
-   `Offline`: The simulator engine is stopped.
-   `Available`: The simulator is connected and ready to charge.
-   `Preparing`: An authorization is occurring.
-   `Charging`: An active charging session is underway.
-   `Finishing`: The session is concluding.

### Manual Controls
You can manually trigger specific OCPP actions:
-   **Boot:** Sends a `BootNotification` and `StatusNotification` (Available). This forces the charger to come "Online" to the rest of the CPMS.
-   **Start Tx:** Simulates an RFID badge swipe to authorize and send a `StartTransaction` request.
-   **Stop Tx:** Ends the current transaction and returns the charger to an `Available` state.

### Auto Simulation Loop
Instead of clicking buttons manually, you can test long-running behaviors by clicking **"Start Auto Loop"**.
-   The simulator will automatically send Heartbeats.
-   It will randomly start and stop charging transactions.
-   During a transaction, it will automatically calculate power usage and energy consumption based on its "Max Power" setting and dispatch `MeterValues` to the CPMS every few seconds.

Click **"Stop Loop"** to halt automatic operations, or **"Kill Simulator"** to completely destroy the virtual client instance and close its WebSocket connection.
