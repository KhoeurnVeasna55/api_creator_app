"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cart_model_1 = require("../../cart/models/cart.model");
const order_model_1 = require("../models/order.model");
class OrderController {
    constructor() {
        // GET /api/orders/my
        this.getMyOrders = async (req, res) => {
            try {
                const userId = req.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const orders = await order_model_1.Order.find({ user: userId })
                    .sort({ createdAt: -1 })
                    .exec();
                return res.json(orders);
            }
            catch (err) {
                console.error("getMyOrders error:", err);
                return res.status(500).json({ message: "Failed to fetch orders" });
            }
        };
        // GET /api/orders/:id
        this.getOrderById = async (req, res) => {
            try {
                const userId = req.userId;
                if (!userId) {
                    return res.status(401).json({ message: "Unauthorized" });
                }
                const orderId = req.params.id;
                const order = await order_model_1.Order.findOne({ _id: orderId, user: userId });
                if (!order) {
                    return res.status(404).json({ message: "Order not found" });
                }
                return res.json(order);
            }
            catch (err) {
                console.error("getOrderById error:", err);
                return res.status(500).json({ message: "Failed to fetch order" });
            }
        };
    }
    // POST /api/orders/checkout
    async checkout(req, res) {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const { paymentMethod, shippingAddress } = req.body;
            if (!paymentMethod || !shippingAddress) {
                return res.status(400).json({
                    message: "paymentMethod and shippingAddress are required",
                });
            }
            // 1) Load user's cart
            const cart = await cart_model_1.Cart.findOne({ user: userId }).exec();
            if (!cart || cart.items.length === 0) {
                return res.status(400).json({ message: "Cart is empty" });
            }
            console.log("checkout: cart items =", cart.items.length);
            // 2) Map cart items → order items (with FALLBACKS)
            const orderItems = cart.items.map((item, index) => {
                // Try all possible field names you might be using in Cart:
                const title = item.title ||
                    item.productTitle ||
                    item.name ||
                    `Item ${index + 1}`;
                const productSlug = item.productSlug ||
                    item.slug ||
                    (item.product ? String(item.product) : `item-${index + 1}`);
                const unitPrice = item.price ?? item.unitPrice ?? 0;
                const quantity = item.quantity ?? 1;
                const subtotal = item.lineTotal ??
                    item.subtotal ??
                    unitPrice * quantity;
                return {
                    product: item.product || item.productId, // adapt to your Cart schema
                    variantId: item.variantId,
                    title,
                    productSlug,
                    imageUrl: item.imageUrl,
                    unitPrice,
                    quantity,
                    subtotal,
                };
            });
            const totalQuantity = orderItems.reduce((sum, it) => sum + it.quantity, 0);
            const totalPrice = orderItems.reduce((sum, it) => sum + it.subtotal, 0);
            // 3) Create order
            const order = await order_model_1.Order.create({
                user: userId,
                items: orderItems,
                totalQuantity,
                totalPrice,
                status: "pending",
                paymentMethod, // "cod" or "card"
                shippingAddress: {
                    fullName: shippingAddress.fullName,
                    phone: shippingAddress.phone,
                    addressLine1: shippingAddress.addressLine1,
                    addressLine2: shippingAddress.addressLine2,
                    city: shippingAddress.city,
                    country: shippingAddress.country,
                    postalCode: shippingAddress.postalCode,
                },
            });
            // 4) Clear cart
            cart.items = [];
            await cart.save();
            return res.status(201).json(order);
        }
        catch (err) {
            console.error("checkout error:", err);
            return res.status(500).json({
                message: "Failed to checkout",
                error: err.message,
            });
        }
    }
}
exports.default = OrderController;
