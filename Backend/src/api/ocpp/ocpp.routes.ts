import { Router } from "express";
import {
  getConnectedChargers,
  remoteStart,
  remoteStop,
  getChargerConfiguration,
  setChargerConfiguration,
  resetChargerController,
  unlockConnectorController,
  triggerMessageController,
  setChargingProfileController,
  clearChargingProfileController,
} from "./ocpp.controller.js";

const router = Router();

router.get("/connected", getConnectedChargers);
router.post("/remote-start", remoteStart);
router.post("/remote-stop", remoteStop);
router.post("/get-configuration", getChargerConfiguration);
router.post("/set-configuration", setChargerConfiguration);
router.post("/reset", resetChargerController);
router.post("/unlock", unlockConnectorController);
router.post("/trigger-message", triggerMessageController);
router.post("/set-charging-profile", setChargingProfileController);
router.post("/clear-charging-profile", clearChargingProfileController);

export default router;
