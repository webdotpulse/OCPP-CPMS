import { Router } from "express";
import { getAllUsers, getUserById, updateUser, updateUserRole, createUser, deleteUser } from "./users.controller.js";
import { authenticateToken, requireSuperAdmin } from "../../middleware/auth.js";

const router = Router();

// Base authentication required for all routes
router.use(authenticateToken as any);

router.get("/", requireSuperAdmin as any, getAllUsers as any);
router.get("/:id", getUserById as any); // BOLA enforced in controller
router.post("/", requireSuperAdmin as any, createUser as any);
router.put("/:id", updateUser as any); // BOLA enforced in controller
router.put("/:id/role", requireSuperAdmin as any, updateUserRole as any);
router.delete("/:id", deleteUser as any); // BOLA enforced in controller

export default router;
