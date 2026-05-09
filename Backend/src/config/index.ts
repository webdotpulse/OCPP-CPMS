import { v4 as uuidv4 } from 'uuid';
import "dotenv/config";

export const config = {
  // Instance ID for horizontal scaling
  instanceId: process.env.INSTANCE_ID || uuidv4(),

  // Server Configuration
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // OCPP Configuration
  ocppPort: parseInt(process.env.OCPP_PORT || "9220", 10),
  heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL_SECONDS || "300", 10),
  offlineThreshold: parseInt(process.env.OFFLINE_THRESHOLD_SECONDS || "60", 10),
  websocketPingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL_SECONDS || "60", 10),
  ocppProtocolVersion: "1.6",

  // OCPP Logs WebSocket
  ocppLogsPort: parseInt(process.env.OCPP_LOG_WS_PORT || "3001", 10),

  // JWT Authentication
  jwtSecret: process.env.JWT_SECRET || "your-jwt-secret-key-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",

  // Redis
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
};

export const logLevels = ["error", "warn", "info", "debug"] as const;
