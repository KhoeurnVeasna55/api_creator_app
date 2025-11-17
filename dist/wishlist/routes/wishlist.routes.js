"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/wishlist/routes/wishlist.routes.ts
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth");
const asyncHandler_1 = require("../../utils/asyncHandler");
const wishlist_controller_1 = __importDefault(require("../controllers/wishlist.controller"));
const router = (0, express_1.Router)();
const controller = new wishlist_controller_1.default();
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
router.get("/", auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await controller.getMyWishlist(req, res);
}));
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
router.post("/add", auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await controller.addItem(req, res);
}));
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
router.post("/remove", auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await controller.removeItem(req, res);
}));
/**
 * @swagger
 * /api/wishlist/clear:
 *   post:
 *     summary: Clear current user's wishlist
 *     tags: [Wishlist]
 *     security: [ { bearerAuth: [] } ]
 */
router.post("/clear", auth_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await controller.clearWishlist(req, res);
}));
console.log("Loaded routes in wishlist.routes:", router.stack.map((r) => r.route?.path));
exports.default = router;
