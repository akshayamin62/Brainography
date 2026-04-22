// eslint-disable-next-line @typescript-eslint/no-var-requires
const { jsPDF } = require("jspdf");
import * as fs from "fs";
import * as path from "path";
import InvoiceCounter from "../models/InvoiceCounter";

/** Returns the financial year string for a given date, e.g. "2026-27" */
function getFinancialYear(date: Date): string {
  const month = date.getMonth(); // 0-indexed; 3 = April
  const year = date.getFullYear();
  if (month >= 3) {
    // April (3) onwards → FY starts this year
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    // Jan–Mar → FY started previous year
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

/**
 * Atomically increments the invoice counter for the financial year derived
 * from `date` and returns the formatted invoice number.
 * Format: ADMIT/IM000001/2026-27
 */
export async function generateInvoiceNumber(date: Date): Promise<string> {
  const fy = getFinancialYear(date);
  const doc = await InvoiceCounter.findOneAndUpdate(
    { financialYear: fy },
    { $inc: { counter: 1 } },
    { new: true, upsert: true }
  );
  const seq = String(doc!.counter).padStart(6, "0");
  return `ADMIT/IM${seq}/${fy}`;
}

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
  /** Pre-generated invoice number. If omitted, a new one is auto-generated. */
  invoiceNo?: string;
}

function numberToWords(amount: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = convert(rupees) || "Zero";
  result += " Rupees";
  if (paise > 0) result += " and " + convert(paise) + " Paise";
  return result + " Only";
}

let _logoBase64: string | null = null;
function getLogoBase64(): string {
  if (_logoBase64 === null) {
    const logoPath = path.resolve(__dirname, "../../../frontend/public/downloads/kareerstudio_logo.png");
    if (fs.existsSync(logoPath)) {
      _logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
    } else {
      _logoBase64 = "";
    }
  }
  return _logoBase64;
}

let _signBase64: string | null = null;
function getSignBase64(): string {
  if (_signBase64 === null) {
    const signPath = path.resolve(__dirname, "../../../frontend/public/downloads/sign.png");
    if (fs.existsSync(signPath)) {
      _signBase64 = `data:image/png;base64,${fs.readFileSync(signPath).toString("base64")}`;
    } else {
      _signBase64 = "";
    }
  }
  return _signBase64;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const { student, payment, gstEnabled } = data;

  const doc = new jsPDF("p", "mm", "a4");
  const W = 210;
  const margin = 15;
  const contentW = W - 2 * margin;

  const date = new Date(payment.paidAt);
  const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const invoiceNo = data.invoiceNo ?? await generateInvoiceNumber(date);

  const isGujarat = ["gj", "gujarat"].includes((student.state || "").toLowerCase().trim());
  const discountAmount = 0;

  let baseAmount: number;
  let gstAmount: number;
  let cgst = 0, sgst = 0, igst = 0;

  if (gstEnabled) {
    baseAmount = Math.round((payment.amount / 1.18) * 100) / 100;
    gstAmount = Math.round((payment.amount - baseAmount) * 100) / 100;
    if (isGujarat) {
      cgst = Math.round((gstAmount / 2) * 100) / 100;
      sgst = Math.round((gstAmount - cgst) * 100) / 100;
    } else {
      igst = gstAmount;
    }
  } else {
    baseAmount = payment.amount;
    gstAmount = 0;
  }

  const subTotal = baseAmount - discountAmount;
  const finalAmount = payment.amount;

  const navy: [number, number, number] = [26, 35, 75];
  const darkGray: [number, number, number] = [55, 65, 81];
  const lightGray: [number, number, number] = [156, 163, 175];
  const accentBlue: [number, number, number] = [37, 99, 235];

  let y = margin;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, 42, "F");
  doc.setDrawColor(navy[0], navy[1], navy[2]);
  doc.setLineWidth(0.5);
  doc.line(0, 42, W, 42);

  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE CUM RECEIPT", margin, 20);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(`Invoice No: ${invoiceNo}`, margin, 30);
  doc.text(`Date: ${dateStr}`, margin, 36);

  const logoBase64 = getLogoBase64();
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", W - margin - 50, 12, 50, 22); } catch (_e) { /* skip */ }
  } else {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text("IMPACT", W - margin - 30, 24);
  }

  y = 52;

  const colW = contentW / 2 - 5;
  const billBoxH = 58;

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, colW, billBoxH, 3, 3, "F");
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", margin + 6, y + 8);

  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFontSize(10);
  doc.text(student.name, margin + 6, y + 16);

  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  let billToY = y + 23;
  const cityState = [student.city, student.state, student.country].filter(Boolean).join(", ");
  if (cityState) { doc.text(cityState, margin + 6, billToY); billToY += 6; }
  if (student.email) { doc.text(student.email, margin + 6, billToY); billToY += 6; }
  if (student.mobile) { doc.text(`+91 ${student.mobile}`, margin + 6, billToY); }

  const billByX = margin + colW + 10;
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(billByX, y, colW, billBoxH, 3, 3, "F");
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("BILL BY", billByX + 6, y + 8);

  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFontSize(10);
  doc.text("ADMITra", billByX + 6, y + 16);

  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Suite #303, Rajshree Center, Opp. Hotel Effotel,", billByX + 6, y + 23);
  doc.text("Near Kalaghoda, Sayajigunj, Vadodara - 390020", billByX + 6, y + 29);
  doc.text("Gujarat, India", billByX + 6, y + 35);
  doc.text("hello@admitra.io | +91 7777 07 1711", billByX + 6, y + 41);
  doc.text("PAN: AAZFK7452R", billByX + 6, y + 47);
  doc.text("GST No: ASDFGHJKL", billByX + 6, y + 53);

  y += billBoxH + 8;

  const col1W = 70;
  const col2W = 20;
  const col3W = 30;
  const col4W = 30;
  const rowH = 10;

  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(margin, y, contentW, rowH, "F");
  doc.setDrawColor(navy[0], navy[1], navy[2]);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW, rowH, "S");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  let cx = margin;
  doc.text("Item", cx + 4, y + 7);
  cx += col1W;
  doc.line(cx, y, cx, y + rowH);
  doc.text("Unit", cx + 4, y + 7);
  cx += col2W;
  doc.line(cx, y, cx, y + rowH);
  doc.text("Rate", cx + 4, y + 7);
  cx += col3W;
  doc.line(cx, y, cx, y + rowH);
  doc.text("Discount", cx + 4, y + 7);
  cx += col4W;
  doc.line(cx, y, cx, y + rowH);
  doc.text("Sub Total", cx + 4, y + 7);

  y += rowH;

  doc.setFillColor(250, 251, 252);
  doc.rect(margin, y, contentW, rowH, "F");
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, contentW, rowH, "S");

  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  cx = margin;
  doc.text("IMPACT - Brainography Assessment", cx + 4, y + 7);
  cx += col1W;
  doc.line(cx, y, cx, y + rowH);
  doc.text("1", cx + 8, y + 7);
  cx += col2W;
  doc.line(cx, y, cx, y + rowH);
  doc.text(`${baseAmount.toFixed(2)}`, cx + 4, y + 7);
  cx += col3W;
  doc.line(cx, y, cx, y + rowH);
  doc.text(`${discountAmount.toFixed(2)}`, cx + 4, y + 7);
  cx += col4W;
  doc.line(cx, y, cx, y + rowH);
  doc.text(`${subTotal.toFixed(2)}`, cx + 4, y + 7);

  y += rowH + 3;

  const totalsTableX = margin + contentW - 80;
  const totalsTableW = 80;
  const labelW = 50;
  const valW = totalsTableW - labelW;
  const totRowH = 8;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  doc.rect(totalsTableX, y, labelW, totRowH, "S");
  doc.rect(totalsTableX + labelW, y, valW, totRowH, "S");
  doc.text("Total Discount", totalsTableX + 3, y + 5.5);
  doc.text(`${discountAmount.toFixed(2)}`, totalsTableX + totalsTableW - 3, y + 5.5, { align: "right" });
  y += totRowH;

  doc.rect(totalsTableX, y, labelW, totRowH, "S");
  doc.rect(totalsTableX + labelW, y, valW, totRowH, "S");
  doc.text("Sub Total Amount", totalsTableX + 3, y + 5.5);
  doc.text(`${subTotal.toFixed(2)}`, totalsTableX + totalsTableW - 3, y + 5.5, { align: "right" });
  y += totRowH;

  if (gstEnabled) {
    if (isGujarat) {
      doc.rect(totalsTableX, y, labelW, totRowH, "S");
      doc.rect(totalsTableX + labelW, y, valW, totRowH, "S");
      doc.text("CGST (9%)", totalsTableX + 3, y + 5.5);
      doc.text(`${cgst.toFixed(2)}`, totalsTableX + totalsTableW - 3, y + 5.5, { align: "right" });
      y += totRowH;
      doc.rect(totalsTableX, y, labelW, totRowH, "S");
      doc.rect(totalsTableX + labelW, y, valW, totRowH, "S");
      doc.text("SGST (9%)", totalsTableX + 3, y + 5.5);
      doc.text(`${sgst.toFixed(2)}`, totalsTableX + totalsTableW - 3, y + 5.5, { align: "right" });
      y += totRowH;
    } else {
      doc.rect(totalsTableX, y, labelW, totRowH, "S");
      doc.rect(totalsTableX + labelW, y, valW, totRowH, "S");
      doc.text("IGST (18%)", totalsTableX + 3, y + 5.5);
      doc.text(`${igst.toFixed(2)}`, totalsTableX + totalsTableW - 3, y + 5.5, { align: "right" });
      y += totRowH;
    }
  } else {
    for (const label of ["IGST", "CGST", "SGST"]) {
      doc.rect(totalsTableX, y, labelW, totRowH, "S");
      doc.rect(totalsTableX + labelW, y, valW, totRowH, "S");
      doc.text(label, totalsTableX + 3, y + 5.5);
      doc.text("0.00", totalsTableX + totalsTableW - 3, y + 5.5, { align: "right" });
      y += totRowH;
    }
  }

  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(totalsTableX, y, totalsTableW, totRowH + 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Total Amount", totalsTableX + 3, y + 6.5);
  doc.text(`${finalAmount.toFixed(2)}`, totalsTableX + totalsTableW - 3, y + 6.5, { align: "right" });

  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(numberToWords(finalAmount), margin, y + 6.5);

  y += totRowH + 12;

  if (gstEnabled) {
    const cols = isGujarat ? 3 : 2;
    const gstColW = contentW / cols;
    const gstRowH = 9;

    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, contentW, gstRowH, "FD");
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Taxable Value", margin + 4, y + 6);
    doc.line(margin + gstColW, y, margin + gstColW, y + gstRowH);
    if (isGujarat) {
      doc.text("CGST (9%)", margin + gstColW + 4, y + 6);
      doc.line(margin + gstColW * 2, y, margin + gstColW * 2, y + gstRowH);
      doc.text("SGST (9%)", margin + gstColW * 2 + 4, y + 6);
    } else {
      doc.text("IGST (18%)", margin + gstColW + 4, y + 6);
    }
    y += gstRowH;

    doc.rect(margin, y, contentW, gstRowH, "S");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(`${subTotal.toFixed(2)}`, margin + 4, y + 6);
    doc.line(margin + gstColW, y, margin + gstColW, y + gstRowH);
    if (isGujarat) {
      doc.text(`${cgst.toFixed(2)}`, margin + gstColW + 4, y + 6);
      doc.line(margin + gstColW * 2, y, margin + gstColW * 2, y + gstRowH);
      doc.text(`${sgst.toFixed(2)}`, margin + gstColW * 2 + 4, y + 6);
    } else {
      doc.text(`${igst.toFixed(2)}`, margin + gstColW + 4, y + 6);
    }
    y += gstRowH + 6;
  }

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, contentW, 32, 3, 3, "F");
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT DETAILS", margin + 6, y + 8);

  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Beneficiary: KAREER Studio", margin + 6, y + 15);
  doc.text("Axis Bank Current Account Number: 923020061117712", margin + 6, y + 21);
  doc.text("SAVLI BRANCH, VADODARA  |  IFSC: UTIB0004011  |  SWIFT: AXISINBB013", margin + 6, y + 27);

  doc.text("UPI ID: 7777071711@okbizaxis", margin + contentW - 65, y + 15);
  doc.text("UPI Number: +91 7777 07 1711", margin + contentW - 65, y + 21);

  y += 40;

  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS & CONDITIONS", margin, y);
  y += 6;
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("1. Cheques subject to realization.", margin, y);
  y += 5;
  doc.text("2. Fees once paid are not refundable.", margin, y);

  const footerY = 285;
  const sigX = W - margin;

  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("For ADMITra", sigX, footerY - 22, { align: "right" });

  const signBase64 = getSignBase64();
  if (signBase64) {
    try { doc.addImage(signBase64, "PNG", sigX - 25, footerY - 20, 28, 10); } catch (_e) { /* skip */ }
  }

  doc.text("Makrand Bhatt", sigX, footerY - 10, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text("Authorized Signatory", sigX, footerY - 5, { align: "right" });

  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, footerY, W, 12, "F");
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Reg. Office: ADMITra, Suite #303, Rajshree Center, Opp. Hotel Effotel, Near Kalaghoda, Sayajigunj, Vadodara - 390020  |  hello@admitra.io  |  +91 7777 07 1711",
    W / 2, footerY + 7,
    { align: "center" }
  );

  return Buffer.from(doc.output("arraybuffer") as ArrayBuffer);
}
