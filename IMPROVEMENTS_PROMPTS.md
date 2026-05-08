# OCPP Charge Management System - Improvements & Prompts

Based on an analysis of the codebase, here is an overview of performance issues, structural problems, and necessary improvements categorized into actionable prompts. You can feed these prompts directly into an LLM or an AI coding assistant to resolve them.

## 1. Things to be Fixed (Bugs & Linting)

### Missing Database Indexes
**Status:** ✅ Completed

### Error Handling in Background Workers
**Status:** ✅ Completed
**Problem:** `MeterValueService.ts` catches errors during Redis stream processing but doesn't implement a robust retry mechanism or a dead-letter queue (DLQ) for payloads that repeatedly fail Prisma insertion.
**Prompt:**
> "Please improve the error handling in `Backend/src/services/MeterValueService.ts`. Add a retry mechanism or a dead-letter queue (DLQ) fallback for Redis stream entries that fail to insert into the Prisma database during the batch processing loop."

---

## 2. Improvements (Performance & Architecture)

### LoadManagementService Scalability
**Problem:** `LoadManagementService.ts` fetches *all* active transactions into memory using `findMany` across a whole station or charge group to calculate active loads. This won't scale well with hundreds of chargers per station.
**Prompt:**
> "Please optimize `Backend/src/services/LoadManagementService.ts`. Instead of fetching all transaction records into memory using `prisma.transaction.findMany` to sum capacities, use Prisma's `aggregate` function (`_sum`) to calculate the total requested load (`power_capacity` or `current`) at the database level."

### MeterValue Service Stream Trimming
**Problem:** `MeterValueService.ts` acknowledges messages via `XACK` but never trims the stream using `XTRIM` or `XADD ... MAXLEN`. Over time, the `meter_values_stream` in Redis will consume unbound memory.
**Prompt:**
> "Please update `Backend/src/services/MeterValueService.ts` to limit the size of the Redis stream. Modify the `addMeterValue` function to include a `MAXLEN` argument (e.g., `~ 100000`) when calling `XADD`, or periodically trim the stream to prevent memory leaks."

### Missing Automated Test Suite Setup
**Problem:** The project lacks configured unit or integration tests (running `npm test` fails).
**Prompt:**
> "Please set up a basic testing framework for the Backend. Install `jest` and `ts-jest` or `vitest`, configure it to work with TypeScript, and write a basic suite of unit tests for the utility functions and `LoadManagementService` logic."

---

## 3. New Additions (Features & Tooling)

### Docker Compose Environment
**Problem:** The application requires local setup of Postgres, Redis, and Node environments. A unified Docker Compose setup is missing for easy local development.
**Prompt:**
> "Please create a `docker-compose.yml` in the root directory that defines services for PostgreSQL 15, Redis, the Next.js Frontend, and the Express Backend. Create corresponding `Dockerfile`s for the Backend and Frontend to containerize the application for easier local development."

### Stripe Billing Integration
**Problem:** The database has a `PaymentTransaction` placeholder model, but the actual Stripe/Mollie integration for automated billing of RFID postpaid sessions is missing.
**Prompt:**
> "Please implement a Stripe payment integration in the Backend. Create a service to calculate session costs based on the associated `Tariff`, create a Stripe PaymentIntent, and expose REST endpoints to initiate and verify payments for completed `Transaction` records."

### OCPI Roaming Implementation
**Problem:** The database has `OcpiEndpoint` models, but the backend lacks the actual OCPI 2.2.1 protocol implementation (e.g., pushing locations, tariffs, and receiving CDRs).
**Prompt:**
> "Please implement an OCPI (Open Charge Point Interface) module in the Backend. Implement the standard OCPI 2.2.1 Locations and Tariffs modules to share station data with external eMSPs, using the existing `OcpiEndpoint` configurations."
