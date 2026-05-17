# AI Prompts for Codebase Fixes

Below is a curated list of highly specific, actionable AI prompts designed to fix identified issues or build out new features in the codebase. You can copy and paste these prompts directly to your AI assistant.

## 1. Implement Mollie Payment Gateway

**Target Files:** `Backend/src/api/payments/payments.controller.ts`, `Backend/src/api/payments/payments.routes.ts`

**The Issue:** The payment integration logic currently uses mock endpoints that return `501 Not Implemented`. A commercial-grade system must have a functional payment gateway.

**The Goal:** Implement a fully working payment integration using the Mollie API.

**Instructions:**
- Install the necessary `@mollie/api-client` package.
- In `payments.controller.ts`, replace the `createPaymentIntent` placeholder with actual logic to create a payment via the Mollie API. Use the `amount` and `currency` from the request body. Return the Mollie checkout URL or payment ID.
- Implement the `handleWebhook` to process incoming Mollie webhooks. Verify the payment status using the Mollie API and update the corresponding `PaymentTransaction` in the Prisma database (e.g., status updated to `succeeded` or `failed`).
- Ensure robust error handling and logging using the existing `logger.ts`.
- Remove the "placeholder" comments and ensure the routes in `payments.routes.ts` point to the new, functional methods.

## 2. Implement Full OICP Roaming Protocol

**Target Files:** `Backend/src/api/oicp/oicp.controller.ts`, `Backend/src/api/oicp/oicp.routes.ts`

**The Issue:** The OICP controller currently only implements a basic connectivity test (`testEndpoint`), but lacks the required methods to push dynamic EVSE status updates or process Hubject CPO authorizations.

**The Goal:** Build out the core Hubject OICP CPO features.

**Instructions:**
- In `oicp.controller.ts`, add a method `pushEvseData` that gathers all active `Charger` and `Connector` statuses and formats them according to the `eRoamingPushEvseData` specification. Send this payload to the saved Hubject endpoints.
- Add a method `authorizeStart` to handle incoming OICP authorization requests. Validate the incoming RFID tag against the local Prisma database (or external clearinghouse if configured) and return a standard `eRoamingAuthorizeStart` response.
- Expose these new methods in `oicp.routes.ts`.

## 3. Implement End-to-End Playwright UI Tests

**Target Files:** `Frontend/playwright.config.ts`, `Frontend/tests/`

**The Issue:** The Next.js frontend currently lacks automated end-to-end (E2E) testing to prevent regressions during active development.

**The Goal:** Set up Playwright and write basic E2E tests for the core dashboard flow.

**Instructions:**
- Initialize Playwright in the `Frontend/` directory. Create a `playwright.config.ts` targeting `http://localhost:3002`.
- Write a `tests/login.spec.ts` test that bypasses authentication by injecting a mocked JWT and `user` object into `window.localStorage` and reloading the page.
- Write a `tests/dashboard.spec.ts` test that verifies the navigation sidebar renders correctly and that the "Stations" page loads and displays a data table.
- Ensure the tests can capture screenshots or videos on failure to aid debugging.