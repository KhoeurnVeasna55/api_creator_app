"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.authenticate = void 0;
exports.authorizeRoles = authorizeRoles;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = require("../user/models/user.model");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const authenticate = async (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        console.log("✅ Token decoded:", decoded);
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            console.log("❌ Token expired (manual check)");
            res.status(401).json({ message: "Token expired (auth)" });
            return;
        }
        req.userId = decoded.id;
        console.log("✅ authenticate OK, userId =", req.userId);
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            console.log("❌ Token expired (catch)");
            res.status(401).json({ message: "Token expired (auth-catch)" });
            return;
        }
        if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            console.log("❌ Invalid token");
            res.status(401).json({ message: "Invalid token (auth)" });
            return;
        }
        console.error("Authentication error:", err);
        res.status(500).json({ message: "Authentication failed (auth)" });
    }
};
exports.authenticate = authenticate;
/**
 * Optional authentication: if token exists, validate and attach userId.
 * If no token, just continue without error.
 */
const optionalAuthenticate = async (req, _res, next) => {
    try {
        const header = req.header("Authorization");
        const token = typeof header === "string"
            ? header.replace(/^Bearer\s+/i, "")
            : undefined;
        if (token) {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            if (decoded.exp && Date.now() >= decoded.exp * 1000) {
                console.warn("Optional auth: token expired");
            }
            else {
                req.userId = decoded.id;
            }
        }
        next();
    }
    catch (err) {
        console.warn("Optional auth failed:", err);
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
function authorizeRoles(...roles) {
    return async (req, res, next) => {
        try {
            if (!req.userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const user = await user_model_1.User.findById(req.userId).select("role");
            if (!user) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            if (!roles.includes(user.role)) {
                return res
                    .status(403)
                    .json({ message: "Forbidden: insufficient role" });
            }
            return next();
        }
        catch (err) {
            console.error("authorizeRoles error:", err);
            return res
                .status(500)
                .json({ message: "Authorization check failed" });
        }
    };
}
