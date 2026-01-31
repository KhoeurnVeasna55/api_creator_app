import { Schema, model, Document ,Types  } from "mongoose";
import bcrypt from "bcryptjs";

interface IUserAddress {
  _id: Types.ObjectId;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  otp?: string;
  otpExpiry?: Date;
  isVerified: boolean;
  role: "user" | "admin";
  googleId?: string;
  facebookId?: string;

  // ✅ NEW
  addresses: IUserAddress[];

  comparePassword(candidatePassword: string): Promise<boolean>;
}

const AddressSchema = new Schema<IUserAddress>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    phone: { type: String },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    googleId: { type: String },
    facebookId: { type: String },

    // ✅ NEW: addresses array
    addresses: {
      type: [AddressSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// ===== Password Hashing =====
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  if (!this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ===== Compare Password Method =====
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return await bcrypt.compare(candidatePassword, this.password!);
};

export const User = model<IUser>("User", UserSchema);
