"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/cart/routes/cart.routes.ts
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth");
const asyncHandler_1 = require("../../utils/asyncHandler");
const cart_controller_1 = require("../controllers/cart.controller");
const router = (0, express_1.Router)();
const controller = new cart_controller_1.CartController();
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
router.get("/", auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await controller.getMyCart(req, res);
}));
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
router.post("/add", auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await controller.addItem(req, res);
}));
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
router.post("/update", auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await controller.updateItem(req, res);
}));
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
router.post("/remove", auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await controller.removeItem(req, res);
}));
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
router.post("/clear", auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await controller.clearCart(req, res);
}));
console.log("Loaded routes in cart.routes:", router.stack.map((r) => r.route?.path));
exports.default = router;
