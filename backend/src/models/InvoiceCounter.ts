import mongoose, { Document, Schema } from "mongoose";

/**
 * Tracks the sequential invoice counter per financial year.
 * financialYear format: "2026-27"
 * counter: current count (starts at 1)
 */
export interface IInvoiceCounter extends Document {
  financialYear: string;
  counter: number;
}

const InvoiceCounterSchema = new Schema<IInvoiceCounter>({
  financialYear: { type: String, required: true, unique: true },
  counter: { type: Number, default: 0 },
});

export default mongoose.model<IInvoiceCounter>("InvoiceCounter", InvoiceCounterSchema);
