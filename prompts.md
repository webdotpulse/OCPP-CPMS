# AI Prompts for Codebase Fixes

Below is a curated list of highly specific, actionable AI prompts designed to fix identified issues in the codebase. You can copy and paste these prompts directly to your AI assistant.

## 1. Implement Mollie Payment Gateway

**Target Files:** `Backend/src/api/payments/payments.controller.ts`, `Backend/src/api/payments/payments.routes.ts`

**The Issue:** The payment integration logic currently uses mock endpoints that return `501 Not Implemented`. A commercial-grade system must have a functional payment gateway.

**The Goal:** Implement a fully working payment integration using the Mollie API.

**Instructions:**
- Install the necessary `@mollie/api-client` package.
- In `payments.controller.ts`, replace the `createPaymentIntent` placeholder with actual logic to create a payment via the Mollie API. Use the `amount` and `currency` from the request body. Return the Mollie checkout URL or payment ID.
- Implement the `handleWebhook` to process incoming Mollie webhooks. Verify the payment status using the Mollie API and update the corresponding `PaymentTransaction` in the Prisma database (e.g., status updated to `succeeded` or `failed`).
- Ensure robust error handling and logging using the existing `logger.js`.
- Remove the "placeholder" comments and ensure the routes in `payments.routes.ts` point to the new, functional methods.

## 2. Implement OCPI Roaming Logic

**Target Files:** `Backend/src/api/ocpi/ocpi.controller.ts`

**The Issue:** The OCPI controller has placeholder methods (`getLocations`, `getTariffs`) that return `501 Not Implemented`.

**The Goal:** Replace the dummy implementation with functional endpoints that query the database or return valid OCPI-compliant payload structures.

**Instructions:**
- In `ocpi.controller.ts`, update `getLocations` to query the Prisma `ChargingStation` and `Charger` models, mapping the data to the OCPI Location object schema.
- Update `getTariffs` to query the Prisma `Tariff` model and map it to the OCPI Tariff object schema.
- Replace the dummy `testEndpoint` implementation with an actual HTTP ping to the provided endpoint URL, validating the response status.
- Ensure strict typings and error handling are used. Use the existing `logger.js` for error tracking.

## 3. Implement OICP Roaming Logic

**Target Files:** `Backend/src/api/oicp/oicp.controller.ts`

**The Issue:** The OICP controller's `testEndpoint` method is a dummy implementation returning a hardcoded success message.

**The Goal:** Implement an actual connectivity test for OICP endpoints.

**Instructions:**
- In `oicp.controller.ts`, modify `testEndpoint` to perform an actual HTTP request to the endpoint's `url` to verify connectivity. Include the endpoint's `token` in the request headers.
- Return success only if the external endpoint responds with an appropriate status code (e.g., 200 OK).
- Add error handling and logging if the request fails or times out.

## 4. Fix Load Management Loop Graceful Shutdown

**Target Files:** `Backend/src/services/LoadManagementService.ts`

**The Issue:** The `runSmartChargingLoop` uses a continuous `setTimeout` recursion (`setTimeout(() => this.runSmartChargingLoop(), 60 * 1000)`), but there is no mechanism to stop the loop or handle graceful shutdowns, potentially leading to memory leaks or orphaned timeouts during server restarts or tests.

**The Goal:** Implement a graceful stop mechanism for the smart charging engine.

**Instructions:**
- In `LoadManagementService.ts`, introduce a new private property `timeoutId?: NodeJS.Timeout`.
- Modify `runSmartChargingLoop` to assign the result of `setTimeout` to `this.timeoutId`.
- Add a new public method `stopSmartChargingEngine()`. This method should set `this.isEngineRunning = false` and call `clearTimeout(this.timeoutId)` if it exists.
- Ensure the `runSmartChargingLoop` checks `this.isEngineRunning` before scheduling the next iteration in the `finally` block to prevent the loop from continuing after being stopped.

## 5. Replace Frontend Dummy Texts and Placeholders

**Target Files:**
- `Frontend/components/connectors/ConnectorForm.tsx`
- `Frontend/components/chargers/ChargerForm.tsx`
- `Frontend/components/roaming/OcpiTab.tsx`
- `Frontend/components/roaming/OicpTab.tsx`
- `Frontend/components/tariffs/TariffForm.tsx`

**The Issue:** Several UI forms use unprofessional or mock placeholder texts (e.g., `"e.g. DEADBEAF"`, `"e.g. Ruslan"`, `"e.g. Channel 1"`).

**The Goal:** Standardize and professionalize the placeholder texts across the application.

**Instructions:**
- Review the `placeholder` attributes in the listed React components.
- Replace dummy strings with professional, context-appropriate examples. For instance, replace `"e.g. DEADBEAF"` with `"e.g. 1A2B3C4D"`, and replace `"e.g. Ruslan"` with `"e.g. VendorName"`.
- Ensure consistency in formatting (e.g., capitalizing the first letter of the placeholder if applicable).
