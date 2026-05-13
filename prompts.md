# Repository Analysis & Refactoring Prompts

## Frontend

### Issue 1: Hardcoded Configuration Keys (Mock Data & Hardcoded Values)
**Description:** The frontend README indicates that some environment variables or configuration keys might be hardcoded in development instead of being dynamically read from `.env`.
**Actionable Prompt:**
```
Check the `Frontend/README.md` and scan the `Frontend/` directory for any hardcoded environment variables (e.g., `process.env.NEXT_PUBLIC_API_URL` fallbacks or hardcoded API keys/ports). Please refactor the code to ensure it strictly reads from the `.env` file in all environments (development, staging, and production). Do not leave hardcoded fallback strings for sensitive keys or API endpoints.
```

### Issue 2: Direct State Mutation / Poor State Management (Architectural Flaws & Anti-patterns)
**Description:** While no overt `FIXME` flags exist, the frontend might be relying on `console.error` for state updates or omitting proper user feedback on errors. There are multiple `console.error` statements scattered across pages and components without updating the UI state using toasts (e.g., `sonner`) or local React state for error boundaries.
**Actionable Prompt:**
```
Review the frontend files listed below that use `console.error` to handle API or logic errors. Replace or supplement these console logs with user-friendly toast notifications using `sonner` (`import { toast } from 'sonner'`) and ensure the component state is updated appropriately so the user is aware of the failure.
Files to check:
- Frontend/components/chargers/MobileSpeedOverride.tsx
- Frontend/app/settings/templates/page.tsx
- Frontend/app/settings/mail/page.tsx
- Frontend/app/mobile/chargers/[id]/page.tsx
- Frontend/app/chargers/[id]/page.tsx
- Frontend/app/charge-groups/page.tsx
- Frontend/app/charge-groups/create/page.tsx
- Frontend/app/charge-groups/[id]/edit/page.tsx
- Frontend/app/users/page.tsx
```

## Backend

### Issue 3: Hardcoded Mock Data in EpexSpotService (Mock Data & Hardcoded Values)
**Description:** `Backend/src/services/EpexSpotService.ts` generates mock prices for the next 24 hours using a random number generator instead of calling an actual EPEX spot price API.
**Actionable Prompt:**
```
In `Backend/src/services/EpexSpotService.ts`, the `fetchAndStoreDayAheadPrices` method is currently generating mock data using a random number generator and hardcoded math (e.g., `const basePrice = 50; const randomVariation = Math.random() * 100 - 20;`). Please refactor this method to integrate with a real, external EPEX spot price API (or a robust mock API structure configured via environment variables). Ensure proper error handling and logging for external API failures.
```

### Issue 4: Unfinished API Endpoints (Unfinished Code)
**Description:** Several API controllers contain placeholder logic returning `501 Not Implemented` with static messages.
**Actionable Prompt:**
```
The following backend API controllers contain unfinished placeholder routes that return a `501 Not Implemented` status:
- `Backend/src/api/payments/payments.controller.ts`: `createPaymentIntent` and `handleWebhook`
- `Backend/src/api/ocpi/ocpi.controller.ts`: `getLocations` and `getTariffs`
- `Backend/src/api/oicp/oicp.controller.ts`: `testEndpoint` returns a dummy "Connection successful" message.

Please implement the actual business logic for these endpoints. If integration is not currently feasible, ensure they return a standardized error response object matching the API's standard format (e.g., using a custom error class) rather than hardcoded 501 responses.
```

### Issue 5: Empty Catch Blocks in ChargePointSimulator (Unfinished Code)
**Description:** `Backend/src/simulator/ChargePointSimulator.ts` contains empty catch blocks that swallow errors silently.
**Actionable Prompt:**
```
In `Backend/src/simulator/ChargePointSimulator.ts`, there are empty `catch (e) {}` and `catch (err) {}` blocks (around line 159 and 302). Please fix these empty catch blocks by adding proper error logging using the Winston `logger` utility. Ensure no errors are swallowed silently.
```

## Database

### Issue 6: Unoptimized Database Queries / Prisma in Loops (Architectural Flaws & Anti-patterns)
**Description:** `Backend/src/services/LoadManagementService.ts` is making Prisma queries inside `for...of` loops, which is an N+1 query problem and an anti-pattern that can severely degrade database performance.
**Actionable Prompt:**
```
In `Backend/src/services/LoadManagementService.ts`, there are several unoptimized database queries where Prisma operations (`findUnique`, `upsert`, `deleteMany`) are executed inside `for...of` loops iterating over `activeTransactions`.
Please refactor these loops to avoid the N+1 query problem. Use Prisma's bulk operations (like `findMany` with `in` clauses, `createMany`, `updateMany`, or perform queries concurrently using `Promise.all()`) to optimize database access and improve performance during load management calculations.
```
