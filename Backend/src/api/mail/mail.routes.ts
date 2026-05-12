import { Router } from "express";
import {
  getMailConfig,
  updateMailConfig,
  getMailTemplates,
  getMailTemplate,
  createMailTemplate,
  updateMailTemplate,
  deleteMailTemplate,
} from "./mail.controller.js";
import { requireAdmin } from "../../middleware/auth.js";

const router = Router();

// Require admin for mail configuration
router.use(requireAdmin);

// Mail Config routes
router.get("/config", getMailConfig);
router.put("/config", updateMailConfig);

// Mail Template routes
router.get("/templates", getMailTemplates);
router.get("/templates/:id", getMailTemplate);
router.post("/templates", createMailTemplate);
router.put("/templates/:id", updateMailTemplate);
router.delete("/templates/:id", deleteMailTemplate);

export default router;
