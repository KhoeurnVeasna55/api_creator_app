// src/cart/controllers/cart.controller.ts
import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { Cart } from "../models/cart.model";
import { Product } from "../../product/models/product.model";

type ObjectId = Types.ObjectId;

const PRODUCT_CART_PROJECTION =
    "title slug imageUrl currency totalStock isActive price salePrice"; // removed lowestPrice

export class CartController {
    // ===== GET my cart ========================================================
    getMyCart = async (req: Request, res: Response) => {
        try {
            const userId = req.userId as string; // authenticate guarantees this

            const cart = await Cart.findOne({ user: userId })
                .populate({
                    path: "items.product",
                    select: PRODUCT_CART_PROJECTION,
                })
                .exec();

            return res.json(
                cart || {
                    user: userId,
                    items: [],
                    createdAt: null,
                    updatedAt: null,
                }
            );
        } catch (err) {
            console.error("Cart getMyCart error:", err);
            return res.status(500).json({ message: "Failed to fetch cart" });
        }
    };

    // ===== ADD item to cart (or increase quantity) ============================
    addItem = async (req: Request, res: Response) => {
        try {
            const userId = req.userId as string;

            const { productId, variantId, quantity } = req.body as {
                productId?: string;
                variantId?: string;
                quantity?: number;
            };

            if (!productId || !mongoose.isValidObjectId(productId)) {
                return res.status(400).json({ message: "Invalid productId" });
            }

            const qty = Math.max(Number(quantity ?? 1), 1);

            const product = await Product.findById(productId).lean();
            if (!product || !product.isActive) {
                return res.status(404).json({ message: "Product not found" });
            }

            // ---------- find variant (if any) ----------
            let variantObjectId: ObjectId | undefined;
            let variant: any | null = null;

            if (variantId) {
                if (!mongoose.isValidObjectId(variantId)) {
                    return res.status(400).json({ message: "Invalid variantId" });
                }

                variant = (product as any).variants?.find(
                    (v: any) => String(v._id) === String(variantId)
                );
                if (!variant) {
                    return res.status(404).json({ message: "Variant not found" });
                }

                variantObjectId = new Types.ObjectId(variantId);
            }

            // ---------- compute unit price & variant sku ----------
            const unitPrice = variant
                ? Number(variant.salePrice ?? variant.price ?? 0)
                : Number(
                    (product as any).salePrice ??
                    (product as any).price ??
                    0
                );

            const variantSku: string | null = variant?.sku ?? null;

            // ---------- find / create cart ----------
            let cart = await Cart.findOne({ user: userId });
            if (!cart) {
                cart = new Cart({ user: userId, items: [] });
            }

            // ---------- check if item already exists ----------
            const existing = cart.items.find((item) => {
                const sameProduct = String(item.product) === productId;
                const sameVariant =
                    (!item.variantId && !variantObjectId) ||
                    (item.variantId &&
                        variantObjectId &&
                        String(item.variantId) === String(variantObjectId));
                return sameProduct && sameVariant;
            });

            if (existing) {
                // just bump quantity, keep stored unitPrice & variantSku
                existing.quantity += qty;
            } else {
                // push a new line with unitPrice + variantSku
                cart.items.push({
                    product: new Types.ObjectId(productId),
                    variantId: variantObjectId,
                    quantity: qty,
                    unitPrice,
                    variantSku,
                } as any);
            }

            await cart.save();

            const populated = await Cart.findOne({ user: userId })
                .populate({ path: "items.product", select: PRODUCT_CART_PROJECTION })
                .lean();

            return res.json(populated);
        } catch (err) {
            console.error("Cart addItem error:", err);
            return res.status(500).json({ message: "Failed to add item" });
        }
    };

    // ===== UPDATE item quantity ==============================================
    updateItem = async (req: Request, res: Response) => {
        try {
            const userId = req.userId as string;

            const { productId, variantId, quantity } = req.body as {
                productId?: string;
                variantId?: string;
                quantity?: number;
            };

            if (!productId || !mongoose.isValidObjectId(productId)) {
                return res.status(400).json({ message: "Invalid productId" });
            }

            const qty = Number(quantity);
            if (!Number.isFinite(qty)) {
                return res.status(400).json({ message: "Invalid quantity" });
            }

            const cart = await Cart.findOne({ user: userId });
            if (!cart) {
                return res.status(404).json({ message: "Cart not found" });
            }

            const variantStr = variantId || null;
            const idx = cart.items.findIndex((item) => {
                const sameProduct = String(item.product) === productId;
                const sameVariant =
                    (!item.variantId && !variantStr) ||
                    (item.variantId && variantStr && String(item.variantId) === variantStr);
                return sameProduct && sameVariant;
            });

            if (idx === -1) {
                return res.status(404).json({ message: "Item not found in cart" });
            }

            if (qty <= 0) {
                cart.items.splice(idx, 1);
            } else {
                cart.items[idx].quantity = qty;
                // do NOT change unitPrice here – keep price from when it was added
            }

            await cart.save();

            const populated = await Cart.findOne({ user: userId })
                .populate({ path: "items.product", select: PRODUCT_CART_PROJECTION })
                .lean();

            return res.json(populated);
        } catch (err) {
            console.error("Cart updateItem error:", err);
            return res.status(500).json({ message: "Failed to update cart item" });
        }
    };

    // ===== REMOVE one item ====================================================
    removeItem = async (req: Request, res: Response) => {
        try {
            const userId = req.userId as string;

            const { productId, variantId } = req.body as {
                productId?: string;
                variantId?: string;
            };

            if (!productId || !mongoose.isValidObjectId(productId)) {
                return res.status(400).json({ message: "Invalid productId" });
            }

            const cart = await Cart.findOne({ user: userId });
            if (!cart) {
                return res.status(404).json({ message: "Cart not found" });
            }

            const variantStr = variantId || null;

            // mutate the DocumentArray in-place (no type error)
            for (let i = cart.items.length - 1; i >= 0; i--) {
                const item = cart.items[i];
                const sameProduct = String(item.product) === productId;
                const sameVariant =
                    (!item.variantId && !variantStr) ||
                    (item.variantId && variantStr && String(item.variantId) === variantStr);

                if (sameProduct && sameVariant) {
                    cart.items.splice(i, 1);
                }
            }

            await cart.save();

            const populated = await Cart.findOne({ user: userId })
                .populate({ path: "items.product", select: PRODUCT_CART_PROJECTION })
                .lean();

            return res.json(populated);
        } catch (err) {
            console.error("Cart removeItem error:", err);
            return res.status(500).json({ message: "Failed to remove cart item" });
        }
    };

    // ===== CLEAR cart =========================================================
    clearCart = async (req: Request, res: Response) => {
        try {
            const userId = req.userId as string;

            const cart = await Cart.findOne({ user: userId });
            if (!cart) {
                return res.status(404).json({ message: "Cart not found" });
            }

            // clear DocumentArray safely
            cart.items.splice(0, cart.items.length);

            await cart.save();

            return res.json({ message: "Cart cleared", items: [] });
        } catch (err) {
            console.error("Cart clearCart error:", err);
            return res.status(500).json({ message: "Failed to clear cart" });
        }
    };
}

export default CartController;
