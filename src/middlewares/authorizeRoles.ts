// src/middlewares/authorizeRoles.ts
import { User } from "../user/models/user.model";
import { Request, Response, NextFunction } from "express";

export function authorizeRoles(...roles: Array<"admin" | "user">) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res
          .status(401)
          .json({ message: "Unauthorized (authorizeRoles-noUserId)" });
      }

      const user = await User.findById(req.userId).select("role");
      if (!user) {
        return res
          .status(401)
          .json({ message: "Unauthorized (authorizeRoles-noUserInDB)" });
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
        .json({ message: "Authorization check failed (authorizeRoles)" });
    }
  };
}
