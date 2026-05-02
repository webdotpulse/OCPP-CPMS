import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";

/**
 * GET /api/dashboard/overview - Get system overview metrics
 */
export const getOverview = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const isUser = userRole !== "admin";
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
      where: isUser ? { charger: { owner_id: userId } } : undefined,
    });
    const connectorStatusDistribution: Record<string, number> = {};
    connectors.forEach((c: any) => {
      connectorStatusDistribution[c.status] = (connectorStatusDistribution[c.status] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalStations,
        totalChargers,
        onlineChargers,
        offlineChargers,
        activeSessions: activeTransactions + activeRfidSessions,
        energyToday: (todayEnergy._sum.energyConsumed || 0) + (todayRfidEnergy._sum.energyConsumed || 0),
        revenueToday: 0, // Placeholder for now, can be calculated later
        connectorDistribution: connectorStatusDistribution,
      },
    });
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

    const isUser = userRole !== "admin";

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
        transactionId: t.id,
        chargerName: t.charger.name,
        connectorName: t.connectorName,
        startTime: t.startTime,
        energyConsumed: t.energyConsumed,
        status: t.status,
        type: "basic",
        durationMinutes: Math.floor((Date.now() - t.startTime.getTime()) / 60000),
      })),
      ...activeRfidSessions.map((s: any) => ({
        transactionId: s.id,
        chargerName: s.charger.name,
        connectorName: s.connectorName,
        startTime: s.startTime,
        energyConsumed: s.energyConsumed,
        status: s.status,
        type: "rfid",
        durationMinutes: Math.floor((Date.now() - s.startTime.getTime()) / 60000),
        userName: s.rfidUser.name,
        userTag: s.rfidUser.rfid_tag,
      })),
    ];

    // Sort by start time (newest first)
    allActiveSessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    res.json({
      success: true,
      data: allActiveSessions,
      count: allActiveSessions.length,
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

    const isUser = userRole !== "admin";

    const connectors = await prisma.connector.findMany({
      where: isUser ? { charger: { owner_id: userId } } : undefined,
      include: { charger: true },
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
 * GET /api/dashboard/chargers-status - Get all chargers with their status
 */
export const getChargersStatus = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error userRole is attached by authenticateToken middleware
    const userRole = req.userRole;
    // @ts-expect-error userId is attached by authenticateToken middleware
    const userId = req.userId;

    const isUser = userRole !== "admin";

    const chargers = await prisma.charger.findMany({
      where: isUser ? { owner_id: userId } : undefined,
      include: {
        chargingStation: { select: { station_name: true, city: true } },
        connectors: true,
      },
      orderBy: { last_heartbeat: "desc" },
    });

    // Determine online status based on last heartbeat
    const now = Date.now();
    const offlineThreshold = 60 * 1000; // 60 seconds

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
