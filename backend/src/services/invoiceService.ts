import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

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
}

// Sanitize text to WinAnsiEncoding (supported by pdf-lib StandardFonts)
function san(text: string): string {
  return (text || "")
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 0x20 && code <= 0x7e) return ch;
      return " ";
    })
    .join("");
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees) + " Rupees";
  if (paise > 0) result += " and " + convert(paise) + " Paise";
  return result + " Only";
}

// Helper to draw a filled rectangle
function fillRect(page: PDFPage, x: number, y: number, w: number, h: number, r: number, g: number, b: number) {
  page.drawRectangle({ x, y, width: w, height: h, color: rgb(r / 255, g / 255, b / 255) });
}

// Helper to draw a stroked rectangle
function strokeRect(page: PDFPage, x: number, y: number, w: number, h: number, r: number, g: number, b: number, thickness = 0.5) {
  page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(r / 255, g / 255, b / 255), borderWidth: thickness });
}

// Helper to draw a line
function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, thickness = 0.5) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color: rgb(r / 255, g / 255, b / 255), thickness });
}

// Helper to draw text
function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, r: number, g: number, b: number) {
  page.drawText(san(text), { x, y, size, font, color: rgb(r / 255, g / 255, b / 255) });
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const { student, payment } = data;

  // A4: 595.28 x 841.89 pt
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const margin = 42; // ~15mm
  const contentW = width - 2 * margin;

  const paidAt = new Date(payment.paidAt);
  const dateStr = paidAt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const invoiceNo = `ADM/${payment._id.slice(-6).toUpperCase()}/${paidAt.getFullYear()}-${String(paidAt.getFullYear() + 1).slice(-2)}`;
  const amountFormatted = `Rs. ${payment.amount.toFixed(2)}`;

  // pdf-lib Y is from bottom; we track current Y from top
  let curY = height; // will subtract as we go

  // ── HEADER ──────────────────────────────────────────────────────────────────
  const headerH = 60;
  fillRect(page, 0, height - headerH, width, headerH, 255, 255, 255);
  // Bottom border of header
  drawLine(page, 0, height - headerH, width, height - headerH, 26, 35, 75, 1);

  // Title
  drawText(page, "INVOICE CUM RECEIPT", margin, height - 28, fontBold, 18, 26, 35, 75);
  drawText(page, `Invoice No: ${invoiceNo}`, margin, height - 42, fontNormal, 9, 55, 65, 81);
  drawText(page, `Date: ${dateStr}`, margin, height - 52, fontNormal, 9, 55, 65, 81);

  // Company name on right
  drawText(page, "IMPACT", width - margin - 60, height - 32, fontBold, 18, 26, 35, 75);
  drawText(page, "Potential Intelligence Assessment", width - margin - 60, height - 43, fontNormal, 7, 55, 65, 81);

  curY = height - headerH - 12;

  // ── BILL TO / BILL BY ────────────────────────────────────────────────────────
  const colW = (contentW / 2) - 5;
  const boxH = 80;

  // Bill To box
  fillRect(page, margin, curY - boxH, colW, boxH, 245, 247, 250);
  strokeRect(page, margin, curY - boxH, colW, boxH, 200, 200, 200, 0.3);
  drawText(page, "BILL TO", margin + 6, curY - 12, fontBold, 8, 37, 99, 235);
  drawText(page, san(student.name), margin + 6, curY - 24, fontBold, 10, 26, 35, 75);

  let billToY = curY - 36;
  const cityState = [student.city, student.state, student.country].filter(Boolean).join(", ");
  if (cityState) { drawText(page, san(cityState), margin + 6, billToY, fontNormal, 8, 55, 65, 81); billToY -= 11; }
  drawText(page, san(student.email), margin + 6, billToY, fontNormal, 8, 55, 65, 81); billToY -= 11;
  if (student.mobile) {
    const phone = `${student.countryCode || "+91"} ${student.mobile}`.replace(/[^\d+ ]/g, "");
    drawText(page, phone, margin + 6, billToY, fontNormal, 8, 55, 65, 81);
  }

  // Bill By box
  const billByX = margin + colW + 10;
  fillRect(page, billByX, curY - boxH, colW, boxH, 245, 247, 250);
  strokeRect(page, billByX, curY - boxH, colW, boxH, 200, 200, 200, 0.3);
  drawText(page, "BILL BY", billByX + 6, curY - 12, fontBold, 8, 37, 99, 235);
  drawText(page, "ADMITra", billByX + 6, curY - 24, fontBold, 10, 26, 35, 75);
  drawText(page, "Suite #303, Rajshree Center, Opp. Hotel Effotel,", billByX + 6, curY - 36, fontNormal, 7.5, 55, 65, 81);
  drawText(page, "Near Kalaghoda, Sayajigunj, Vadodara - 390020", billByX + 6, curY - 46, fontNormal, 7.5, 55, 65, 81);
  drawText(page, "Gujarat, India", billByX + 6, curY - 56, fontNormal, 7.5, 55, 65, 81);
  drawText(page, "hello@admitra.io | +91 7777 07 1711", billByX + 6, curY - 66, fontNormal, 7.5, 55, 65, 81);
  drawText(page, "PAN: AAZFK7452R", billByX + 6, curY - 76, fontNormal, 7.5, 55, 65, 81);

  curY -= (boxH + 14);

  // ── ITEMS TABLE ──────────────────────────────────────────────────────────────
  const col1W = 160; // Item
  const col2W = 45;  // Unit
  const col3W = 70;  // Rate
  const rowH = 22;

  // Header row
  fillRect(page, margin, curY - rowH, contentW, rowH, 26, 35, 75);
  drawText(page, "Item", margin + 6, curY - 15, fontBold, 9, 255, 255, 255);
  let cx = margin + col1W;
  drawLine(page, cx, curY, cx, curY - rowH, 255, 255, 255, 0.3);
  drawText(page, "Unit", cx + 6, curY - 15, fontBold, 9, 255, 255, 255);
  cx += col2W;
  drawLine(page, cx, curY, cx, curY - rowH, 255, 255, 255, 0.3);
  drawText(page, "Rate (Rs.)", cx + 6, curY - 15, fontBold, 9, 255, 255, 255);
  cx += col3W;
  drawLine(page, cx, curY, cx, curY - rowH, 255, 255, 255, 0.3);
  drawText(page, "Sub Total (Rs.)", cx + 6, curY - 15, fontBold, 9, 255, 255, 255);
  curY -= rowH;

  // Data row
  fillRect(page, margin, curY - rowH, contentW, rowH, 250, 251, 252);
  strokeRect(page, margin, curY - rowH, contentW, rowH, 200, 200, 200, 0.2);
  drawText(page, "IMPACT - Fingerprint Intelligence Assessment", margin + 6, curY - 15, fontNormal, 9, 26, 35, 75);
  cx = margin + col1W;
  drawLine(page, cx, curY, cx, curY - rowH, 200, 200, 200, 0.2);
  drawText(page, "1", cx + 16, curY - 15, fontNormal, 9, 26, 35, 75);
  cx += col2W;
  drawLine(page, cx, curY, cx, curY - rowH, 200, 200, 200, 0.2);
  drawText(page, payment.amount.toFixed(2), cx + 6, curY - 15, fontNormal, 9, 26, 35, 75);
  cx += col3W;
  drawLine(page, cx, curY, cx, curY - rowH, 200, 200, 200, 0.2);
  drawText(page, payment.amount.toFixed(2), cx + 6, curY - 15, fontNormal, 9, 26, 35, 75);
  curY -= (rowH + 6);

  // ── TOTALS TABLE ─────────────────────────────────────────────────────────────
  const totW = 200;
  const totX = margin + contentW - totW;
  const lblW = 120;
  const valW2 = totW - lblW;
  const totRowH = 18;

  // Sub Total row
  strokeRect(page, totX, curY - totRowH, lblW, totRowH, 200, 200, 200, 0.3);
  strokeRect(page, totX + lblW, curY - totRowH, valW2, totRowH, 200, 200, 200, 0.3);
  drawText(page, "Sub Total Amount", totX + 4, curY - 13, fontNormal, 8.5, 55, 65, 81);
  drawText(page, payment.amount.toFixed(2), totX + totW - 6 - fontNormal.widthOfTextAtSize(payment.amount.toFixed(2), 8.5), curY - 13, fontNormal, 8.5, 55, 65, 81);
  curY -= totRowH;

  // GST row (not applicable — 0)
  strokeRect(page, totX, curY - totRowH, lblW, totRowH, 200, 200, 200, 0.3);
  strokeRect(page, totX + lblW, curY - totRowH, valW2, totRowH, 200, 200, 200, 0.3);
  drawText(page, "Tax / GST", totX + 4, curY - 13, fontNormal, 8.5, 55, 65, 81);
  drawText(page, "0.00", totX + totW - 6 - fontNormal.widthOfTextAtSize("0.00", 8.5), curY - 13, fontNormal, 8.5, 55, 65, 81);
  curY -= totRowH;

  // Total Amount row (dark)
  const totalRowH = 22;
  fillRect(page, totX, curY - totalRowH, totW, totalRowH, 26, 35, 75);
  drawText(page, "Total Amount", totX + 4, curY - 15, fontBold, 9.5, 255, 255, 255);
  drawText(page, amountFormatted, totX + totW - 6 - fontBold.widthOfTextAtSize(amountFormatted, 9.5), curY - 15, fontBold, 9.5, 255, 255, 255);

  // Amount in words (left side same row)
  const amtWords = numberToWords(payment.amount);
  drawText(page, `${amtWords}`, margin, curY - 15, fontNormal, 7.5, 100, 116, 139);

  curY -= (totalRowH + 14);

  // ── PAYMENT DETAILS ──────────────────────────────────────────────────────────
  fillRect(page, margin, curY - 50, contentW, 50, 245, 247, 250);
  strokeRect(page, margin, curY - 50, contentW, 50, 200, 200, 200, 0.3);
  drawText(page, "PAYMENT DETAILS", margin + 6, curY - 12, fontBold, 8, 37, 99, 235);
  drawText(page, "Beneficiary: ADMITra", margin + 6, curY - 24, fontNormal, 7.5, 55, 65, 81);
  drawText(page, "Axis Bank Current Account | IFSC: UTIB0004011", margin + 6, curY - 34, fontNormal, 7.5, 55, 65, 81);
  drawText(page, "UPI ID: 7777071711@okbizaxis", margin + 6, curY - 44, fontNormal, 7.5, 55, 65, 81);

  if (payment.razorpayPaymentId) {
    drawText(page, `Razorpay Payment ID: ${payment.razorpayPaymentId}`, margin + contentW / 2, curY - 24, fontNormal, 7.5, 55, 65, 81);
    drawText(page, `Payment Date: ${dateStr}`, margin + contentW / 2, curY - 34, fontNormal, 7.5, 55, 65, 81);
    drawText(page, `Status: PAID`, margin + contentW / 2, curY - 44, fontBold, 7.5, 16, 185, 129);
  }

  curY -= 60;

  // ── TERMS & CONDITIONS ────────────────────────────────────────────────────────
  drawText(page, "TERMS & CONDITIONS", margin, curY - 10, fontBold, 8, 26, 35, 75);
  drawText(page, "1. Fees once paid are not refundable.", margin, curY - 22, fontNormal, 7, 55, 65, 81);
  drawText(page, "2. This invoice is system-generated and valid without a physical signature.", margin, curY - 32, fontNormal, 7, 55, 65, 81);

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  const footerH = 24;
  fillRect(page, 0, 0, width, footerH, 26, 35, 75);
  const footerText = "ADMITra | Suite #303, Rajshree Center, Vadodara - 390020 | hello@admitra.io | +91 7777 07 1711";
  const ftWidth = fontNormal.widthOfTextAtSize(footerText, 7);
  drawText(page, footerText, (width - ftWidth) / 2, 8, fontNormal, 7, 200, 200, 200);

  // ── SIGNATURE ────────────────────────────────────────────────────────────────
  const sigY = 38;
  drawText(page, "For ADMITra", width - margin - fontBold.widthOfTextAtSize("For ADMITra", 9), sigY + 12, fontBold, 9, 26, 35, 75);
  drawText(page, "Authorized Signatory", width - margin - fontNormal.widthOfTextAtSize("Authorized Signatory", 7), sigY, fontNormal, 7, 100, 116, 139);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
