// src/order/controllers/order.controller.ts
import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { Cart } from "../../cart/models/cart.model";
import { Product } from "../../product/models/product.model";
import { Order, PaymentMethod, OrderStatus } from "../models/order.model";

type ObjectId = Types.ObjectId;

type AuthRequest = Request & {
    user?: { _id: string | ObjectId;[key: string]: any };
};

export class OrderController {
    // ===== CHECKOUT: create order from cart ===================================
    checkout = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const {
                paymentMethod,
                shippingAddress,
            }: {
                paymentMethod?: PaymentMethod;
                shippingAddress?: {
                    fullName: string;
                    phone: string;
                    addressLine1: string;
                    addressLine2?: string;
                    city?: string;
                    country?: string;
                    postalCode?: string;
                };
            } = req.body || {};

            if (!paymentMethod || !["cod", "card"].includes(paymentMethod)) {
                return res.status(400).json({ message: "Invalid paymentMethod" });
            }
            if (
                !shippingAddress ||
                !shippingAddress.fullName ||
                !shippingAddress.phone ||
                !shippingAddress.addressLine1
            ) {
                return res.status(400).json({
                    message:
                        "shippingAddress.fullName, shippingAddress.phone and shippingAddress.addressLine1 are required",
                });
            }

            // Get cart
            const cart = await Cart.findOne({ user: userId }).lean();
            if (!cart || !cart.items || cart.items.length === 0) {
                return res.status(400).json({ message: "Cart is empty" });
            }

            // Load products for all cart items
            const productIds = cart.items.map((i: any) => i.product);
            const uniqueProductIds = Array.from(
                new Set(productIds.map((id: any) => String(id)))
            ).map((id) => id as unknown as Types.ObjectId);

            const products = await Product.find({
                _id: { $in: uniqueProductIds },
                isActive: true,
            }).exec();

            const productById = new Map<string, any>();
            for (const p of products) {
                productById.set(String(p._id), p);
            }

            // Build order items + check stock
            const orderItems: any[] = [];
            let totalQuantity = 0;
            let totalPrice = 0;

            for (const item of cart.items as any[]) {
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
                let unitPrice: number | null = null;
                let imageUrl: string | undefined = product.imageUrl;
                if (variantId) {
                    const variant = (product.variants || []).find(
                        (v: any) => String(v._id) === variantId
                    );
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
                } else {
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
                    product: product._id as ObjectId,
                    variantId: variantId ? (variantId as unknown as ObjectId) : undefined,
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
            const order = await Order.create({
                user: userId,
                items: orderItems,
                totalQuantity,
                totalPrice,
                status: "pending" as OrderStatus,
                paymentMethod,
                shippingAddress,
            });

            // Update stock for each product
            for (const item of cart.items as any[]) {
                const productId = String(item.product);
                const variantId = item.variantId ? String(item.variantId) : null;
                const quantity = item.quantity ?? 1;

                const product = await Product.findById(productId).exec();
                if (!product) continue; // should not happen here

                if (variantId) {
                    const variant: any = product.variants.find(
                        (v: any) => String(v._id) === variantId
                    );
                    if (!variant) continue;
                    variant.stock = Math.max(variant.stock - quantity, 0);
                    product.markModified("variants");
                } else {
                    (product as any).stock = Math.max(
                        (product as any).stock - quantity,
                        0
                    );
                }

                await product.save();
            }

            // Clear cart
            await Cart.updateOne({ user: userId }, { $set: { items: [] } }).exec();

            return res.status(201).json(order);
        } catch (err) {
            console.error("Order checkout error:", err);
            return res.status(500).json({ message: "Failed to create order" });
        }
    };

    // ===== GET my orders ======================================================
    getMyOrders = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const orders = await Order.find({ user: userId })
                .sort({ createdAt: -1 })
                .exec();

            return res.json(orders);
        } catch (err) {
            console.error("Get my orders error:", err);
            return res.status(500).json({ message: "Failed to fetch orders" });
        }
    };

    // ===== GET single order (must belong to user) ============================
    getOrderById = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?._id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const { id } = req.params;
            if (!id || !mongoose.isValidObjectId(id)) {
                return res.status(400).json({ message: "Invalid order id" });
            }

            const order = await Order.findOne({ _id: id, user: userId }).exec();
            if (!order) {
                return res.status(404).json({ message: "Order not found" });
            }

            return res.json(order);
        } catch (err) {
            console.error("Get order by id error:", err);
            return res.status(500).json({ message: "Failed to fetch order" });
        }
    };
}

export default OrderController;
