import mongoose, { Document, Schema } from "mongoose";

export interface IAppSettings extends Document {
  baseAmount: number;
  gstEnabled: boolean;
}

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    baseAmount: { type: Number, default: 100 },
    gstEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IAppSettings>("AppSettings", AppSettingsSchema);
