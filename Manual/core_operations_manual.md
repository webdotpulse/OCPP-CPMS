# Core Operations Manual

Welcome to the **Core Operations Manual** for the CPMS platform. This guide is specifically designed for Charge Point Operators (CPOs) who interact with the system on a daily basis. It provides step-by-step instructions on managing your electric vehicle charging infrastructure, troubleshooting, and handling real-time operations.

---

## 1. Asset Management

The CPMS organizes your charging infrastructure into a logical hierarchy: **Charge Groups** > **Stations** > **Chargers** > **Connectors**.

### Hierarchy Overview
*   **Charge Groups:** Logical collections of stations (e.g., "North America Region" or "Corporate Campuses"). These are often used to define high-level power limits (max power in kW or Amperage) across multiple locations.
*   **Stations:** Physical locations (e.g., "Main Office Parking") where chargers are installed.
*   **Chargers:** The physical hardware units (e.g., a specific Delta or Kempower unit).
*   **Connectors:** The physical plugs on a charger (e.g., Channel 1, Channel 2).

### Step-by-Step: Managing Assets

**Creating a Charge Group:**
1. Navigate to **Charge Groups** in the sidebar.
2. Click **Add Charge Group**.
3. Provide a name and optional description.
4. Set the maximum allowed capacity (kW or Amps) if load management is required across the group.
5. Click **Save**.

**Creating a Station:**
1. Navigate to **Stations** in the sidebar.
2. Click **Add Station**.
3. Fill in the location details (Station Name, Address, City, Postal Code, Latitude, and Longitude).
4. Assign an owner from the dropdown list.
5. Define any maximum power constraints specific to this station.
6. Click **Save**.

**Adding a Charger:**
1. Navigate to **Chargers** in the sidebar.
2. Click **Add Charger**.
3. Input the **Charger ID** (this must match the identifier configured in the physical hardware).
4. Fill in manufacturer details, model, and serial number.
5. Assign the charger to an existing **Station**.
6. Set the charger's total power capacity.
7. Click **Save**.

**Configuring Connectors:**
1. Once a charger is created, open its details page and navigate to the **Connectors** section.
2. Add the physical connectors, specifying the connector ID, type (AC/DC), maximum voltage, and max power.
3. Save the configuration to ensure accurate live status reporting.

`[Insert Screenshot of Asset Management Table here]`

---

## 2. Ground Plan Builder

The **Ground Plan Builder** allows CPOs to visually map out the physical layout of their charging stations. This is crucial for on-site troubleshooting and providing drivers with an intuitive overview.

### Using the Ground Plan Builder

1. Navigate to **Stations** and select a specific station.
2. If Ground Plan is enabled for the station, click on the **Ground Plan Builder** tab.
3. You will see a grid workspace.
4. **Add Parking Spots:** Click the **Add Spot** button to create a new parking bay.
5. **Drag and Drop:** Use your mouse to drag the parking spot to the correct location on the grid.
6. **Resize and Rotate:** Click on a spot to adjust its dimensions (width/height) and rotation angle to match the physical layout of the parking lot.
7. **Assign Connectors:** Link specific connectors from your chargers to the parking spots. This visually ties the hardware to the physical location.
8. Click **Save Layout** when finished.

### Ground Plan Live View

Once built, the **Ground Plan Live View** provides a real-time visual representation of the station.
*   Parking spots will change color based on the assigned connector's status (e.g., Green for Available, Blue for Charging, Red for Faulted).
*   This view allows operators to quickly identify which physical bays are occupied or experiencing issues.

`[Insert Screenshot of Ground Plan Builder here]`

---

## 3. Real-Time Operations & Remote Control

The CMS allows operators to send instantaneous commands to chargers via the OCPP WebSocket connection. The UI updates in real-time as the charger responds.

### Using the Remote Control Panel

1. Navigate to **Chargers** and click on a specific charger to open its detail view.
2. Open the **Remote Control** tab.

**Available Commands:**
*   **Remote Start/Stop:** Manually start a transaction by entering an authorized RFID tag and selecting the connector. You can also manually terminate active sessions.
*   **Reset:**
    *   **Soft Reset:** Gracefully stops ongoing transactions before rebooting the charger.
    *   **Hard Reset:** Forces an immediate reboot of the hardware (use with caution).
*   **Unlock Connector:** If a cable is stuck in the charger or vehicle, select the connector ID and trigger an unlock command.
*   **Change Availability:** Set a connector to `Operative` (available for use) or `Inoperative` (out of order).
*   **Clear Cache:** Forces the charger to wipe its local RFID authorization cache.

**Real-Time Feedback:**
When a command is sent, the system awaits a `CALLRESULT` from the charger. You will see a loading indicator, followed by a success or failure notification based on the charger's response. The dashboard status will automatically update (e.g., from `Charging` to `Finishing` upon a successful Remote Stop).

`[Insert Screenshot of Remote Control Panel here]`

---

## 4. Diagnostics & Logging

When a charger goes offline or a transaction fails, detailed logs are essential for root-cause analysis.

### OCPP Log Viewer

The **OCPP Log Viewer** provides a real-time stream of all raw WebSocket messages between the CPMS and the charging network.

1. Navigate to **Logs** (or the OCPP section) in the sidebar.
2. **Filtering:** You can filter the live stream by a specific **Charger ID** or search for specific message types (e.g., `BootNotification`, `StartTransaction`).
3. **Inspection:** Click on any log entry to view the full, parsed JSON payload. This is critical for identifying why a charger rejected a command (e.g., missing fields or invalid format).

### Channel Logs

For a focused view on a specific unit:
1. Go to a specific **Charger's** detail page.
2. Open the **Channel Logs** tab.
3. This view filters out network noise and only displays events relevant to that specific charger and its connectors.
4. Use this to trace the exact sequence of events leading up to a failed transaction or a `Faulted` status.

`[Insert Screenshot of OCPP Log Viewer here]`

---

## 5. Access Control (RFID)

The CPMS uses a strict whitelist approach for authorizing charging sessions. Drivers must be registered and possess an authorized RFID tag to initiate a charge.

### Managing RFID Users and Tags

**Adding a User and Tag:**
1. Navigate to **Users** in the sidebar.
2. Create a new user profile with their contact information.
3. Navigate to **RFID Management** (often located under Users or as a dedicated top-level menu `rfid`).
4. Click **Add New Tag**.
5. Enter the **idTag** (the physical identifier printed on or read from the RFID card).
6. Assign the tag to the specific user created earlier.
7. Ensure the tag is marked as **Active**.

**Revoking Access:**
*   To instantly stop a user from charging, locate their tag in the RFID Management list and toggle the status to **Inactive**, or delete the tag entirely.
*   If a charger relies on a local authorization cache (offline mode), remember to use the **Clear Cache** command in the Remote Control panel to ensure the revoked status is immediately synchronized to the hardware.

`[Insert Screenshot of RFID Management Table here]`