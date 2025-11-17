"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminProductController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const product_model_1 = require("../models/product.model");
const attribute_model_1 = require("../../attribute/models/attribute.model");
const isHex24 = (s) => typeof s === "string" && /^[a-fA-F0-9]{24}$/.test(s);
const toArray = (v) => (Array.isArray(v) ? v : [v]);
class AdminProductController {
    constructor() {
        // ===== LIST ====================
        this.list = async (req, res) => {
            try {
                const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
                const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "12"), 10), 1), 100);
                const search = String(req.query.search ?? "").trim();
                const brand = String(req.query.brand ?? "").trim();
                const category = String(req.query.category ?? "").trim();
                const inStock = String(req.query.inStock ?? "").toLowerCase() === "true";
                const hasVariantsQ = req.query.hasVariants;
                const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
                const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
                const sort = String(req.query.sort ?? "-createdAt");
                const filter = {};
                if (search) {
                    filter.$or = [
                        { title: { $regex: search, $options: "i" } },
                        { description: { $regex: search, $options: "i" } },
                        { brand: { $regex: search, $options: "i" } },
                    ];
                }
                if (brand)
                    filter.brand = { $regex: `^${brand}$`, $options: "i" };
                if (category && mongoose_1.default.isValidObjectId(category))
                    filter.category = category;
                if (inStock)
                    filter.totalStock = { $gt: 0 };
                if (typeof hasVariantsQ !== "undefined") {
                    const val = String(hasVariantsQ).toLowerCase();
                    if (val === "true")
                        filter["variants.0"] = { $exists: true };
                    else if (val === "false")
                        filter["variants"] = { $size: 0 };
                }
                if (typeof minPrice === "number") {
                    filter.$and = filter.$and || [];
                    filter.$and.push({
                        $or: [
                            { salePrice: { $exists: true, $gte: minPrice } },
                            { price: { $gte: minPrice } },
                            { variants: { $elemMatch: { salePrice: { $exists: true, $gte: minPrice } } } },
                            { variants: { $elemMatch: { price: { $gte: minPrice } } } },
                        ],
                    });
                }
                if (typeof maxPrice === "number") {
                    filter.$and = filter.$and || [];
                    filter.$and.push({
                        $or: [
                            { salePrice: { $exists: true, $lte: maxPrice } },
                            { price: { $lte: maxPrice } },
                            { variants: { $elemMatch: { salePrice: { $exists: true, $lte: maxPrice } } } },
                            { variants: { $elemMatch: { price: { $lte: maxPrice } } } },
                        ],
                    });
                }
                const dir = sort.startsWith("-") ? -1 : 1;
                const field = sort.replace(/^-/, "");
                const sortSpec = { [field]: dir };
                const total = await product_model_1.Product.countDocuments(filter);
                const items = await product_model_1.Product.aggregate([
                    { $match: filter },
                    { $sort: sortSpec },
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                    {
                        $addFields: {
                            hasVariants: { $gt: [{ $size: { $ifNull: ["$variants", []] } }, 0] }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            slug: 1,
                            brand: 1,
                            imageUrl: 1,
                            currency: 1,
                            category: 1,
                            isActive: 1,
                            totalStock: 1,
                            mainAttributeId: 1,
                            hasVariants: 1,
                            createdAt: 1,
                            updatedAt: 1
                        }
                    }
                ]);
                return res.json({
                    items,
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                });
            }
            catch (err) {
                console.error("Admin list products error:", err);
                return res.status(500).json({ message: "Failed to list products" });
            }
        };
        // ===== CREATE ======================================================
        this.create = async (req, res) => {
            try {
                const payload = req.body;
                if (payload.slug) {
                    payload.slug = String(payload.slug)
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)+/g, "");
                }
                if (typeof payload.category === "string" && mongoose_1.default.isValidObjectId(payload.category)) {
                    payload.category = new mongoose_1.default.Types.ObjectId(payload.category);
                }
                else if (payload.category === null) {
                    delete payload.category;
                }
                if (!Array.isArray(payload.variants) || payload.variants.length === 0) {
                    if (typeof payload.price !== "number") {
                        return res.status(400).json({ message: "Simple product requires 'price' (number)" });
                    }
                    if (typeof payload.stock !== "number") {
                        return res.status(400).json({ message: "Simple product requires 'stock' (number)" });
                    }
                    const simple = await product_model_1.Product.create(payload);
                    return res.status(201).json(simple);
                }
                const variants = payload.variants;
                if (!variants.every(v => typeof v.price === "number" && typeof v.stock === "number" && Array.isArray(v.values) && v.values.length > 0)) {
                    return res.status(400).json({ message: "Each variant must include price, stock, and non-empty values[]" });
                }
                for (const v of variants) {
                    for (const pair of v.values) {
                        if (!isHex24(pair.attributeId)) {
                            return res.status(400).json({ message: `Invalid attributeId '${pair.attributeId}' (expect 24-hex)` });
                        }
                        const ids = toArray(pair.attributesValueId);
                        if (ids.length === 0 || !ids.every(isHex24)) {
                            return res.status(400).json({ message: `attributesValueId must be 24-hex (string or non-empty string[]) for attributeId ${pair.attributeId}` });
                        }
                        if (typeof pair.stock !== "number" || pair.stock < 0) {
                            return res.status(400).json({ message: "values[].stock must be a non-negative number" });
                        }
                        if (pair.imageUrl && typeof pair.imageUrl !== "string") {
                            return res.status(400).json({ message: "values[].imageUrl must be a string if provided" });
                        }
                    }
                }
                const allAttrIds = Array.from(new Set(variants.flatMap(v => v.values.map(p => p.attributeId))));
                const attrs = await attribute_model_1.Attribute.find({ _id: { $in: allAttrIds } }, { values: 1 }).lean();
                const foundIds = new Set(attrs.map(a => String(a._id)));
                const missing = allAttrIds.filter(id => !foundIds.has(id));
                if (missing.length)
                    return res.status(400).json({ message: "Unknown attributeId(s)", attributeIds: missing });
                // value lookup for validation
                const valuesByAttr = new Map();
                for (const a of attrs) {
                    const set = new Set();
                    for (const v of a.values ?? [])
                        set.add(String(v._id));
                    valuesByAttr.set(String(a._id), set);
                }
                for (const v of variants) {
                    for (const pair of v.values) {
                        const allowed = valuesByAttr.get(pair.attributeId);
                        if (!allowed)
                            return res.status(400).json({ message: `Attribute not loaded: ${pair.attributeId}` });
                        const vids = toArray(pair.attributesValueId);
                        const bad = vids.filter(vid => !allowed.has(vid));
                        if (bad.length) {
                            return res.status(400).json({
                                message: "attributesValueId contains value(s) not defined on attribute",
                                attributeId: pair.attributeId,
                                missingValueIds: bad
                            });
                        }
                    }
                }
                let mainAttributeId = null;
                if (allAttrIds.length === 1) {
                    mainAttributeId = allAttrIds[0];
                }
                else {
                    if (!payload.mainAttributeId) {
                        return res.status(400).json({
                            message: "Multiple attributes detected across variants. Provide 'mainAttributeId' explicitly."
                        });
                    }
                    if (!isHex24(payload.mainAttributeId)) {
                        return res.status(400).json({ message: "mainAttributeId must be 24-hex" });
                    }
                    if (!allAttrIds.includes(payload.mainAttributeId)) {
                        return res.status(400).json({ message: "mainAttributeId must be used in every variant.values" });
                    }
                    mainAttributeId = payload.mainAttributeId;
                }
                for (const [idx, v] of variants.entries()) {
                    if (!v.values.some(p => p.attributeId === mainAttributeId)) {
                        return res.status(400).json({ message: `Variant at index ${idx} does not include a pair for mainAttributeId ${mainAttributeId}` });
                    }
                }
                const cleanedVariants = variants.map(v => ({
                    sku: v.sku,
                    price: v.price,
                    salePrice: v.salePrice,
                    stock: v.stock,
                    imageUrl: v.imageUrl ?? null,
                    barcode: v.barcode ?? null,
                    values: v.values.map(({ attributeId, attributesValueId, stock, imageUrl }) => ({
                        attributeId,
                        attributesValueId,
                        stock,
                        imageUrl: imageUrl ?? null
                    }))
                }));
                const toSave = {
                    ...payload,
                    mainAttributeId,
                    variants: cleanedVariants
                };
                const created = await product_model_1.Product.create(toSave);
                return res.status(201).json(created);
            }
            catch (err) {
                if (err?.code === 11000) {
                    return res.status(409).json({ message: "Duplicate slug or unique field" });
                }
                console.error("Admin create product error:", err);
                return res.status(500).json({ message: "Failed to create product", details: err?.message });
            }
        };
        // ===== GET ONE =======================
        this.getOne = async (req, res) => {
            try {
                const { id } = req.params;
                const product = await product_model_1.Product.findOne({ _id: id }).lean();
                if (!product)
                    return res.status(404).json({ message: "Product not found" });
                const attrIdSet = new Set();
                for (const v of product.variants ?? []) {
                    for (const p of v.values ?? v.attributesId ?? [])
                        attrIdSet.add(p.attributeId);
                }
                const attrIds = Array.from(attrIdSet);
                const attributes = attrIds.length ? await attribute_model_1.Attribute.find({ _id: { $in: attrIds } }).lean() : [];
                const attrById = new Map();
                const valByAttrId = new Map();
                for (const a of attributes) {
                    const id = String(a._id);
                    attrById.set(id, { _id: id, name: a.name, code: a.code, type: a.type, isActive: a.isActive });
                    const vmap = new Map();
                    for (const v of a.values ?? []) {
                        vmap.set(String(v._id), { _id: String(v._id), label: v.label, value: v.value, meta: v.meta ?? null });
                    }
                    valByAttrId.set(id, vmap);
                }
                const resolvedVariants = (product.variants ?? []).map((v) => {
                    const pairs = v.values ?? v.attributesId ?? [];
                    const attributesResolved = pairs.map((pair) => {
                        const attrInfo = attrById.get(pair.attributeId) ?? { _id: pair.attributeId, name: null, code: null, type: null, isActive: null };
                        const valueIds = toArray(pair.attributesValueId);
                        const values = valueIds.map((vid) => valByAttrId.get(pair.attributeId)?.get(vid) ?? { _id: vid, label: null, value: null, meta: null });
                        return {
                            attribute: attrInfo,
                            values,
                            stock: pair.stock ?? null,
                            imageUrl: pair.imageUrl ?? null,
                        };
                    });
                    return {
                        _id: String(v._id),
                        sku: v.sku ?? null,
                        price: v.price,
                        salePrice: v.salePrice ?? null,
                        stock: v.stock,
                        imageUrl: v.imageUrl ?? null,
                        barcode: v.barcode ?? null,
                        effectivePrice: v.effectivePrice ?? null,
                        discountPercent: v.discountPercent ?? 0,
                        attributesResolved,
                    };
                });
                const { variants: _dropRaw, ...flat } = product;
                return res.json({
                    ...flat,
                    variants: resolvedVariants
                });
            }
            catch (err) {
                console.error("Admin get product error:", err);
                return res.status(500).json({ message: "Failed to fetch product" });
            }
        };
        this.updateById = async (req, res) => {
            try {
                const body = req.body ?? {};
                const id = body.id;
                if (typeof id !== "string" || !mongoose_1.default.isValidObjectId(id)) {
                    return res.status(400).json({ message: "Valid 'id' (24-hex ObjectId) is required in the request body" });
                }
                const product = await product_model_1.Product.findById(id);
                if (!product)
                    return res.status(404).json({ message: "Product not found" });
                if (typeof body.mainBuild !== "undefined") {
                    return res.status(400).json({ message: "mainBuild is not supported." });
                }
                [
                    "title",
                    "description",
                    "brand",
                    "currency",
                    "price",
                    "salePrice",
                    "offerStart",
                    "offerEnd",
                    "stock",
                    "isActive",
                    "imageUrl",
                    "mainAttributeId",
                ].forEach((k) => {
                    if (typeof body[k] !== "undefined")
                        product[k] = body[k];
                });
                if (typeof body.slug !== "undefined" && String(body.slug).trim()) {
                    product.slug = String(body.slug)
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)+/g, "");
                }
                if (typeof body.category !== "undefined") {
                    if (body.category && mongoose_1.default.isValidObjectId(body.category)) {
                        product.category = new mongoose_1.default.Types.ObjectId(body.category);
                    }
                    else if (body.category === null) {
                        product.category = undefined;
                    }
                    else {
                        return res.status(400).json({ message: "category must be a 24-hex ObjectId or null" });
                    }
                }
                if (typeof body.variants !== "undefined") {
                    if (!Array.isArray(body.variants)) {
                        return res.status(400).json({ message: "variants must be an array when provided" });
                    }
                    product.variants = body.variants;
                }
                await product.save();
                return res.json({
                    message: "Product updated",
                    status: "ok",
                });
            }
            catch (err) {
                if (err?.code === 11000) {
                    return res.status(409).json({ message: "Duplicate slug or unique field" });
                }
                console.error("Admin update product (by id) error:", err);
                return res.status(500).json({ message: "Failed to update product", details: err?.message });
            }
        };
        this.bulkDelete = async (req, res) => {
            try {
                const { ids } = req.body;
                if (!Array.isArray(ids) || ids.length === 0) {
                    return res.status(400).json({
                        message: "Body must include non-empty 'ids' array of ObjectId strings",
                    });
                }
                const validIds = ids.filter((id) => /^[0-9a-fA-F]{24}$/.test(id));
                if (validIds.length === 0) {
                    return res.status(400).json({ message: "No valid 24-hex ids provided" });
                }
                const objectIds = validIds.map((id) => new mongoose_1.default.Types.ObjectId(id));
                const result = await product_model_1.Product.deleteMany({ _id: { $in: objectIds } });
                return res.json({
                    status: "ok",
                    message: `Deleted ${result.deletedCount ?? 0} products`,
                    deletedCount: result.deletedCount ?? 0,
                });
            }
            catch (err) {
                console.error("Admin bulk delete products error:", err);
                return res.status(500).json({ message: "Failed to delete products" });
            }
        };
    }
}
exports.AdminProductController = AdminProductController;
exports.default = AdminProductController;
