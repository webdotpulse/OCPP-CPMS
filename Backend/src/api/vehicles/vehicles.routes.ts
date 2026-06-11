import { Router } from "express";
import * as vehiclesController from "./vehicles.controller.js";

const router = Router();

router.get("/", vehiclesController.getAll);
router.post("/", vehiclesController.create);
router.put("/:id", vehiclesController.update);
router.delete("/:id", vehiclesController.remove);

export default router;
