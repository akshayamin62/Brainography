export enum USER_ROLE {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
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
  details?: AdminDetail | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  _id: string;
  adminId: User | string;
  name: string;
  parentName: string;
  mobile: string;
  email: string;
  university: string;
  standard: string;
  address: string;
  dob: string;
  gender: string;
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

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token?: string;
  };
}

