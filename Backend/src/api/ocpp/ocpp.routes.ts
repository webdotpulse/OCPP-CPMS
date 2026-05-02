import { Router } from "express";
import {
  getConnectedChargers,
  remoteStart,
  remoteStop,
  getChargerConfiguration,
  deleteChargerConfigurations,
  setChargerConfiguration,
  resetChargerController,
  unlockConnectorController,
  triggerMessageController,
  setChargingProfileController,
  clearChargingProfileController,
  testAuth,
  updateFirmwareController,
} from "./ocpp.controller.js";

const router = Router();

router.get("/connected", getConnectedChargers);
router.post("/remote-start", remoteStart);
router.post("/remote-stop", remoteStop);
router.post("/get-configuration", getChargerConfiguration);
router.delete("/configuration/:chargerId", deleteChargerConfigurations);
router.post("/set-configuration", setChargerConfiguration);
router.post("/reset", resetChargerController);
router.post("/unlock", unlockConnectorController);
router.post("/trigger-message", triggerMessageController);
router.post("/update-firmware", updateFirmwareController);
router.post("/set-charging-profile", setChargingProfileController);
router.post("/clear-charging-profile", clearChargingProfileController);
router.post("/test-auth", testAuth);

export default router;
