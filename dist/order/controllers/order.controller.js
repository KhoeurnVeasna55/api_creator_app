"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const cart_model_1 = require("../../cart/models/cart.model");
const product_model_1 = require("../../product/models/product.model");
const order_model_1 = require("../models/order.model");
class OrderController {
    constructor() {
        // ===== CHECKOUT: create order from cart ===================================
        this.checkout = async (req, res) => {
            try {
                const userId = req.user?._id;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const { paymentMethod, shippingAddress, } = req.body || {};
                if (!paymentMethod || !["cod", "card"].includes(paymentMethod)) {
                    return res.status(400).json({ message: "Invalid paymentMethod" });
                }
                if (!shippingAddress ||
                    !shippingAddress.fullName ||
                    !shippingAddress.phone ||
                    !shippingAddress.addressLine1) {
                    return res.status(400).json({
                        message: "shippingAddress.fullName, shippingAddress.phone and shippingAddress.addressLine1 are required",
                    });
                }
                // Get cart
                const cart = await cart_model_1.Cart.findOne({ user: userId }).lean();
                if (!cart || !cart.items || cart.items.length === 0) {
                    return res.status(400).json({ message: "Cart is empty" });
                }
                // Load products for all cart items
                const productIds = cart.items.map((i) => i.product);
                const uniqueProductIds = Array.from(new Set(productIds.map((id) => String(id)))).map((id) => id);
                const products = await product_model_1.Product.find({
                    _id: { $in: uniqueProductIds },
                    isActive: true,
                }).exec();
                const productById = new Map();
                for (const p of products) {
                    productById.set(String(p._id), p);
                }
                // Build order items + check stock
                const orderItems = [];
                let totalQuantity = 0;
                let totalPrice = 0;
                for (const item of cart.items) {
                    const productId = String(item.product);
                    const variantId = item.variantId ? String(item.variantId) : null;
                    const quantity = item.quantity ?? 1;
                    const product = productById.get(productId);
                    if (!product) {
                        return res.status(400).json({
                            message: "Product in cart no longer exists or is inactive",
                            productId,
                        });
                    }
                    // Decide if variant or simple
                    let unitPrice = null;
                    let imageUrl = product.imageUrl;
                    if (variantId) {
                        const variant = (product.variants || []).find((v) => String(v._id) === variantId);
                        if (!variant) {
                            return res.status(400).json({
                                message: "Variant in cart no longer exists",
                                productId,
                                variantId,
                            });
                        }
                        if (variant.stock < quantity) {
                            return res.status(400).json({
                                message: "Not enough stock for this variant",
                                productId,
                                variantId,
                                available: variant.stock,
                                requested: quantity,
                            });
                        }
                        unitPrice =
                            typeof variant.salePrice === "number"
                                ? variant.salePrice
                                : variant.price;
                        if (variant.imageUrl) {
                            imageUrl = variant.imageUrl;
                        }
                    }
                    else {
                        // simple product (no variant)
                        if (product.stock < quantity) {
                            return res.status(400).json({
                                message: "Not enough stock for this product",
                                productId,
                                available: product.stock,
                                requested: quantity,
                            });
                        }
                        unitPrice =
                            typeof product.salePrice === "number"
                                ? product.salePrice
                                : product.price;
                    }
                    if (typeof unitPrice !== "number") {
                        return res.status(400).json({
                            message: "Price not configured for product",
                            productId,
                            variantId,
                        });
                    }
                    const subtotal = unitPrice * quantity;
                    totalQuantity += quantity;
                    totalPrice += subtotal;
                    orderItems.push({
                        product: product._id,
                        variantId: variantId ? variantId : undefined,
                        title: product.title,
                        productSlug: product.slug,
                        imageUrl,
                        unitPrice,
                        quantity,
                        subtotal,
                    });
                }
                if (orderItems.length === 0) {
                    return res.status(400).json({ message: "Cart is empty" });
                }
                // Now we actually create the order and update stock
                // (no transactions for simplicity)
                const order = await order_model_1.Order.create({
                    user: userId,
                    items: orderItems,
                    totalQuantity,
                    totalPrice,
                    status: "pending",
                    paymentMethod,
                    shippingAddress,
                });
                // Update stock for each product
                for (const item of cart.items) {
                    const productId = String(item.product);
                    const variantId = item.variantId ? String(item.variantId) : null;
                    const quantity = item.quantity ?? 1;
                    const product = await product_model_1.Product.findById(productId).exec();
                    if (!product)
                        continue; // should not happen here
                    if (variantId) {
                        const variant = product.variants.find((v) => String(v._id) === variantId);
                        if (!variant)
                            continue;
                        variant.stock = Math.max(variant.stock - quantity, 0);
                        product.markModified("variants");
                    }
                    else {
                        product.stock = Math.max(product.stock - quantity, 0);
                    }
                    await product.save();
                }
                // Clear cart
                await cart_model_1.Cart.updateOne({ user: userId }, { $set: { items: [] } }).exec();
                return res.status(201).json(order);
            }
            catch (err) {
                console.error("Order checkout error:", err);
                return res.status(500).json({ message: "Failed to create order" });
            }
        };
        // ===== GET my orders ======================================================
        this.getMyOrders = async (req, res) => {
            try {
                const userId = req.user?._id;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const orders = await order_model_1.Order.find({ user: userId })
                    .sort({ createdAt: -1 })
                    .exec();
                return res.json(orders);
            }
            catch (err) {
                console.error("Get my orders error:", err);
                return res.status(500).json({ message: "Failed to fetch orders" });
            }
        };
        // ===== GET single order (must belong to user) ============================
        this.getOrderById = async (req, res) => {
            try {
                const userId = req.user?._id;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const { id } = req.params;
                if (!id || !mongoose_1.default.isValidObjectId(id)) {
                    return res.status(400).json({ message: "Invalid order id" });
                }
                const order = await order_model_1.Order.findOne({ _id: id, user: userId }).exec();
                if (!order) {
                    return res.status(404).json({ message: "Order not found" });
                }
                return res.json(order);
            }
            catch (err) {
                console.error("Get order by id error:", err);
                return res.status(500).json({ message: "Failed to fetch order" });
            }
        };
    }
}
exports.OrderController = OrderController;
exports.default = OrderController;
