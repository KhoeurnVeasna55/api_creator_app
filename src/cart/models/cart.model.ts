// src/cart/models/cart.model.ts
import { Schema, model, Types, Document } from "mongoose";

export interface ICartItem {
    product: Types.ObjectId;
    variantId?: Types.ObjectId | null;
    quantity: number;

    // new fields
    unitPrice: number;     // price at time of adding to cart
    variantSku?: string | null;
}

export interface ICart extends Document {
    user: Types.ObjectId;
    items: ICartItem[];
    createdAt: Date;
    updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        variantId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            default: null,
        },
        quantity: {
            type: Schema.Types.Number, // 👈 use Schema.Types.Number
            default: 1,
            min: 1,
        },

        // 👇 NEW FIELDS
        unitPrice: {
            type: Schema.Types.Number,
            required: true,
            default: 0,
        },
        variantSku: {
            type: Schema.Types.String, // 👈 no bare String
            default: null,
        },
    },
    { _id: false }
);

const CartSchema = new Schema<ICart>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true, // one cart per user
        },
        items: [CartItemSchema],
    },
    { timestamps: true }
);

export const Cart = model<ICart>("Cart", CartSchema);
