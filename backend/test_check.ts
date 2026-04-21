// eslint-disable-next-line @typescript-eslint/no-var-requires
const { jsPDF } = require('jspdf');
const fs_1 = require('fs');
const path_1 = require('path');

export interface InvoiceStudentData {
  name: string;
  email: string;
  mobile?: string;
  countryCode?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface InvoicePaymentData {
  _id: string;
  amount: number;
  currency: string;
  razorpayPaymentId?: string;
  paidAt: Date;
}

export interface InvoiceData {
  student: InvoiceStudentData;
  payment: InvoicePaymentData;
  gstEnabled: boolean;
}
