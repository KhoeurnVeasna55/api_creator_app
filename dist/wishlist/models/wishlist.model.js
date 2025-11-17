"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wishlist = void 0;
// src/wishlist/models/wishlist.model.ts
const mongoose_1 = require("mongoose");
const WishlistSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true, // one wishlist per user
    },
    products: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
    ],
}, { timestamps: true });
exports.Wishlist = (0, mongoose_1.model)("Wishlist", WishlistSchema);
