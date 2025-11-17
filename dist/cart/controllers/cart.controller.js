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
exports.CartController = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const cart_model_1 = require("../models/cart.model");
const product_model_1 = require("../../product/models/product.model");
const PRODUCT_CART_PROJECTION = "title slug imageUrl currency totalStock isActive price salePrice"; // removed lowestPrice
class CartController {
    constructor() {
        // ===== GET my cart ========================================================
        this.getMyCart = async (req, res) => {
            try {
                const userId = req.userId; // authenticate guarantees this
                const cart = await cart_model_1.Cart.findOne({ user: userId })
                    .populate({
                    path: "items.product",
                    select: PRODUCT_CART_PROJECTION,
                })
                    .exec();
                return res.json(cart || {
                    user: userId,
                    items: [],
                    createdAt: null,
                    updatedAt: null,
                });
            }
            catch (err) {
                console.error("Cart getMyCart error:", err);
                return res.status(500).json({ message: "Failed to fetch cart" });
            }
        };
        // ===== ADD item to cart (or increase quantity) ============================
        this.addItem = async (req, res) => {
            try {
                const userId = req.userId;
                const { productId, variantId, quantity } = req.body;
                if (!productId || !mongoose_1.default.isValidObjectId(productId)) {
                    return res.status(400).json({ message: "Invalid productId" });
                }
                const qty = Math.max(Number(quantity ?? 1), 1);
                const product = await product_model_1.Product.findById(productId).lean();
                if (!product || !product.isActive) {
                    return res.status(404).json({ message: "Product not found" });
                }
                // ---------- find variant (if any) ----------
                let variantObjectId;
                let variant = null;
                if (variantId) {
                    if (!mongoose_1.default.isValidObjectId(variantId)) {
                        return res.status(400).json({ message: "Invalid variantId" });
                    }
                    variant = product.variants?.find((v) => String(v._id) === String(variantId));
                    if (!variant) {
                        return res.status(404).json({ message: "Variant not found" });
                    }
                    variantObjectId = new mongoose_1.Types.ObjectId(variantId);
                }
                // ---------- compute unit price & variant sku ----------
                const unitPrice = variant
                    ? Number(variant.salePrice ?? variant.price ?? 0)
                    : Number(product.salePrice ??
                        product.price ??
                        0);
                const variantSku = variant?.sku ?? null;
                // ---------- find / create cart ----------
                let cart = await cart_model_1.Cart.findOne({ user: userId });
                if (!cart) {
                    cart = new cart_model_1.Cart({ user: userId, items: [] });
                }
                // ---------- check if item already exists ----------
                const existing = cart.items.find((item) => {
                    const sameProduct = String(item.product) === productId;
                    const sameVariant = (!item.variantId && !variantObjectId) ||
                        (item.variantId &&
                            variantObjectId &&
                            String(item.variantId) === String(variantObjectId));
                    return sameProduct && sameVariant;
                });
                if (existing) {
                    // just bump quantity, keep stored unitPrice & variantSku
                    existing.quantity += qty;
                }
                else {
                    // push a new line with unitPrice + variantSku
                    cart.items.push({
                        product: new mongoose_1.Types.ObjectId(productId),
                        variantId: variantObjectId,
                        quantity: qty,
                        unitPrice,
                        variantSku,
                    });
                }
                await cart.save();
                const populated = await cart_model_1.Cart.findOne({ user: userId })
                    .populate({ path: "items.product", select: PRODUCT_CART_PROJECTION })
                    .lean();
                return res.json(populated);
            }
            catch (err) {
                console.error("Cart addItem error:", err);
                return res.status(500).json({ message: "Failed to add item" });
            }
        };
        // ===== UPDATE item quantity ==============================================
        this.updateItem = async (req, res) => {
            try {
                const userId = req.userId;
                const { productId, variantId, quantity } = req.body;
                if (!productId || !mongoose_1.default.isValidObjectId(productId)) {
                    return res.status(400).json({ message: "Invalid productId" });
                }
                const qty = Number(quantity);
                if (!Number.isFinite(qty)) {
                    return res.status(400).json({ message: "Invalid quantity" });
                }
                const cart = await cart_model_1.Cart.findOne({ user: userId });
                if (!cart) {
                    return res.status(404).json({ message: "Cart not found" });
                }
                const variantStr = variantId || null;
                const idx = cart.items.findIndex((item) => {
                    const sameProduct = String(item.product) === productId;
                    const sameVariant = (!item.variantId && !variantStr) ||
                        (item.variantId && variantStr && String(item.variantId) === variantStr);
                    return sameProduct && sameVariant;
                });
                if (idx === -1) {
                    return res.status(404).json({ message: "Item not found in cart" });
                }
                if (qty <= 0) {
                    cart.items.splice(idx, 1);
                }
                else {
                    cart.items[idx].quantity = qty;
                    // do NOT change unitPrice here – keep price from when it was added
                }
                await cart.save();
                const populated = await cart_model_1.Cart.findOne({ user: userId })
                    .populate({ path: "items.product", select: PRODUCT_CART_PROJECTION })
                    .lean();
                return res.json(populated);
            }
            catch (err) {
                console.error("Cart updateItem error:", err);
                return res.status(500).json({ message: "Failed to update cart item" });
            }
        };
        // ===== REMOVE one item ====================================================
        this.removeItem = async (req, res) => {
            try {
                const userId = req.userId;
                const { productId, variantId } = req.body;
                if (!productId || !mongoose_1.default.isValidObjectId(productId)) {
                    return res.status(400).json({ message: "Invalid productId" });
                }
                const cart = await cart_model_1.Cart.findOne({ user: userId });
                if (!cart) {
                    return res.status(404).json({ message: "Cart not found" });
                }
                const variantStr = variantId || null;
                // mutate the DocumentArray in-place (no type error)
                for (let i = cart.items.length - 1; i >= 0; i--) {
                    const item = cart.items[i];
                    const sameProduct = String(item.product) === productId;
                    const sameVariant = (!item.variantId && !variantStr) ||
                        (item.variantId && variantStr && String(item.variantId) === variantStr);
                    if (sameProduct && sameVariant) {
                        cart.items.splice(i, 1);
                    }
                }
                await cart.save();
                const populated = await cart_model_1.Cart.findOne({ user: userId })
                    .populate({ path: "items.product", select: PRODUCT_CART_PROJECTION })
                    .lean();
                return res.json(populated);
            }
            catch (err) {
                console.error("Cart removeItem error:", err);
                return res.status(500).json({ message: "Failed to remove cart item" });
            }
        };
        // ===== CLEAR cart =========================================================
        this.clearCart = async (req, res) => {
            try {
                const userId = req.userId;
                const cart = await cart_model_1.Cart.findOne({ user: userId });
                if (!cart) {
                    return res.status(404).json({ message: "Cart not found" });
                }
                // clear DocumentArray safely
                cart.items.splice(0, cart.items.length);
                await cart.save();
                return res.json({ message: "Cart cleared", items: [] });
            }
            catch (err) {
                console.error("Cart clearCart error:", err);
                return res.status(500).json({ message: "Failed to clear cart" });
            }
        };
    }
}
exports.CartController = CartController;
exports.default = CartController;
