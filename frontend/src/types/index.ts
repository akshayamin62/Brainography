export enum USER_ROLE {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  COUNSELOR = 'COUNSELOR',
}

export interface AdminDetail {
  _id?: string;
  userId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  countryCode: string;
  companyName?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
}

export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: USER_ROLE | string;
  isVerified: boolean;
  isActive?: boolean;
  studentCount?: number;
  details?: AdminDetail | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  _id: string;
  adminId: User | string;
  counselorId?: User | string;
  reportNo?: string;
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
  // Legacy
  name: string;
  parentName?: string;
  university?: string;
  standard?: string;
  document?: { _id: string; filename: string; originalName: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FingerprintData {
  id: string;
  fingerPosition: string;
  fingerType: string;
  filename: string;
  fileExists: boolean;
  createdAt: string;
}

export interface StudentDoc {
  _id: string;
  studentId: string;
  uploaderId: { name: string } | string;
  filename: string;
  originalName: string;
  createdAt: string;
}

export interface PaymentStatus {
  _id?: string;
  status: 'none' | 'pending' | 'paid' | 'failed' | 'expired';
  amount?: number;
  currency?: string;
  initiatedBy?: { name: string; email: string; role: string };
  initiatedByRole?: string;
  linkGeneratedAt?: string;
  linkExpiresAt?: string;
  paidAt?: string;
  razorpayPaymentId?: string;
  canGenerateLink: boolean;
  isPending?: boolean;
  remainingSeconds?: number;
}

export interface PaymentLog {
  _id: string;
  studentId: { firstName: string; lastName: string; email: string; reportNo: string; name: string } | string;
  initiatedBy: { name: string; email: string; role: string } | string;
  initiatedByRole: string;
  amount: number;
  currency: string;
  status: string;
  linkGeneratedAt: string;
  linkExpiresAt: string;
  paidAt?: string;
  razorpayPaymentId?: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token?: string;
  };
}

