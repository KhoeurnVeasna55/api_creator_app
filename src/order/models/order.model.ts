// src/order/models/order.model.ts
import { Schema, model, Document, Types } from "mongoose";

export interface IOrderItem {
    product: Types.ObjectId;
    variantId?: Types.ObjectId;
    title: string;
    productSlug: string;
    imageUrl?: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
}

export type OrderStatus =
    | "pending"
    | "paid"
    | "shipped"
    | "completed"
    | "cancelled";

export type PaymentMethod = "cod" | "card";

export interface IShippingAddress {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city?: string;
    country?: string;
    postalCode?: string;
}

export interface IOrder extends Document {
    user: Types.ObjectId;
    items: IOrderItem[];
    totalQuantity: number;
    totalPrice: number;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    shippingAddress: IShippingAddress;
    createdAt: Date;
    updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        variantId: {
            type: Schema.Types.ObjectId,
            required: false,
        },
        title: { type: String, required: true },
        productSlug: { type: String, required: true },
        imageUrl: { type: String },
        unitPrice: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        subtotal: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const OrderSchema = new Schema<IOrder>(
    {
        user: {
            type: Schema.Types.ObjectId,
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
    },
    { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
export const Order = model<IOrder>("Order", OrderSchema);
