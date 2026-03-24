import mongoose, { Document, Schema } from "mongoose";

export interface IStudentDocument extends Document {
  studentId: mongoose.Types.ObjectId;
  uploaderId: mongoose.Types.ObjectId;
  filename: string; // stored name (uuid)
  originalName: string; // name seen by user
  createdAt?: Date;
  updatedAt?: Date;
}

const studentDocumentSchema = new Schema<IStudentDocument>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    uploaderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IStudentDocument>("StudentDocument", studentDocumentSchema);
