import mongoose, { Document, Schema } from "mongoose";

export interface IFingerprintAnalysis extends Document {
  studentId: mongoose.Types.ObjectId;
  fingerPosition: string; // L1-L5, R1-R5
  pattern: string;
  ridgeCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const fingerprintAnalysisSchema = new Schema<IFingerprintAnalysis>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    fingerPosition: { type: String, required: true },
    pattern: { type: String, required: true },
    ridgeCount: { type: Number, required: true, min: 0, max: 24 },
  },
  { timestamps: true }
);

fingerprintAnalysisSchema.index(
  { studentId: 1, fingerPosition: 1 },
  { unique: true }
);

export default mongoose.model<IFingerprintAnalysis>(
  "FingerprintAnalysis",
  fingerprintAnalysisSchema
);
