import { config } from "../../config/index.js";
import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { redisClient } from "../../config/redis.js";

/**
 * GET /api/dashboard/overview - Get system overview metrics
 */
export const getOverview = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const cacheKey = `dashboard:kpis:${userId || "admin"}`;
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const isUser = userRole !== "admin" && userRole !== "superadmin";
    const chargerWhere = isUser ? { owner_id: userId } : {};
    const stationWhere = isUser ? { owner_id: userId } : {};

    const [
      totalStations,
      totalChargers,
      onlineChargers,
      offlineChargers,
      activeTransactions,
      activeRfidSessions,
      todayEnergy,
      todayRfidEnergy,
      totalEnergy,
      totalRfidSessions,
    ] = await Promise.all([
      prisma.chargingStation.count({ where: stationWhere }),
      prisma.charger.count({ where: chargerWhere }),
      prisma.charger.count({ where: { ...chargerWhere, status: "active" } }),
      prisma.charger.count({ where: { ...chargerWhere, status: "offline" } }),
      prisma.transaction.count({
        where: isUser ? { status: "charging", charger: { owner_id: userId } } : { status: "charging" },
      }),
      prisma.rfidSession.count({
        where: isUser ? { status: "charging", charger: { owner_id: userId } } : { status: "charging" },
      }),
      prisma.transaction.aggregate({
        where: isUser ? { createdAt: { gte: today }, charger: { owner_id: userId } } : { createdAt: { gte: today } },
        _sum: { energyConsumed: true },
      }),
      prisma.rfidSession.aggregate({
        where: isUser ? { createdAt: { gte: today }, charger: { owner_id: userId } } : { createdAt: { gte: today } },
        _sum: { energyConsumed: true },
      }),
      prisma.transaction.aggregate({
        where: isUser ? { charger: { owner_id: userId } } : undefined,
        _sum: { energyConsumed: true },
      }),
      prisma.rfidSession.count({
        where: isUser ? { charger: { owner_id: userId } } : undefined,
      }),
    ]);

    // Calculate connector status distribution
    const connectors = await prisma.connector.findMany({
      where: isUser ? { evse: { charger: { owner_id: userId } } } : undefined,
    });
    const connectorStatusDistribution: Record<string, number> = {};
    connectors.forEach((c: any) => {
      connectorStatusDistribution[c.status] = (connectorStatusDistribution[c.status] || 0) + 1;
    });

    const responseData = {
      success: true,
      data: {
        totalStations,
        totalChargers,
        onlineChargers,
        offlineChargers,
        activeSessions: activeTransactions,
        energyToday: (todayEnergy._sum.energyConsumed || 0),
        revenueToday: 0, // Placeholder for now, can be calculated later
        connectorDistribution: connectorStatusDistribution,
      },
    };

    await redisClient.setex(cacheKey, 30, JSON.stringify(responseData));

    res.json(responseData);
  } catch (error) {
    logger.error(`Error getting dashboard overview: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get dashboard overview",
    });
  }
};

/**
 * GET /api/dashboard/live-sessions - Get all currently active sessions
 */
export const getLiveSessions = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const isUser = userRole !== "admin" && userRole !== "superadmin";

    const [activeTransactions, activeRfidSessions] = await Promise.all([
      prisma.transaction.findMany({
        where: isUser ? { status: { in: ["initiated", "charging"] }, charger: { owner_id: userId } } : { status: { in: ["initiated", "charging"] } },
        include: {
          charger: {
            include: {
              chargingStation: true,
            },
          },
        },
        orderBy: { startTime: "desc" },
      }),
      prisma.rfidSession.findMany({
        where: isUser ? { status: "charging", charger: { owner_id: userId } } : { status: "charging" },
        include: {
          charger: {
            include: {
              chargingStation: true,
            },
          },
          rfidUser: true,
        },
        orderBy: { startTime: "desc" },
      }),
    ]);

    const allActiveSessions = [
      ...activeTransactions.map((t: any) => ({
        transactionId: t.transactionId,
        chargerId: t.charger_id,
        chargerName: t.charger.name,
        connectorName: t.connectorName,
        startTime: t.startTime,
        energyConsumed: t.energyConsumed,
        currentPower: t.currentPower,
        status: t.status,
        type: "basic",
        durationMinutes: Math.floor((Date.now() - t.startTime.getTime()) / 60000),
      })),
      ...activeRfidSessions.map((s: any) => ({
        transactionId: s.transactionId,
        chargerId: s.charger_id,
        chargerName: s.charger.name,
        connectorName: s.connectorName,
        startTime: s.startTime,
        energyConsumed: s.energyConsumed,
        currentPower: s.currentPower,
        status: s.status,
        type: "rfid",
        durationMinutes: Math.floor((Date.now() - s.startTime.getTime()) / 60000),
        userName: s.rfidUser.name,
        userTag: s.rfidUser.rfid_tag,
      })),
    ];

    // Deduplicate by transactionId
    const uniqueSessionsMap = new Map();
    for (const session of allActiveSessions) {
      if (uniqueSessionsMap.has(session.transactionId)) {
        // Prefer RFID session if it exists because it has more metadata
        if (session.type === "rfid") {
          uniqueSessionsMap.set(session.transactionId, session);
        }
      } else {
        uniqueSessionsMap.set(session.transactionId, session);
      }
    }

    const uniqueSessions = Array.from(uniqueSessionsMap.values());

    // Sort by start time (newest first)
    uniqueSessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    res.json({
      success: true,
      data: uniqueSessions,
      count: uniqueSessions.length,
    });
  } catch (error) {
    logger.error(`Error getting live sessions: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get live sessions",
    });
  }
};

/**
 * GET /api/dashboard/distribution - Get connector status distribution
 */
export const getDistribution = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const isUser = userRole !== "admin" && userRole !== "superadmin";

    const connectors = await prisma.connector.findMany({
      where: isUser ? { evse: { charger: { owner_id: userId } } } : undefined,
      include: { evse: { include: { charger: true } } },
    });

    const distribution = connectors.reduce(
      (acc: any, connector: any) => {
        const status = connector.status;
        if (!acc[status]) {
          acc[status] = { count: 0, connectors: [] as any[] };
        }
        acc[status].count++;
        acc[status].connectors.push(connector);
        return acc;
      },
      {} as Record<string, { count: number; connectors: any[] }>
    );

    res.json({
      success: true,
      data: {
        total: connectors.length,
        distribution,
      },
    });
  } catch (error) {
    logger.error(`Error getting distribution: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get connector distribution",
    });
  }
};

/**
 * GET /api/dashboard/load - Get load metrics for smart charging
 */
export const getLoadMetrics = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const isUser = userRole !== "admin" && userRole !== "superadmin";

    // 1. Fetch sites with maxPower
    const stations = await prisma.chargingStation.findMany({
      where: isUser ? { owner_id: userId, maxPower: { not: null } } : { maxPower: { not: null } },
      include: { chargers: true },
    });

    // 2. Fetch groups with maxPower (only admins can see charge groups currently or users assigned to them,
    // for simplicity we'll just show to admin or check relations if needed. Assuming group maxPower is globally visible for admin)
    const groups = await prisma.chargeGroup.findMany({
      where: { maxPower: { not: null } },
      include: { chargers: true },
    });

    const activeTransactions = await prisma.transaction.findMany({
      where: { status: { in: ["initiated", "charging"] } },
      include: { charger: true }
    });

    const siteLoads = stations.map((station: any) => {
      const activeTxs = activeTransactions.filter((tx: any) => tx.charger.charging_station_id === station.id);
      const currentLoad = activeTxs.reduce((sum: number, tx: any) => sum + (tx.currentPower ? tx.currentPower / 1000 : 0), 0);
      return {
        id: station.id,
        name: station.station_name,
        type: "station",
        maxPower: station.maxPower,
        currentLoad: currentLoad,
        activeChargers: activeTxs.length
      };
    });

    const groupLoads = groups.map((group: any) => {
      const activeTxs = activeTransactions.filter((tx: any) => tx.charger.chargeGroupId === group.id);
      const currentLoad = activeTxs.reduce((sum: number, tx: any) => sum + (tx.currentPower ? tx.currentPower / 1000 : 0), 0);
      return {
        id: group.id,
        name: group.name,
        type: "group",
        maxPower: group.maxPower,
        currentLoad: currentLoad,
        activeChargers: activeTxs.length
      };
    });

    res.json({
      success: true,
      data: [...siteLoads, ...groupLoads],
    });
  } catch (error) {
    logger.error(`Error getting load metrics: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get load metrics",
    });
  }
};

/**
 * GET /api/dashboard/chargers-status - Get all chargers with their status
 */
export const getChargersStatus = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const isUser = userRole !== "admin" && userRole !== "superadmin";

    const chargers = await prisma.charger.findMany({
      where: isUser ? { owner_id: userId } : undefined,
      include: {
        chargingStation: { select: { station_name: true, city: true } },
        evses: { include: { connectors: true } },
      },
      orderBy: { last_heartbeat: "desc" },
    });

    // Determine online status based on last heartbeat
    const now = Date.now();
    const offlineThreshold = config.offlineThreshold * 1000; // 60 seconds

    const chargersWithStatus = chargers.map((charger: any) => {
      const timeSinceHeartbeat = now - charger.last_heartbeat.getTime();
      const isOnline = timeSinceHeartbeat < offlineThreshold;

      return {
        ...charger,
        isOnline,
        timeSinceHeartbeatSeconds: Math.floor(timeSinceHeartbeat / 1000),
      };
    });

    res.json({
      success: true,
      data: chargersWithStatus,
      total: chargersWithStatus.length,
    });
  } catch (error) {
    logger.error(`Error getting chargers status: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get chargers status",
    });
  }
};

/**
 * GET /api/dashboard/ems-telemetry - Get current EMS telemetry for all linked gateways
 */
export const getEmsTelemetry = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const isUser = userRole !== "admin" && userRole !== "superadmin";

    // 1. Fetch relevant gateways for this user/admin
    const gateways = await prisma.emsGateway.findMany({
      where: isUser ? { client_id: userId } : undefined,
    });

    if (gateways.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // 2. Fetch live redis telemetry for each
    const telemetryData = [];
    for (const gw of gateways) {
      const redisKey = `ems_telemetry:${gw.gateway_id}`;
      const data = await redisClient.hgetall(redisKey);

      if (data && Object.keys(data).length > 0) {
        telemetryData.push({
          gateway_id: gw.gateway_id,
          solar_kw: parseFloat(data.solar_kw || '0'),
          battery_kw: parseFloat(data.battery_kw || '0'),
          grid_kw: parseFloat(data.grid_kw || '0'),
          house_kw: parseFloat(data.house_kw || '0'),
          timestamp: new Date(parseInt(data.timestamp || '0')),
        });
      }
    }

    res.json({
      success: true,
      data: telemetryData,
    });
  } catch (error) {
    logger.error(`Error getting EMS telemetry: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get EMS telemetry",
    });
  }
};

/**
 * GET /api/dashboard/fleet-capacity - Get available V2G discharge capacity
 */
export const getFleetCapacity = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const isUser = userRole !== "admin" && userRole !== "superadmin";

    const activeTransactions = await prisma.transaction.findMany({
      where: isUser ? { status: { in: ["initiated", "charging"] }, charger: { owner_id: userId } } : { status: { in: ["initiated", "charging"] } },
      include: {
        rfidUser: {
          include: { vehicleEnergyProfile: true }
        }
      }
    });

    let availableKwh = 0;
    let connectedVehicles = 0;

    for (const tx of activeTransactions) {
      const profile = tx.rfidUser?.vehicleEnergyProfile;
      if (!profile || profile.batteryCapacity == null) continue;

      const latestMeterValue = await prisma.meterValue.findFirst({
        where: { transactionId: tx.transactionId },
        orderBy: { timestamp: "desc" }
      });

      const currentSoc = latestMeterValue?.soc ?? tx.finalMeterValue ?? 100;
      const minSoc = profile.minSocThreshold;

      if (currentSoc > minSoc) {
        const excessSoc = currentSoc - minSoc;
        const availableEnergyForVehicle = (excessSoc / 100) * profile.batteryCapacity;
        availableKwh += availableEnergyForVehicle;
        connectedVehicles++;
      }
    }

    res.json({
      success: true,
      data: {
        availableKwh,
        connectedVehicles
      }
    });
  } catch (error) {
    logger.error(`Error getting fleet capacity: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get fleet capacity",
    });
  }
};

/**
 * GET /api/dashboard/ems-telemetry/history - Get historical EMS telemetry for linked gateways
 */
export const getHistoricalEmsTelemetry = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const isUser = userRole !== "admin" && userRole !== "superadmin";
    const hours = parseInt(req.query.hours as string) || 24;

    // 1. Fetch relevant gateways for this user/admin
    const gateways = await prisma.emsGateway.findMany({
      where: isUser ? { client_id: userId } : undefined,
      select: { gateway_id: true }
    });

    if (gateways.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const gatewayIds = gateways.map(g => g.gateway_id);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // 2. Fetch historical records from the database
    const history = await prisma.emsTelemetryRecord.findMany({
      where: {
        gateway_id: { in: gatewayIds },
        timestamp: { gte: since }
      },
      orderBy: { timestamp: 'asc' }
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error(`Error getting historical EMS telemetry: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get historical EMS telemetry",
    });
  }
};
