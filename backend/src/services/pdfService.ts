import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CalculationResult } from "./calculationService";

// Resolve data directory — works for both ts-node (src/) and compiled (dist/)
function getDataPath(filename: string): string {
  const srcPath = path.join(__dirname, "../data", filename);
  if (fs.existsSync(srcPath)) return srcPath;
  const rootPath = path.join(__dirname, "../../src/data", filename);
  if (fs.existsSync(rootPath)) return rootPath;
  return srcPath;
}

export interface StudentData {
  name: string;
  dob: string;
  standard: string;
  board: string;
  institute: string;
  contact: string;
  email: string;
  analysisNo: string;
  centerName: string;
  createdOn: string;
}

// pdf-lib StandardFonts use WinAnsiEncoding — strip characters outside that range
function sanitizeText(text: string): string {
  return (text || "")
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 0x20 && code <= 0x7e) return ch;
      if (code >= 0xa0 && code <= 0xff) return ch;
      return " ";
    })
    .join("");
}

export async function generateReport(
  studentData: StudentData,
  calc: CalculationResult
): Promise<Buffer> {
  const templatePath = getDataPath("Brainography_IKIGAI.pdf");
  const templateBytes = fs.readFileSync(templatePath);

  // Load template directly — draw on its pages (no overlay/merge needed)
  const pdfDoc = await PDFDocument.load(templateBytes, {
    ignoreEncryption: true,
  });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const totalPages = pdfDoc.getPageCount();

  // Helper: get page by 1-based number
  const pg = (n: number) => {
    const idx = n - 1;
    if (idx < 0 || idx >= totalPages) return null;
    return pdfDoc.getPage(idx);
  };

  // Helper: draw left-aligned text
  const drawLeft = (
    pageNum: number,
    x: number,
    y: number,
    text: string,
    fontSize: number
  ) => {
    const page = pg(pageNum);
    if (!page) return;
    page.drawText(sanitizeText(text), {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  };

  // Helper: draw bold centered text within a box
  const drawCentered = (
    pageNum: number,
    x: number,
    y: number,
    text: string,
    fontSize: number,
    boxWidth: number
  ) => {
    const page = pg(pageNum);
    if (!page) return;
    const s = sanitizeText(text);
    const textWidth = fontBold.widthOfTextAtSize(s, fontSize);
    const centeredX = x - textWidth / 2 + boxWidth / 2;
    page.drawText(s, {
      x: centeredX,
      y,
      size: fontSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  };

  const pctStr = (key: string): string => {
    const v = calc.percentagesDisplay[key];
    if (v === "X") return "X";
    return `${v}%`;
  };

  // Helper: draw a vector checkmark (tick) centered at (cx, cy)
  // Uses two drawLine calls — avoids the WinAnsiEncoding limitation of pdf-lib StandardFonts
  const drawCheckmark = (pageNum: number, cx: number, cy: number, size: number) => {
    const page = pg(pageNum);
    if (!page) return;
    const t = Math.max(2.5, size * 0.18);
    // Short left leg: from upper-left down to the pivot (bottom of the V)
    page.drawLine({
      start: { x: cx - size * 0.44, y: cy + size * 0.08 },
      end:   { x: cx - size * 0.06, y: cy - size * 0.40 },
      thickness: t,
      color: rgb(0, 0, 0),
    });
    // Long right leg: from pivot up to upper-right
    page.drawLine({
      start: { x: cx - size * 0.06, y: cy - size * 0.40 },
      end:   { x: cx + size * 0.52, y: cy + size * 0.52 },
      thickness: t,
      color: rgb(0, 0, 0),
    });
  };

  // ── PAGE 3: Personal Details ──────────────────────────────────
  drawLeft(3, 210, 722, studentData.analysisNo, 14);
  drawLeft(3, 210, 682, studentData.name, 14);
  drawLeft(3, 210, 647, studentData.dob, 14);
  drawLeft(3, 210, 610, studentData.standard, 14);
  drawLeft(3, 210, 574, studentData.board, 14);
  drawLeft(3, 210, 538, studentData.institute, 14);
  drawLeft(3, 210, 501, studentData.contact, 14);
  drawLeft(3, 210, 464, studentData.email, 14);
  drawLeft(3, 210, 429, studentData.centerName, 14);
  drawLeft(3, 210, 386, studentData.createdOn, 14);

  // ── PAGE 8: Finger Percentages ────────────────────────────────
  drawCentered(8, 180, 645, pctStr("R1"), 14, 80);
  drawCentered(8, 180, 518, pctStr("R2"), 14, 80);
  drawCentered(8, 180, 393, pctStr("R3"), 14, 80);
  drawCentered(8, 180, 270, pctStr("R4"), 14, 80);
  drawCentered(8, 180, 145, pctStr("R5"), 14, 80);
  drawCentered(8, 334, 645, pctStr("L1"), 14, 80);
  drawCentered(8, 334, 518, pctStr("L2"), 14, 80);
  drawCentered(8, 334, 393, pctStr("L3"), 14, 80);
  drawCentered(8, 334, 270, pctStr("L4"), 14, 80);
  drawCentered(8, 334, 145, pctStr("L5"), 14, 80);

  // ── PAGE 9 & 10: Thinking Pattern ────────────────────────────
  drawCentered(9, 69, 495, calc.leftBrainResult, 14, 100);
  drawCentered(10, 69, 495, calc.rightBrainResult, 14, 100);

  // ── PAGE 11: Work Ability Quotients ───────────────────────────
  drawCentered(11, 405, 672, calc.workAbilityResults.iq || "", 14, 80);
  drawCentered(11, 405, 567, calc.workAbilityResults.eq || "", 14, 80);
  drawCentered(11, 405, 462, calc.workAbilityResults.cq || "", 14, 80);
  drawCentered(11, 405, 353, calc.workAbilityResults.vq || "", 14, 80);
  drawCentered(11, 405, 247, calc.workAbilityResults.aq || "", 14, 80);

  // ── PAGES 12-16: Individual Work Ability ──────────────────────
  drawCentered(12, 409, 701, calc.workAbilityResults.iq || "", 14, 80);
  drawCentered(13, 411, 701, calc.workAbilityResults.eq || "", 14, 80);
  drawCentered(14, 408, 701, calc.workAbilityResults.cq || "", 14, 80);
  drawCentered(15, 408, 701, calc.workAbilityResults.vq || "", 14, 80);
  drawCentered(16, 408, 701, calc.workAbilityResults.aq || "", 14, 80);

  // ── PAGE 17: Achievement Styles ───────────────────────────────
  drawCentered(17, 439, 646, calc.achievementStyles.follower || "", 14, 80);
  drawCentered(17, 439, 515, calc.achievementStyles.experimental || "", 14, 80);
  drawCentered(17, 439, 383, calc.achievementStyles.different || "", 14, 80);
  drawCentered(17, 439, 255, calc.achievementStyles.thoughtful || "", 14, 80);

  // ── PAGES 18-21: Individual Achievement ───────────────────────
  drawCentered(18, 119, 587, calc.achievementStyles.follower || "", 14, 80);
  drawCentered(19, 122, 553, calc.achievementStyles.experimental || "", 14, 80);
  drawCentered(20, 122, 587, calc.achievementStyles.different || "", 14, 80);
  drawCentered(21, 122, 553, calc.achievementStyles.thoughtful || "", 14, 80);

  // ── PAGE 22: Learning Styles ──────────────────────────────────
  drawCentered(22, 180, 627, calc.audResult, 14, 80);
  drawCentered(22, 441, 523, calc.visResult, 14, 80);
  drawCentered(22, 175, 415, calc.kinResult, 14, 80);

  // ── PAGE 23: Personality Checkmarks ───────────────────────────
  if (calc.personalityFeatures) {
    for (const [featureName, subFeatures] of Object.entries(
      calc.personalityFeatures
    )) {
      if (!subFeatures || !Object.values(subFeatures).some(Boolean)) continue;
      const upper = featureName.toUpperCase();
      // cx = x + boxWidth/2 from old drawCentered calls (x=81/205/329/453, boxWidth=40)
      if (upper.includes("DOMINANT"))    drawCheckmark(23, 101, 573, 16);
      if (upper.includes("INFLUENTIAL")) drawCheckmark(23, 225, 573, 16);
      if (upper.includes("STEADY"))      drawCheckmark(23, 349, 573, 16);
      if (upper.includes("CONSCIOUS"))   drawCheckmark(23, 473, 573, 16);
    }
  }

  // ── PAGE 28: Career Recommendations ───────────────────────────
  const drawCareerList = (
    pageNum: number,
    x: number,
    startY: number,
    careers: string[],
    maxItems: number,
    lineHeight: number
  ) => {
    const page = pg(pageNum);
    if (!page) return;
    let y = startY;
    let count = 0;
    for (const career of careers) {
      if (count >= maxItems) break;
      page.drawText(`- ${sanitizeText(career)}`, {
        x,
        y,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
      count++;
    }
  };

  drawCareerList(28, 50, 689, calc.careerRecommendations.pdf_highly_recommended, 20, 15);
  drawCareerList(28, 325, 691, calc.careerRecommendations.pdf_recommended, 20, 15);

  // ── Save modified template directly ───────────────────────────
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
