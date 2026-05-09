# RFID Valid/Invalid Documentation

This document describes the rules for determining whether an RFID card is valid or invalid when attempting to start a charging session.

## Validity Rules

An RFID card is considered **valid** if it meets the following criteria:
1.  **Active Status:** The `RfidUser` associated with the tag must be marked as `active` in the database.
2.  **Authorization Scope:**
    *   **Free / Admin Cards:** Cards designated as "Free / Admin" (by linking to a user with admin privileges, or a globally accepted 'free' group if configured) are authorized to start a charging session on **any** charger in the system.
    *   **Customer Cards:** An RFID card belonging to a regular customer is only valid for chargers that belong to the `ChargeGroup` to which the customer is explicitly linked.
        *   The backend verifies this by checking if the `owner_id` of the `RfidUser` is linked to the charger's assigned `ChargeGroup` via a `ChargeGroupUser` database record.
        *   If a customer tries to use their card on a charger belonging to a different `ChargeGroup` (where they are not a member), the card will be deemed **invalid**.

## Invalidity Reasons

An RFID card is considered **invalid** if:
*   The tag does not exist in the database.
*   The tag exists but is marked as inactive (`active = false`).
*   The tag belongs to a regular customer, but the customer is not a member of the `ChargeGroup` that the specific charger belongs to.
