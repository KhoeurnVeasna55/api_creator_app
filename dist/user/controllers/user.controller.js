"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_model_1 = require("../models/user.model");
const mongoose_1 = require("mongoose");
class UserController {
    constructor() { }
    /**
     * GET /api/users/me
     * Returns current user's profile (safe fields only)
     */
    async getProfile(req, res) {
        try {
            const userId = req.userId;
            const user = await user_model_1.User.findById(userId).select("-password -otp -otpExpiry");
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            return res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                isVerified: user.isVerified,
                role: user.role,
                googleId: !!user.googleId,
                facebookId: !!user.facebookId,
                addresses: (user.addresses || []).map((a) => ({
                    _id: String(a._id),
                    fullName: a.fullName,
                    phone: a.phone,
                    line1: a.line1,
                    line2: a.line2,
                    city: a.city,
                    state: a.state,
                    postalCode: a.postalCode,
                    country: a.country,
                    isDefault: a.isDefault,
                })),
            });
        }
        catch (err) {
            console.error("getProfile error:", err);
            return res.status(500).json({ message: "Failed to fetch profile" });
        }
    }
    ;
    /**
     * DELETE /api/users/me
     * Deletes current user's account.
     * - If password account, require currentPassword.
     * - If social-only account, require confirm=true.
     */
    async deleteAccount(req, res) {
        try {
            const userId = req.userId;
            const { currentPassword, confirm } = req.body;
            const user = await user_model_1.User.findById(userId).select("+password");
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            const hasPassword = !!user.password;
            if (hasPassword) {
                if (!currentPassword) {
                    return res
                        .status(400)
                        .json({ message: "currentPassword is required to delete account" });
                }
                const ok = await user.comparePassword(currentPassword);
                if (!ok) {
                    return res.status(401).json({ message: "Invalid current password" });
                }
            }
            else {
                if (!confirm) {
                    return res.status(400).json({
                        message: "Set confirm=true in the request body to delete a social-login account",
                    });
                }
            }
            await user_model_1.User.deleteOne({ _id: user._id });
            return res.json({ message: "Account deleted successfully" });
        }
        catch (err) {
            console.error("deleteAccount error:", err);
            return res.status(500).json({ message: "Failed to delete account" });
        }
    }
    ;
    async addAddress(req, res) {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const { fullName, phone, line1, line2, city, state, postalCode, country, isDefault, } = req.body;
            // basic validation
            if (!fullName ||
                !phone ||
                !line1 ||
                !city ||
                !postalCode ||
                !country) {
                return res
                    .status(400)
                    .json({ message: "Missing required address fields" });
            }
            const user = await user_model_1.User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            // If new address is default, unset default on others
            if (isDefault) {
                user.addresses.forEach((addr) => {
                    addr.isDefault = false;
                });
            }
            // Push new address into embedded array
            user.addresses.push({
                _id: new mongoose_1.Types.ObjectId(), // optional, mongoose can auto-generate
                fullName,
                phone,
                line1,
                line2,
                city,
                state,
                postalCode,
                country,
                isDefault: !!isDefault,
            });
            await user.save();
            return res.json({
                message: "Address added",
                addresses: user.addresses,
            });
        }
        catch (err) {
            console.error("addAddress error:", err);
            return res.status(500).json({
                message: "Failed to add address",
                error: err.message, // 👈 temporary, helps debug
            });
        }
    }
    // UPDATE address
    async updateAddress(req, res) {
        try {
            const userId = req.userId;
            const addressId = req.params.id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const user = await user_model_1.User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            const index = user.addresses.findIndex((a) => String(a._id) === String(addressId));
            if (index === -1) {
                return res.status(404).json({ message: "Address not found" });
            }
            const { fullName, phone, line1, line2, city, state, postalCode, country, isDefault, } = req.body;
            const addr = user.addresses[index];
            addr.fullName = fullName ?? addr.fullName;
            addr.phone = phone ?? addr.phone;
            addr.line1 = line1 ?? addr.line1;
            addr.line2 = line2 ?? addr.line2;
            addr.city = city ?? addr.city;
            addr.state = state ?? addr.state;
            addr.postalCode = postalCode ?? addr.postalCode;
            addr.country = country ?? addr.country;
            if (typeof isDefault === "boolean") {
                if (isDefault) {
                    user.addresses.forEach((a) => (a.isDefault = false));
                }
                addr.isDefault = isDefault;
            }
            await user.save();
            return res.json({ addresses: user.addresses });
        }
        catch (err) {
            console.error("updateAddress error:", err);
            return res.status(500).json({ message: "Failed to update address" });
        }
    }
    // SET default address
    async setDefaultAddress(req, res) {
        try {
            const userId = req.userId;
            const addressId = req.params.id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const user = await user_model_1.User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            let found = false;
            user.addresses.forEach((a) => {
                if (String(a._id) === String(addressId)) {
                    a.isDefault = true;
                    found = true;
                }
                else {
                    a.isDefault = false;
                }
            });
            if (!found) {
                return res.status(404).json({ message: "Address not found" });
            }
            await user.save();
            return res.json({ addresses: user.addresses });
        }
        catch (err) {
            console.error("setDefaultAddress error:", err);
            return res.status(500).json({ message: "Failed to set default address" });
        }
    }
    async deleteAddress(req, res) {
        try {
            const userId = req.userId;
            const addressId = req.params.id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const user = await user_model_1.User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            if (!user.addresses || user.addresses.length === 0) {
                return res.status(400).json({ message: "No addresses to delete" });
            }
            // Find if the address exists and whether it's default
            const addrIndex = user.addresses.findIndex((a) => a._id.toString() === addressId);
            if (addrIndex === -1) {
                return res.status(404).json({ message: "Address not found" });
            }
            const wasDefault = user.addresses[addrIndex].isDefault;
            // Remove the address
            user.addresses.splice(addrIndex, 1);
            // If deleted address was default → set first address as default
            if (wasDefault && user.addresses.length > 0) {
                user.addresses = user.addresses.map((a, i) => ({
                    ...a.toObject?.() ?? a,
                    isDefault: i === 0,
                }));
            }
            await user.save();
            return res.json({
                message: "Address deleted",
                addresses: user.addresses,
            });
        }
        catch (err) {
            console.error("deleteAddress error:", err);
            return res.status(500).json({
                message: "Failed to delete address",
            });
        }
    }
}
exports.UserController = UserController;
