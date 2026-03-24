import mongoose, { Document, Schema } from "mongoose";

export interface IStudent extends Document {
  adminId: mongoose.Types.ObjectId;
  name: string;
  parentName: string;
  mobile: string;
  email: string;
  university: string;
  standard: string;
  address: string;
  dob: string;
  gender: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    parentName: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    university: { type: String, required: true },
    standard: { type: String, required: true },
    address: { type: String, required: true },
    dob: { type: String, required: true },
    gender: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IStudent>("Student", studentSchema);
