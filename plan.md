1. **Fix Mass Assignment (F-01):**
   - Handled in `Backend/src/api/auth/auth.controller.ts`. Added payload destructuring for `email, password, name` and dropped `role`, `isAdmin`, `userType`, ensuring server-side `role: "user"`.

2. **Require Email Verification:**
   - Modified `Backend/prisma/schema.prisma` to include an `emailVerified Boolean @default(false)` field in the `User` model.
   - Run `npx prisma generate` in Backend.
   - Updated login flow in `Backend/src/api/auth/auth.controller.ts` to block users returning a 403 status code if `user.emailVerified` is false.

3. **Prevent Hash Leaking (F-04):**
   - Created `Backend/src/utils/user.dto.ts` with `sanitizeUser` and `excludeUserFields` helpers.
   - Applied `sanitizeUser` recursively across relevant controllers containing `prisma.user`:
     - `Backend/src/api/auth/auth.controller.ts`
     - `Backend/src/api/users/users.controller.ts`
     - `Backend/src/api/stations/stations.controller.ts`
     - `Backend/src/api/chargers/chargers.controller.ts`
     - `Backend/src/api/rfid/rfid.controller.ts`
     - (And any other models where we `.include({ owner: true })`)

4. **Testing and Pre-commit:**
   - Run unit tests and type checks in the backend to make sure everything compiles.
   - Request pre-commit steps and follow them to ensure proper testing, verification, review, and reflection are done.
