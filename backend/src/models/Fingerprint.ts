import mongoose, { Document, Schema } from "mongoose";

export interface IFingerprint extends Document {
  studentId: mongoose.Types.ObjectId;
  fingerPosition: string; // L1, L2, L3, L4, L5, R1, R2, R3, R4, R5
  fingerType: string; // left, right
  imagePath: string; // stored filename
  createdAt?: Date;
  updatedAt?: Date;
}

const fingerprintSchema = new Schema<IFingerprint>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    fingerPosition: { type: String, required: true },
    fingerType: { type: String, required: true },
    imagePath: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IFingerprint>("Fingerprint", fingerprintSchema);
