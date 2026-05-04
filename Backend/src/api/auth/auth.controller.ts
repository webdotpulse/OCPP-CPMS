import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import bcrypt from "bcrypt";
import { generateToken, AuthRequest } from "../../middleware/auth.js";
import { logger } from "../../utils/logger.js";

/**
 * POST /api/auth/register - Register new user
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role = "user" } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });

    logger.info(`New user registered: ${email}`);
    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error(`Error registering user: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to register user",
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        companyName: true,
        address: true,
        phone: true,
        taxNumber: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error(`Error getting profile: ${error}`);
    res.status(500).json({ success: false, error: "Failed to get profile" });
  }
};

/**
 * PUT /api/auth/me - Update user profile
 */
export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { name, email, userType, companyName, address, phone, taxNumber } = req.body;

    // Check if email is being changed and if it's already in use
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ success: false, error: "Email already in use" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        userType,
        companyName,
        address,
        phone,
        taxNumber
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        companyName: true,
        address: true,
        phone: true,
        taxNumber: true,
      }
    });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    logger.error(`Error updating profile: ${error}`);
    res.status(500).json({ success: false, error: "Failed to update profile" });
  }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, error: "Invalid current password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    logger.error(`Error updating password: ${error}`);
    res.status(500).json({ success: false, error: "Failed to update password" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.role);

    logger.info(`User logged in: ${email}`);
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    logger.error(`Error logging in: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to login",
    });
  }
};

/**
 * POST /api/auth/refresh - Get user info from token
 */
export const refresh = async (req: Request, res: Response) => {
  try {
    const authRequest = req as AuthRequest;

    if (!authRequest.userId) {
      return res.status(401).json({
        success: false,
        error: "No valid token provided",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: authRequest.userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error(`Error refreshing user info: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to refresh user info",
    });
  }
};
