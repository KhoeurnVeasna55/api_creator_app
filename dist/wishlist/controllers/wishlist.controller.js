"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishlistController = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const wishlist_model_1 = require("../models/wishlist.model");
const product_model_1 = require("../../product/models/product.model");
class WishlistController {
    constructor() {
        // ===== GET my wishlist ====================================================
        this.getMyWishlist = async (req, res) => {
            try {
                const userId = req.userId;
                if (!userId) {
                    console.log("❌ getMyWishlist: no userId on req");
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const wishlist = await wishlist_model_1.Wishlist.findOne({ user: userId })
                    .populate({
                    path: "products",
                    select: [
                        "title",
                        "brand",
                        "slug",
                        "imageUrl",
                        "currency",
                        "totalStock",
                        "isActive",
                        // 👇 needed for virtuals to work
                        "price",
                        "salePrice",
                        "variants.price",
                        "variants.salePrice",
                        // virtuals (optional to list, but ok)
                        "discountPercent",
                        "hasVariants",
                        "lowestPrice",
                        "highestPrice",
                    ].join(" "),
                })
                    .exec();
                return res.json(wishlist || {
                    _id: null,
                    user: userId,
                    products: [],
                    createdAt: null,
                    updatedAt: null,
                });
            }
            catch (err) {
                console.error("Wishlist getMyWishlist error:", err);
                return res.status(500).json({ message: "Failed to fetch wishlist" });
            }
        };
        // ===== ADD to wishlist ====================================================
        this.addItem = async (req, res) => {
            try {
                const userId = req.userId;
                if (!userId) {
                    console.log("❌ addItem: no userId on req");
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const { productId } = req.body;
                if (!productId || !mongoose_1.default.isValidObjectId(productId)) {
                    return res.status(400).json({ message: "Invalid productId" });
                }
                const productDoc = await product_model_1.Product.findById(productId).lean();
                const product = productDoc;
                if (!product || !product.isActive) {
                    return res.status(404).json({ message: "Product not found" });
                }
                let wishlist = await wishlist_model_1.Wishlist.findOne({ user: userId }).exec();
                if (!wishlist) {
                    wishlist = new wishlist_model_1.Wishlist({
                        user: userId,
                        products: [],
                    });
                }
                const alreadyInWishlist = wishlist.products.some((p) => String(p) === String(productId));
                if (!alreadyInWishlist) {
                    wishlist.products.push(new mongoose_1.Types.ObjectId(productId));
                }
                await wishlist.save();
                const updated = await wishlist_model_1.Wishlist.findOne({ user: userId })
                    .populate({
                    path: "products",
                    select: "title brand slug imageUrl currency totalStock isActive hasVariants lowestPrice highestPrice",
                })
                    .exec();
                return res.status(200).json(updated);
            }
            catch (err) {
                console.error("Wishlist addItem error:", err);
                return res.status(500).json({ message: "Failed to add to wishlist" });
            }
        };
        // ===== REMOVE one item ====================================================
        // ===== REMOVE one item ====================================================
        this.removeItem = async (req, res) => {
            try {
                const userId = req.userId;
                if (!userId) {
                    console.log("❌ removeItem: no userId on req");
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const { productId } = req.body;
                if (!productId || !mongoose_1.default.isValidObjectId(productId)) {
                    return res.status(400).json({ message: "Invalid productId" });
                }
                const wishlist = await wishlist_model_1.Wishlist.findOne({ user: userId }).exec();
                if (!wishlist) {
                    return res.status(404).json({ message: "Wishlist not found" });
                }
                // 🔧 Replace .pull() with normal array filtering
                wishlist.products = wishlist.products.filter((p) => String(p) !== String(productId));
                await wishlist.save();
                const updated = await wishlist_model_1.Wishlist.findOne({ user: userId })
                    .populate({
                    path: "products",
                    select: "title brand slug imageUrl currency totalStock isActive hasVariants lowestPrice highestPrice",
                })
                    .exec();
                return res.json(updated);
            }
            catch (err) {
                console.error("Wishlist removeItem error:", err);
                return res
                    .status(500)
                    .json({ message: "Failed to remove wishlist item" });
            }
        };
        // ===== CLEAR wishlist =====================================================
        this.clearWishlist = async (req, res) => {
            try {
                const userId = req.userId;
                if (!userId) {
                    console.log("❌ clearWishlist: no userId on req");
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const wishlist = await wishlist_model_1.Wishlist.findOne({ user: userId }).exec();
                if (!wishlist) {
                    return res.status(404).json({ message: "Wishlist not found" });
                }
                // Clear while keeping the DocumentArray type
                wishlist.products.splice(0, wishlist.products.length);
                await wishlist.save();
                return res.json({ message: "Wishlist cleared", products: [] });
            }
            catch (err) {
                console.error("Wishlist clearWishlist error:", err);
                return res.status(500).json({ message: "Failed to clear wishlist" });
            }
        };
    }
}
exports.WishlistController = WishlistController;
exports.default = WishlistController;
