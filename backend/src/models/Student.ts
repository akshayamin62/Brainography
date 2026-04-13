import mongoose, { Document, Schema } from "mongoose";

export interface IStudent extends Document {
  adminId: mongoose.Types.ObjectId;
  counselorId?: mongoose.Types.ObjectId;
  reportNo: string;
  // Personal
  firstName: string;
  middleName?: string;
  lastName: string;
  dob: string;
  gender: string;
  countryCode: string;
  mobile: string;
  email: string;
  // Academic
  educationLevel: string;
  board?: string;
  boardFullName?: string;
  institutionName: string;
  institutionCountry: string;
  fieldOfStudy?: string;
  mediumOfTeaching: string;
  // Address
  address: string;
  country: string;
  state: string;
  city: string;
  // Family
  siblings: number;
  familyStructure: string;
  motherActivity: string;
  fatherActivity: string;
  // Additional
  hobbies?: string;
  games: string;
  otherGames?: string;
  // Legacy (kept for backward compat)
  name: string;
  parentName?: string;
  university?: string;
  standard?: string;
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
    counselorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
    },
    reportNo: { type: String, unique: true, required: true },
    // Personal
    firstName: { type: String, required: true },
    middleName: { type: String, default: "" },
    lastName: { type: String, required: true },
    dob: { type: String, required: true },
    gender: { type: String, required: true },
    countryCode: { type: String, default: "+91" },
    mobile: { type: String, required: true },
    email: { type: String, required: true, index: true },
    // Academic
    educationLevel: { type: String, required: true },
    board: { type: String, default: "" },
    boardFullName: { type: String, default: "" },
    institutionName: { type: String, required: true },
    institutionCountry: { type: String, required: true },
    fieldOfStudy: { type: String, default: "" },
    mediumOfTeaching: { type: String, required: true },
    // Address
    address: { type: String, required: true },
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    // Family
    siblings: { type: Number, default: 0 },
    familyStructure: { type: String, required: true },
    motherActivity: { type: String, required: true },
    fatherActivity: { type: String, required: true },
    // Additional
    hobbies: { type: String, default: "" },
    games: { type: String, required: true },
    otherGames: { type: String, default: "" },
    // Legacy
    name: { type: String, required: true },
    parentName: { type: String, default: "" },
    university: { type: String, default: "" },
    standard: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model<IStudent>("Student", studentSchema);
