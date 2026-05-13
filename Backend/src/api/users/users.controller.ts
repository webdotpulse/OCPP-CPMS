import { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { logger } from "../../utils/logger.js";
import { parsePagination, parseId } from "../../utils/validation.js";
import { AuthRequest } from "../../middleware/auth.js";
import { sendEmail } from "../../utils/mailer.js";
import bcrypt from "bcrypt";

/**
 * GET /api/users - Get all users
 */
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { page: queryPage, limit: queryLimit, search } = req.query;
    const { page, limit } = parsePagination(queryPage as string, queryLimit as string);

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: "insensitive" } },
        { name: { contains: search as string, mode: "insensitive" } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take,
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          userType: true,
          companyName: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    logger.error(`Error getting users: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get users",
    });
  }
};

/**
 * GET /api/users/:id - Get specific user
 */
export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseId(req.params.id);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
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
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error(`Error getting user: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to get user",
    });
  }
};

/**
 * PUT /api/users/:id - Update user details
 */
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseId(req.params.id);
    const { name, email, role, userType, companyName, address, phone, taxNumber } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    if (role && (role !== "admin" && role !== "user")) {
        return res.status(400).json({
          success: false,
          error: "Valid role is required (admin or user)",
        });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        role,
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
    logger.error(`Error updating user: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to update user",
    });
  }
};

/**
 * PUT /api/users/:id/role - Update user role
 */
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseId(req.params.id);
    const { role } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID",
      });
    }

    if (!role || (role !== "admin" && role !== "user")) {
        return res.status(400).json({
          success: false,
          error: "Valid role is required (admin or user)",
        });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        userType: true,
        companyName: true,
      }
    });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    logger.error(`Error updating user role: ${error}`);
    res.status(500).json({
      success: false,
      error: "Failed to update user role",
    });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role, userType, companyName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        role: role || "user",
        userType: userType || "private",
        companyName: companyName || null
      },
      select: { id: true, name: true, email: true, role: true, userType: true, companyName: true }
    });

    try {
      const loginUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      await sendEmail(
        user.email,
        "Welcome to OCPP CMS",
        `Welcome ${name || "User"}! Your account has been created by an admin. You can log in at ${loginUrl} using your email and the password provided.`,
        `<p>Welcome ${name || "User"}!</p><p>Your account has been created by an admin.</p><p>You can log in at <a href="${loginUrl}">${loginUrl}</a> using your email and the password provided.</p>`,
        "admin_welcome",
        {
          userEmail: user.email,
          name: name || "User",
          password,
          loginUrl
        }
      );
    } catch (emailError) {
      logger.error(`Error sending welcome email to ${user.email}: ${emailError}`);
    }

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    logger.error(`Error creating user: ${error}`);
    res.status(500).json({ success: false, error: "Failed to create user" });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: "Invalid ID" });

    const user = await prisma.user.findUnique({ where: { id } });
    if (user?.role === 'admin' && user?.id === 1) {
      return res.status(400).json({ success: false, error: "Cannot delete root admin" });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    logger.error(`Error deleting user: ${error}`);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
};
