import mongoose, { Document, Schema } from "mongoose";
import { USER_ROLE } from "../types/roles";

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  role: USER_ROLE;
  isVerified: boolean;
  isActive: boolean;
  otp?: string;
  otpExpires?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: undefined,
    },

    role: {
      type: String,
      enum: Object.values(USER_ROLE),
      required: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    otp: {
      type: String,
      default: undefined,
    },
    otpExpires: {
      type: Date,
      default: undefined,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", userSchema);
