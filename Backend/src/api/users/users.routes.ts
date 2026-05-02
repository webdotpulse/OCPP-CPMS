import { Router } from "express";
import { getAllUsers, getUserById, updateUser, updateUserRole, createUser, deleteUser } from "./users.controller.js";
import { requireAdmin } from "../../middleware/auth.js";

const router = Router();

// Only admins can access these routes
router.use(requireAdmin as any);

router.get("/", getAllUsers as any);
router.get("/:id", getUserById as any);
router.post("/", createUser as any);
router.put("/:id", updateUser as any);
router.put("/:id/role", updateUserRole as any);
router.delete("/:id", deleteUser as any);

export default router;
