# Tasks and Improvements Backlog

This document collects findings, bug fixes, code improvements, and product enhancements discovered during the codebase review. It is structured as a backlog.

## 1. Bugs Addressed
- [x] **Backend Compile Errors:** Fixed `Implicitly has an 'any' type` errors in `Backend/src/services/LoadManagementService.ts` for the `reduce` callback parameters and in `Backend/src/ocpp/ocppServer.ts` for `.catch` callback parameter, ensuring `tsc` successfully compiles the backend.
- [x] **Frontend Compile Warnings:** Fixed an unused import `Banknote` in `Frontend/components/layout/Sidebar.tsx` which was causing linter warnings during Next.js builds.

## 2. Proposed Code Improvements
- [ ] **Prisma Configuration Fix:** The database module (`Backend/src/config/database.ts`) attempts to instantiate the PrismaClient. However, to correctly resolve module boundaries when using `@prisma/adapter-pg` with `PrismaClient`, ensure the `prisma-client-js` is generated into the default `node_modules/@prisma/client` path, and `@prisma/client` and `prisma` packages' versions align. The explicit import should be from `@prisma/client` (which is correctly done, but required manual dependency addition during review).
- [ ] **Prisma Relation Delete Rules (`onDelete: Cascade`):** The Prisma schema in `Backend/prisma/schema.prisma` is missing `onDelete: Cascade` on many crucial relations. As identified in the codebase memory, attempting to delete a `Charger` without cascading deletes fails due to foreign key constraints on dependent models (`Connector`, `Transaction`, `OcppLog`, `RfidSession`, `ChargerConfiguration`, `ChargingProfile`). The schema should be updated to apply `onDelete: Cascade` systematically to simplify cleanup operations.
- [ ] **Frontend Hook Dependencies:** Several files (e.g., `app/chargers/page.tsx`, `app/charge-groups/page.tsx`, `app/transactions/page.tsx`) trigger warnings during build (`React Hook useEffect has a missing dependency`). The fetch functions (e.g., `fetchChargers`, `fetchGroups`) should be wrapped in `useCallback` and added to the `useEffect` dependency arrays to prevent potential bugs and silence warnings.
- [ ] **Docker Containerization:** Dockerize the backend and frontend. Adding `Dockerfile`s and a `docker-compose.yml` ensures that developers can easily run PostgreSQL, Redis, the Node Backend, and the Next.js Frontend with minimal friction, ensuring environment consistency.

## 3. Product Enhancements
- [ ] **Request Validation Middleware:** Enhance security and data integrity by implementing request validation schemas (such as Zod or Joi) in the backend. Currently, routes (e.g., `auth.controller.ts`) manually check if fields exist (`if (!email || !password)`). Implementing a validation middleware layer will ensure robust typing and constraint checking before requests reach controllers.
- [ ] **Automated Test Scripts:** The project lacks functioning test scripts (running `npm test` throws an error). It is highly recommended to set up Jest for the backend (for unit/integration testing the Express API and OCPP message handlers) and Playwright/Cypress/Jest for the Next.js frontend to ensure high reliability.
- [ ] **Exclude Sensitive Fields:** In `auth.controller.ts`, when authenticating or creating a user, the backend explicitly returns safe fields in some places (`getMe`), but returning users from API endpoints should automatically exclude the hashed password via Prisma select rules or a unified DTO mapping function to prevent accidental data leaks.
