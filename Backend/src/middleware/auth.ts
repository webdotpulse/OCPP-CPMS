import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

/**
 * Middleware to verify JWT token
 */
export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access token required",
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: number;
      email: string;
      role: string;
    };

    req.userId = decoded.userId;
    req.userRole = decoded.role;

    // Enforce role-based access control for state-changing methods
    if (req.userRole !== "admin") {
      const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
      // Allow users to update their own profile and password
      const isAuthExempt = req.path.includes("/me") || req.path.includes("/password");

      if (isWriteMethod && !isAuthExempt) {
        return res.status(403).json({ success: false, error: "Admin access required for this action" });
      }
    }

    next();
  } catch (error) {
    logger.error(`JWT verification failed: ${error}`);
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
}

/**
 * Middleware to check if user is admin
 */
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  if (req.userRole !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Admin access required",
    });
  }
  next();
}

/**
 * Generate JWT token
 */
export function generateToken(userId: number, email: string, role: string): string {
  return jwt.sign(
    { userId, email, role },
    config.jwtSecret as jwt.Secret,
    { expiresIn: config.jwtExpiresIn as any }
  );
}
