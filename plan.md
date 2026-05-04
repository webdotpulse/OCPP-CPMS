1. **Backend Database Models**:
   - Add a `OicpEndpoint` model to `Backend/prisma/schema.prisma` alongside the existing `OcpiEndpoint` model.
   - Run `npx prisma format` and `npx prisma db push` to apply the changes to the database.

2. **Backend API**:
   - Update `Backend/src/api/ocpi/ocpi.routes.ts` and `Backend/src/api/ocpi/ocpi.controller.ts` to manage OCPI credentials (GET, POST, PUT, DELETE for `OcpiEndpoint`).
   - Update `Backend/src/api/oicp/oicp.routes.ts` and `Backend/src/api/oicp/oicp.controller.ts` to manage OICP credentials (GET, POST, PUT, DELETE for `OicpEndpoint`).
   - Register the new `oicp` routes in `Backend/src/app.ts`.

3. **Frontend Admin Configuration Page**:
   - Add a new route in the sidebar `Frontend/components/layout/Sidebar.tsx` pointing to `/roaming` or `/settings/roaming` (icon: Globe/Network). Let's use `/roaming` since settings is generic. Actually, the prompt says "Create a dedicated, secure configuration page in the admin dashboard." Let's create `Frontend/app/roaming/page.tsx`.
   - In `Frontend/app/roaming/page.tsx`, create tabs or sections for OCPI and OICP.
   - Create forms to add/edit/delete/test endpoints for both OCPI and OICP.
   - Restrict this page to admins using `adminOnly: true` in the sidebar and checking the user role in the component.

4. **Pre-commit Steps**:
   - Ensure proper testing, verification, review, and reflection are done by calling the pre commit instructions tool.
