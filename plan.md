1. **Database Schema updates**
   - No Prisma schema changes are required because the `VehicleContractCertificate` model and relevant relations are already present in the schema.
2. **Backend API (Node.js)**
   - I have created `Backend/src/api/vehicles/vehicles.routes.ts` and `Backend/src/api/vehicles/vehicles.controller.ts` to provide CRUD endpoints for `VehicleContractCertificate`. I also registered the router in `Backend/src/app.ts`.
   - Update `Backend/src/ocpp/handlers/v16Handlers.ts`'s `handleDataTransfer` logic to properly handle `Get15118EVCertificate`. It should extract `emaid` from `data` payload if present, query the `VehicleContractCertificate` database, and return a mock `contractCert` or error if expired.
   - Wait, `Authorize` already correctly checks `VehicleContractCertificate` for EMAID validity. However, `v21Handlers.ts` `handleAuthorize` does NOT currently check EMAID. I should update `handleAuthorize` in `v21Handlers.ts` to check `VehicleContractCertificate` in exactly the same way `v16Handlers.ts` does.
3. **Frontend Dashboard (Next.js)**
   - I have created `Frontend/app/vehicle-identity-management/page.tsx` with a full UI using Shadcn components (table, form in a dialog) and linked it in `Frontend/components/layout/Sidebar.tsx`.
   - Ensure the new page renders correctly and API requests work.
4. **Pre-commit checks**
   - Run `pre_commit_instructions` tool to verify I have done the necessary checks.
