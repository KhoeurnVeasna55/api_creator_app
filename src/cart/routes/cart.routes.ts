// src/cart/routes/cart.routes.ts
import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { CartController } from "../controllers/cart.controller";

const router = Router();
const controller = new CartController();

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Customer shopping cart
 */

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get current user's cart
 *     tags: [Cart]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200:
 *         description: Cart object (may be empty)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Cart"
 */
router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    await controller.getMyCart(req, res);
  })

);

/**
 * @swagger
 * /api/cart/add:
 *   post:
 *     summary: Add item to cart (or increase quantity)
 *     tags: [Cart]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             productId: "68ba88ce54d06434d762e2b2"
 *             variantId: "68ba88ce54d06434d762e2b3"
 *             quantity: 2
 *     responses:
 *       200: { description: Updated cart }
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
 * /api/cart/update:
 *   post:
 *     summary: Update quantity for one item in cart
 *     tags: [Cart]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             productId: "68ba88ce54d06434d762e2b2"
 *             variantId: "68ba88ce54d06434d762e2b3"
 *             quantity: 1
 *     responses:
 *       200: { description: Updated cart }
 */
router.post(
  "/update",
  authenticate,
  asyncHandler(async (req, res) => {
    await controller.updateItem(req, res);
  })
);

/**
 * @swagger
 * /api/cart/remove:
 *   post:
 *     summary: Remove a single item from cart
 *     tags: [Cart]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             productId: "68ba88ce54d06434d762e2b2"
 *             variantId: "68ba88ce54d06434d762e2b3"
 *     responses:
 *       200: { description: Updated cart }
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
 * /api/cart/clear:
 *   post:
 *     summary: Clear current user's cart
 *     tags: [Cart]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: Cart cleared }
 */
router.post(
  "/clear",
  authenticate,
  asyncHandler(async (req, res) => {
    await controller.clearCart(req, res);
  })
);

console.log(
  "Loaded routes in cart.routes:",
  router.stack.map((r: any) => r.route?.path)
);

export default router;
