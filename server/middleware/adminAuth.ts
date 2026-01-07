import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../utils/supabaseAdmin";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Middleware to verify the user is authenticated
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "No authentication token provided",
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email!,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: "Authentication check failed",
    });
  }
}

/**
 * Middleware to verify the user is an admin
 * Must be used after requireAuth
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    // Check if user is in admin_users table
    const { data: adminUser, error } = await supabaseAdmin
      .from("admin_users")
      .select("email, role")
      .eq("email", req.user.email)
      .maybeSingle();

    if (error) {
      console.error("Admin check error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to verify admin status",
      });
    }

    if (!adminUser) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Admin access required",
      });
    }

    next();
  } catch (err) {
    console.error("Admin middleware error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: "Admin verification failed",
    });
  }
}
