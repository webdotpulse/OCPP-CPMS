import { Server as SocketIOServer } from "socket.io";
import * as http from "http";
import { redisSubscriber } from "../config/redis.js";
import { logger } from "../utils/logger.js";

let io: SocketIOServer | null = null;

export function setupRealtimeSocket(server: http.Server): void {
  io = new SocketIOServer(server, {
    path: "/api/realtime",
    cors: {
      origin: "*", // Or specific origins
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    logger.info(`Realtime client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      logger.info(`Realtime client disconnected: ${socket.id}`);
    });
  });

  // Setup Redis Subscription for charger status updates
  redisSubscriber.subscribe("charger_status_updates", (err) => {
    if (err) {
      logger.error(`Failed to subscribe to charger_status_updates: ${err}`);
    } else {
      logger.info("Subscribed to charger_status_updates Redis channel");
    }
  });

  redisSubscriber.on("message", (channel, message) => {
    if (channel === "charger_status_updates" && io) {
      try {
        const payload = JSON.parse(message);
        // Broadcast the update to all connected clients
        io.emit("CHARGER_STATUS_UPDATE", payload);
      } catch (error) {
        logger.error(`Error processing charger_status_updates message: ${error}`);
      }
    }
  });

  logger.info("Socket.IO realtime server attached to HTTP server at /api/realtime");
}

export function getIO(): SocketIOServer | null {
  return io;
}
