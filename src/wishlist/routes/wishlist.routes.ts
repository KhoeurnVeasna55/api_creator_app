// src/wishlist/routes/wishlist.routes.ts
import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import WishlistController from "../controllers/wishlist.controller";

const router = Router();
const controller = new WishlistController();

/**
 * @swagger
 * tags:
 *   name: Wishlist
 *   description: User wishlist
 */

/**
 * @swagger
 * /api/wishlist:
 *   get:
 *     summary: Get current user's wishlist
 *     tags: [Wishlist]
 *     security: [ { bearerAuth: [] } ]
 */
router.get(
    "/",
    authenticate,
    asyncHandler(async (req, res) => {
        await controller.getMyWishlist(req, res);
    })
);

/**
 * @swagger
 * /api/wishlist/add:
 *   post:
 *     summary: Add item to wishlist
 *     tags: [Wishlist]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             productId: "68ba88ce54d06434d762e2b2"
 */
router.post(
    "/add",
    authenticate,
    asyncHandler(async (req, res) => {
        await controller.addItem(req, res);
    })
);

/**
 * @swagger
 * /api/wishlist/remove:
 *   post:
 *     summary: Remove item from wishlist
 *     tags: [Wishlist]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             productId: "68ba88ce54d06434d762e2b2"
 */
router.post(
    "/remove",
    authenticate,
    asyncHandler(async (req, res) => {
        await controller.removeItem(req, res);
    })
);

/**
 * @swagger
 * /api/wishlist/clear:
 *   post:
 *     summary: Clear current user's wishlist
 *     tags: [Wishlist]
 *     security: [ { bearerAuth: [] } ]
 */
router.post(
    "/clear",
    authenticate,
    asyncHandler(async (req, res) => {
        await controller.clearWishlist(req, res);
    })
);

console.log(
    "Loaded routes in wishlist.routes:",
    router.stack.map((r: any) => r.route?.path)
);

export default router;
