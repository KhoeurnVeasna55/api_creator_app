// src/wishlist/controllers/wishlist.controller.ts
import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { Wishlist } from "../models/wishlist.model";
import { Product } from "../../product/models/product.model";

type AuthRequest = Request & {
  userId?: string; // set by authenticate middleware
};

export class WishlistController {
  // ===== GET my wishlist ====================================================
 getMyWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      console.log("❌ getMyWishlist: no userId on req");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const wishlist = await Wishlist.findOne({ user: userId })
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

    return res.json(
      wishlist || {
        _id: null,
        user: userId,
        products: [],
        createdAt: null,
        updatedAt: null,
      }
    );
  } catch (err) {
    console.error("Wishlist getMyWishlist error:", err);
    return res.status(500).json({ message: "Failed to fetch wishlist" });
  }
};


  // ===== ADD to wishlist ====================================================
  addItem = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        console.log("❌ addItem: no userId on req");
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { productId } = req.body as {
        productId?: string;
      };

      if (!productId || !mongoose.isValidObjectId(productId)) {
        return res.status(400).json({ message: "Invalid productId" });
      }

      const productDoc = await Product.findById(productId).lean();
      const product = productDoc as any;

      if (!product || !product.isActive) {
        return res.status(404).json({ message: "Product not found" });
      }

      let wishlist = await Wishlist.findOne({ user: userId }).exec();
      if (!wishlist) {
        wishlist = new Wishlist({
          user: userId,
          products: [],
        });
      }

      const alreadyInWishlist = wishlist.products.some(
        (p) => String(p) === String(productId)
      );

      if (!alreadyInWishlist) {
        wishlist.products.push(new Types.ObjectId(productId));
      }

      await wishlist.save();

      const updated = await Wishlist.findOne({ user: userId })
        .populate({
          path: "products",
          select:
            "title brand slug imageUrl currency totalStock isActive hasVariants lowestPrice highestPrice",
        })
        .exec();

      return res.status(200).json(updated);
    } catch (err) {
      console.error("Wishlist addItem error:", err);
      return res.status(500).json({ message: "Failed to add to wishlist" });
    }
  };

  // ===== REMOVE one item ====================================================
  // ===== REMOVE one item ====================================================
  removeItem = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        console.log("❌ removeItem: no userId on req");
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { productId } = req.body as {
        productId?: string;
      };

      if (!productId || !mongoose.isValidObjectId(productId)) {
        return res.status(400).json({ message: "Invalid productId" });
      }

      const wishlist = await Wishlist.findOne({ user: userId }).exec();
      if (!wishlist) {
        return res.status(404).json({ message: "Wishlist not found" });
      }

      // 🔧 Replace .pull() with normal array filtering
      wishlist.products = wishlist.products.filter(
        (p) => String(p) !== String(productId)
      );

      await wishlist.save();

      const updated = await Wishlist.findOne({ user: userId })
        .populate({
          path: "products",
          select:
            "title brand slug imageUrl currency totalStock isActive hasVariants lowestPrice highestPrice",
        })
        .exec();

      return res.json(updated);
    } catch (err) {
      console.error("Wishlist removeItem error:", err);
      return res
        .status(500)
        .json({ message: "Failed to remove wishlist item" });
    }
  };


  // ===== CLEAR wishlist =====================================================
  clearWishlist = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        console.log("❌ clearWishlist: no userId on req");
        return res.status(401).json({ message: "Unauthorized" });
      }

      const wishlist = await Wishlist.findOne({ user: userId }).exec();
      if (!wishlist) {
        return res.status(404).json({ message: "Wishlist not found" });
      }

      // Clear while keeping the DocumentArray type
      wishlist.products.splice(0, wishlist.products.length);
      await wishlist.save();

      return res.json({ message: "Wishlist cleared", products: [] });
    } catch (err) {
      console.error("Wishlist clearWishlist error:", err);
      return res.status(500).json({ message: "Failed to clear wishlist" });
    }
  };
}

export default WishlistController;
