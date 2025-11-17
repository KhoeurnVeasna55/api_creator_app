// src/middlewares/auth.ts
import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { User } from "../user/models/user.model";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface DecodedToken {
  id: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const authenticate: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = req.get("authorization");
    console.log("🔐 AUTH HEADER:", auth);

    const match = auth?.match(/^Bearer\s+(.+)$/i);
    const token = match ? match[1] : undefined;

    if (!token) {
      console.log("❌ No token provided");
      res.status(401).json({ message: "Unauthorized (authorizeRoles-auth)" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    console.log("✅ Token decoded:", decoded);

    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      console.log("❌ Token expired (manual check)");
      res.status(401).json({ message: "Token expired (auth)" });
      return;
    }

    req.userId = decoded.id;
    console.log("✅ authenticate OK, userId =", req.userId);
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      console.log("❌ Token expired (catch)");
      res.status(401).json({ message: "Token expired (auth-catch)" });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      console.log("❌ Invalid token");
      res.status(401).json({ message: "Invalid token (auth)" });
      return;
    }
    console.error("Authentication error:", err);
    res.status(500).json({ message: "Authentication failed (auth)" });
  }
};

/**
 * Optional authentication: if token exists, validate and attach userId.
 * If no token, just continue without error.
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const header = req.header("Authorization");
    const token =
      typeof header === "string"
        ? header.replace(/^Bearer\s+/i, "")
        : undefined;

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        console.warn("Optional auth: token expired");
      } else {
        req.userId = decoded.id;
      }
    }

    next();
  } catch (err) {
    console.warn("Optional auth failed:", err);
    next();
  }
};

export function authorizeRoles(...roles: Array<"admin" | "user">) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await User.findById(req.userId).select("role");
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!roles.includes(user.role as any)) {
        return res
          .status(403)
          .json({ message: "Forbidden: insufficient role" });
      }

      return next();
    } catch (err) {
      console.error("authorizeRoles error:", err);
      return res
        .status(500)
        .json({ message: "Authorization check failed" });
    }
  };
}
