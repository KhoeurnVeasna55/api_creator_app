"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cart = void 0;
// src/cart/models/cart.model.ts
const mongoose_1 = require("mongoose");
const CartItemSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    variantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        default: null,
    },
    quantity: {
        type: mongoose_1.Schema.Types.Number, // 👈 use Schema.Types.Number
        default: 1,
        min: 1,
    },
    // 👇 NEW FIELDS
    unitPrice: {
        type: mongoose_1.Schema.Types.Number,
        required: true,
        default: 0,
    },
    variantSku: {
        type: mongoose_1.Schema.Types.String, // 👈 no bare String
        default: null,
    },
}, { _id: false });
const CartSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true, // one cart per user
    },
    items: [CartItemSchema],
}, { timestamps: true });
exports.Cart = (0, mongoose_1.model)("Cart", CartSchema);
