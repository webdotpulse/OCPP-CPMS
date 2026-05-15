import { prisma } from "../config/database.js";
import { redisClient } from "../config/redis.js";
import { randomBytes } from "crypto";

export class EmsGatewayService {
  static async createGateway(clientId: number) {
    const token = randomBytes(32).toString("hex");

    const gateway = await prisma.emsGateway.create({
      data: {
        client_id: clientId,
        auth_token: token,
      },
    });

    return gateway;
  }

  static async getGateways(clientId: number, userRole: string) {
    if (userRole === "admin") {
      return prisma.emsGateway.findMany({
        include: { client: { select: { name: true, email: true } } },
      });
    }

    return prisma.emsGateway.findMany({
      where: { client_id: clientId },
    });
  }

  static async validateGatewayToken(authToken: string) {
    const gateway = await prisma.emsGateway.findUnique({
      where: { auth_token: authToken },
    });

    if (!gateway) {
      throw new Error("Unauthorized: Invalid EMS gateway token.");
    }

    return gateway;
  }

  static async processTelemetry(authToken: string, telemetryData: { solar_kw: number; battery_kw: number; grid_kw: number; house_kw: number }) {
    // 1. Authenticate gateway
    const gateway = await EmsGatewayService.validateGatewayToken(authToken);

    // 2. Update heartbeat and status in DB (async, non-blocking for performance ideally, but await here for simplicity)
    await prisma.emsGateway.update({
      where: { id: gateway.id },
      data: {
        last_heartbeat: new Date(),
        status: "online",
      },
    });

    // 3. Cache telemetry in Redis for dashboard consumption
    const redisKey = `ems_telemetry:${gateway.gateway_id}`;

    // Store as hash with expiration (e.g. 5 minutes) so stale data drops
    await redisClient.hset(redisKey, {
      solar_kw: telemetryData.solar_kw.toString(),
      battery_kw: telemetryData.battery_kw.toString(),
      grid_kw: telemetryData.grid_kw.toString(),
      house_kw: telemetryData.house_kw.toString(),
      timestamp: Date.now().toString(),
    });

    await redisClient.expire(redisKey, 300); // 5 minutes TTL

    return { success: true, gateway_id: gateway.gateway_id };
  }
}
