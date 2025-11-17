// src/order/routes/order.routes.ts
import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import OrderController from "../controllers/order.controller";

const router = Router();
const controller = new OrderController();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Customer orders & checkout
 */

/**
 * @swagger
 * /api/orders/checkout:
 *   post:
 *     summary: Create order from current user's cart
 *     tags: [Orders]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             paymentMethod: "cod"
 *             shippingAddress:
 *               fullName: "John Nice"
 *               phone: "+85512345678"
 *               addressLine1: "Street 123"
 *               city: "Phnom Penh"
 *               country: "Cambodia"
 *     responses:
 *       201: { description: Order created }
 *       400: { description: Validation / stock error }
 */
router.post(
    "/checkout",
    authenticate,
    asyncHandler(async (req, res) => {
        await controller.checkout(req, res);
    })
);

/**
 * @swagger
 * /api/orders/my:
 *   get:
 *     summary: List current user's orders
 *     tags: [Orders]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: List of orders }
 */
router.get(
    "/my",
    authenticate,
    asyncHandler(async (req, res) => {
        await controller.getMyOrders(req, res);
    })
);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get a single order by id (only if it belongs to current user)
 *     tags: [Orders]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Order detail }
 *       404: { description: Not found }
 */
router.get(
    "/:id",
    authenticate,
    asyncHandler(async (req, res) => {
        await controller.getOrderById(req, res);
    })
);

console.log(
    "Loaded routes in order.routes:",
    router.stack.map((r: any) => r.route?.path)
);

export default router;
