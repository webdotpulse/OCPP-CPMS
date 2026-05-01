# User Manual - Open-Source OCPP CMS Dashboard

Welcome to the User Manual for the Open-Source OCPP 1.6 & 2.1/2.0.1 Charge Point Management System (CMS). This guide will help operators, administrators, and station managers understand how to navigate and utilize the web-based administrative dashboard.

## Table of Contents

1. [Dashboard Overview](#dashboard-overview)
2. [Managing Charging Stations](#managing-charging-stations)
3. [Managing Chargers & Connectors](#managing-chargers--connectors)
4. [Managing RFID Tags](#managing-rfid-tags)
5. [Remote Operations](#remote-operations)
6. [Viewing Transactions & Sessions](#viewing-transactions--sessions)
7. [Live OCPP Logs Viewer](#live-ocpp-logs-viewer)

---

## 1. Dashboard Overview

When you log into the CMS, you are greeted with the **Dashboard Overview**. This acts as the command center for your entire charging network.

### Key Metrics
- **Total Stations & Chargers**: Quickly see the size of your network.
- **Online/Offline Status**: Identify how many chargers are currently connected and active versus offline.
- **Active Sessions**: The number of vehicles currently charging in your network.
- **Energy Delivered Today**: Total energy (in kWh) dispensed across the network for the current day.

### Connector Distribution
A visual breakdown showing the current state of all connectors:
- **Available**: Ready to charge.
- **Charging**: Currently delivering power.
- **Faulted**: Experiencing an error or failure.
- **Unavailable**: Disabled or out of service.

---

## 2. Managing Charging Stations

A **Charging Station** represents a physical location or site where chargers are installed.

### Viewing Stations
Navigate to the **Stations** tab to see a list of all your locations. You can see the name, address, contact person, and the number of chargers at each site.

### Creating a New Station
1. Click **Add New Station**.
2. Fill out the station details:
   - Station Name
   - Complete Address (Street, City, State, Postal Code)
   - Coordinates (Latitude and Longitude)
   - On-site contact information (Name, Contact Details, Emergency Contact)
3. Click **Save**.

### Editing or Deleting
You can edit the details of a station or delete it entirely using the action buttons next to the station in the list.

---

## 3. Managing Chargers & Connectors

**Chargers** (or Charge Points) are the physical EVSE devices connected via OCPP. **Connectors** are the individual plugs on those chargers.

### Adding a Charger
Before adding a charger, you must have at least one Charging Station created.
1. Navigate to the **Chargers** tab.
2. Click **Add Charger**.
3. Fill in the hardware details:
   - Charger Name (must match the exact `charger_id` configured in the hardware for OCPP connection)
   - Model, Manufacturer, Serial Number
   - Power Capacity and Consumption
   - Select the **Charging Station** it belongs to.
4. Click **Save**.

### Managing Connectors
Once a charger is added, you can define its connectors.
1. Select the charger from the list.
2. Navigate to the **Connectors** section.
3. Click **Add Connector**.
4. Specify the Connector ID (e.g., `1`, `2`), Type (e.g., `Type2`, `CCS2`), and Max Power.

---

## 4. Managing RFID Tags

RFID tags are used by EV drivers to authenticate and start charging sessions at the charger directly.

### Adding an RFID Tag
1. Navigate to the **RFID Tags** (or Users) tab.
2. Click **Add Tag**.
3. Enter the `rfid_tag` exactly as it reads on the physical card.
4. Add user details (Name, Email, Phone).
5. Set the type (e.g., Postpaid).
6. Ensure **Active** is toggled on if you want the user to be able to charge immediately.
7. Click **Save**.

### Deactivating a Tag
If a user loses their card or their account needs to be suspended, simply edit the tag and toggle the **Active** status to off. The charger will reject authorization requests for this tag.

---

## 5. Remote Operations

The CMS allows operators to perform actions on the chargers remotely via the OCPP protocol. Navigate to a specific charger's detail page or the **Remote Control** tab to access these commands:

- **Remote Start**: Start a charging session for a specific connector. You will need to provide a valid RFID tag ID associated with an active user.
- **Remote Stop**: Stop an active charging session by providing the `transactionId`.
- **Soft Reset**: Gracefully restarts the charger software.
- **Hard Reset**: Forcibly restarts the charger hardware.
- **Unlock Connector**: Releases the locking mechanism on the connector. Useful if a user's cable gets stuck.
- **Trigger Message**: Request the charger to send a specific status update or configuration to the CMS.

---

## 6. Viewing Transactions & Sessions

Track all charging activity across your network.

### Active Sessions
Navigate to the **Active Sessions** view to see all vehicles currently plugged in and charging. You can monitor the real-time energy consumption (updated based on MeterValues from the charger).

### Transaction History
Navigate to the **Transactions** tab to view completed sessions.
- **Filters**: You can filter transactions by charger, station, date range, or user.
- **Details**: Click on a transaction to view start/stop times, meter start/stop values, total energy consumed, and calculated cost (for postpaid billing).

---

## 7. Live OCPP Logs Viewer

For technical debugging, the CMS provides a real-time log viewer.

1. Navigate to the **OCPP Logs** tab.
2. You will see a live stream of WebSocket messages exchanged between the chargers and the CMS.
3. Messages include:
   - `BootNotification`
   - `Heartbeat`
   - `Authorize`
   - `StartTransaction` / `StopTransaction`
   - `MeterValues`
   - `StatusNotification`
4. This tool is invaluable for troubleshooting connectivity issues or analyzing charger behavior without needing access to backend server console logs.

---
*For further technical support or configuration, refer to the `README.md` and `SETUP.md` files located in the project root.*