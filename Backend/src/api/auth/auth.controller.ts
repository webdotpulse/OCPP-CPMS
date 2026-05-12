import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import bcrypt from "bcrypt";
import { generateToken, AuthRequest } from "../../middleware/auth.js";
import { logger } from "../../utils/logger.js";
import { sendEmail } from "../../utils/mailer.js";
import crypto from "crypto";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

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

    // Send confirmation email
    try {
      await sendEmail(
        user.email,
        "Welcome to OCPP CMS",
        "Your account has been successfully registered.",
        "<p>Your account has been successfully registered.</p>",
        "registration",
        { userEmail: user.email }
      );
    } catch (emailError) {
      logger.error(`Error sending registration email to ${user.email}: ${emailError}`);
      // Proceed even if email fails
    }

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

    // Handle 2FA
    if (user.twoFactorEnabled) {
      if (user.twoFactorMethod === "email") {
        const twoFactorCode = crypto.randomInt(100000, 1000000).toString();
        const twoFactorCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorCode,
            twoFactorCodeExpiry,
          },
        });

        try {
          await sendEmail(
            user.email,
            "Your 2FA Login Code",
            `Your two-factor authentication code is: ${twoFactorCode}`,
            `<p>Your two-factor authentication code is: <strong>${twoFactorCode}</strong></p><p>This code will expire in 10 minutes.</p>`,
            "2fa_login",
            { twoFactorCode }
          );
        } catch (emailError) {
          logger.error(`Error sending 2FA email to ${user.email}: ${emailError}`);
          return res.status(500).json({ success: false, error: "Failed to send 2FA email" });
        }
      }

      // Generate partial JWT token
      const partialToken = generateToken(user.id, user.email, "partial_auth");

      return res.json({
        success: true,
        data: {
          requires2FA: true,
          method: user.twoFactorMethod,
          partialToken,
        },
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
 * POST /api/auth/verify-2fa-login - Verify 2FA code during login
 */
import jwt from "jsonwebtoken";
import { config } from "../../config/index.js";

export const verify2FALogin = async (req: Request, res: Response) => {
  try {
    const { partialToken, code } = req.body;

    if (!partialToken || !code) {
      return res.status(400).json({ success: false, error: "Partial token and code are required" });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(partialToken, config.jwtSecret);
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid or expired partial token" });
    }

    if (decoded.role !== "partial_auth") {
      return res.status(401).json({ success: false, error: "Invalid token type" });
    }

    const userId = decoded.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ success: false, error: "Invalid user or 2FA not enabled" });
    }

    let isValid = false;

    if (user.twoFactorMethod === "authenticator" && user.twoFactorSecret) {
      isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: code,
        window: 1, // Allow 1 step (30 seconds) before or after
      });
    } else if (user.twoFactorMethod === "email") {
      if (user.twoFactorCode === code && user.twoFactorCodeExpiry && user.twoFactorCodeExpiry > new Date()) {
        isValid = true;
        // Clear the code after successful use
        await prisma.user.update({
          where: { id: userId },
          data: { twoFactorCode: null, twoFactorCodeExpiry: null },
        });
      }
    }

    if (!isValid) {
      return res.status(401).json({ success: false, error: "Invalid or expired 2FA code" });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.role);

    logger.info(`User logged in via 2FA: ${user.email}`);
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
    logger.error(`Error verifying 2FA login: ${error}`);
    res.status(500).json({ success: false, error: "Failed to verify 2FA code" });
  }
};

/**
 * GET /api/auth/2fa/generate - Generate a 2FA secret and QR code
 */
export const generate2FASecret = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const secret = speakeasy.generateSecret({
      name: `OCPP CMS (${user.email})`,
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || "");

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCodeUrl,
      },
    });
  } catch (error) {
    logger.error(`Error generating 2FA secret: ${error}`);
    res.status(500).json({ success: false, error: "Failed to generate 2FA secret" });
  }
};

/**
 * POST /api/auth/2fa/enable - Enable 2FA for the user
 */
export const enable2FA = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { method, secret, code } = req.body;

    if (!method || !code) {
      return res.status(400).json({ success: false, error: "Method and code are required" });
    }

    if (method !== "authenticator" && method !== "email") {
      return res.status(400).json({ success: false, error: "Invalid 2FA method" });
    }

    if (method === "authenticator" && !secret) {
      return res.status(400).json({ success: false, error: "Secret is required for authenticator method" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    let isValid = false;

    if (method === "authenticator") {
      isValid = speakeasy.totp.verify({
        secret: secret,
        encoding: "base32",
        token: code,
        window: 1,
      });
    } else if (method === "email") {
      if (user.twoFactorCode === code && user.twoFactorCodeExpiry && user.twoFactorCodeExpiry > new Date()) {
        isValid = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({ success: false, error: "Invalid 2FA code" });
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: method,
        twoFactorSecret: method === "authenticator" ? secret : null,
        twoFactorCode: null,
        twoFactorCodeExpiry: null,
      },
    });

    res.json({ success: true, message: "2FA successfully enabled" });
  } catch (error) {
    logger.error(`Error enabling 2FA: ${error}`);
    res.status(500).json({ success: false, error: "Failed to enable 2FA" });
  }
};

/**
 * POST /api/auth/2fa/disable - Disable 2FA for the user
 */
export const disable2FA = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorMethod: null,
        twoFactorSecret: null,
        twoFactorCode: null,
        twoFactorCodeExpiry: null,
      },
    });

    res.json({ success: true, message: "2FA successfully disabled" });
  } catch (error) {
    logger.error(`Error disabling 2FA: ${error}`);
    res.status(500).json({ success: false, error: "Failed to disable 2FA" });
  }
};

/**
 * POST /api/auth/2fa/send-email-code - Send 2FA setup code via email
 */
export const send2FAEmailCode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const twoFactorCode = crypto.randomInt(100000, 1000000).toString();
    const twoFactorCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorCode,
        twoFactorCodeExpiry,
      },
    });

    try {
      await sendEmail(
        user.email,
        "Your 2FA Setup Code",
        `Your two-factor authentication setup code is: ${twoFactorCode}`,
        `<p>Your two-factor authentication setup code is: <strong>${twoFactorCode}</strong></p><p>This code will expire in 10 minutes.</p>`,
        "2fa_setup",
        { twoFactorCode }
      );
    } catch (emailError) {
      logger.error(`Error sending 2FA setup email to ${user.email}: ${emailError}`);
      return res.status(500).json({ success: false, error: "Failed to send 2FA setup email" });
    }

    res.json({ success: true, message: "2FA setup code sent to email" });
  } catch (error) {
    logger.error(`Error sending 2FA email code: ${error}`);
    res.status(500).json({ success: false, error: "Failed to process 2FA email code request" });
  }
};

/**
 * POST /api/auth/forgot-password - Send password reset link
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal that the user doesn't exist, just send a success response
      return res.json({ success: true, message: "If your email is registered, a password reset link has been sent." });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

    try {
      await sendEmail(
        user.email,
        "Password Reset Request",
        `You requested a password reset. Click this link to reset your password: ${resetUrl}`,
        `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>If you did not request this, please ignore this email.</p>`,
        "password_reset",
        { resetUrl }
      );
    } catch (emailError) {
      logger.error(`Error sending password reset email to ${user.email}: ${emailError}`);
      return res.status(500).json({ success: false, error: "Failed to send reset email" });
    }

    res.json({ success: true, message: "If your email is registered, a password reset link has been sent." });
  } catch (error) {
    logger.error(`Error in forgot password: ${error}`);
    res.status(500).json({ success: false, error: "Failed to process forgot password request" });
  }
};

/**
 * POST /api/auth/reset-password - Reset password using token
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: "Token and new password are required" });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, error: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    logger.error(`Error in reset password: ${error}`);
    res.status(500).json({ success: false, error: "Failed to reset password" });
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
