"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
// src/order/models/order.model.ts
const mongoose_1 = require("mongoose");
const OrderItemSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    variantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: false,
    },
    title: { type: String, required: true },
    productSlug: { type: String, required: true },
    imageUrl: { type: String },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
}, { _id: false });
const OrderSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    // ✅ array shorthand; no `{ type: [OrderItemSchema] }`
    items: [OrderItemSchema],
    totalQuantity: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: ["pending", "paid", "shipped", "completed", "cancelled"],
        default: "pending",
    },
    paymentMethod: {
        type: String,
        enum: ["cod", "card"],
        required: true,
    },
    // ✅ inline shippingAddress instead of nested Schema
    shippingAddress: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        addressLine1: { type: String, required: true },
        addressLine2: { type: String },
        city: { type: String },
        country: { type: String },
        postalCode: { type: String },
    },
}, { timestamps: true });
OrderSchema.index({ createdAt: -1 });
exports.Order = (0, mongoose_1.model)("Order", OrderSchema);
