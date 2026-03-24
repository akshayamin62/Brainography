import mongoose, { Document, Schema } from "mongoose";

export interface IAdminDetail extends Document {
  userId: mongoose.Types.ObjectId;
  firstName: string;
  middleName?: string;
  lastName: string;
  countryCode: string;
  companyName?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const adminDetailSchema = new Schema<IAdminDetail>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    firstName: { type: String, required: true },
    middleName: { type: String, default: "" },
    lastName: { type: String, required: true },
    countryCode: { type: String, default: "+91" },
    companyName: { type: String, default: "" },
    address: { type: String, default: "" },
    country: { type: String, default: "" },
    state: { type: String, default: "" },
    city: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model<IAdminDetail>("AdminDetail", adminDetailSchema);
