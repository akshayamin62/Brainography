import fs from "fs";
import path from "path";

// Resolve data directory — works for both ts-node (src/) and compiled (dist/)
function getDataPath(filename: string): string {
  const srcPath = path.join(__dirname, "../data", filename);
  if (fs.existsSync(srcPath)) return srcPath;
  const rootPath = path.join(__dirname, "../../src/data", filename);
  if (fs.existsSync(rootPath)) return rootPath;
  return srcPath;
}

type PercentageValue = number | "X";
type Percentages = Record<string, PercentageValue>;
type PercentagesDisplay = Record<string, number | "X">;
type RcValues = Record<string, number>;

export interface AnalysisInput {
  patterns: Record<string, string>; // L1..R5 → pattern short code
  ridgeCounts: Record<string, number>; // L1..R5 → RC value
}

export interface CalculationResult {
  rcValues: RcValues;
  totalRc: number;
  percentages: Percentages;
  percentagesDisplay: PercentagesDisplay;
  leftBrainResult: string;
  rightBrainResult: string;
  achievementStyles: Record<string, string>;
  kinResult: string;
  audResult: string;
  visResult: string;
  workAbilityResults: Record<string, string>;
  personalityFeatures: Record<string, Record<string, boolean>>;
  careerRecommendations: {
    highly_recommended: string[];
    recommended: string[];
    pdf_highly_recommended: string[];
    pdf_recommended: string[];
  };
}

const FINGERS = ["L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5"];

function roundTo(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

// ── Percentage Calculation ──────────────────────────────────────
function calculatePercentages(rcValues: RcValues, totalRc: number) {
  const percentages: Percentages = {};
  const percentagesDisplay: PercentagesDisplay = {};

  for (const finger of FINGERS) {
    const rc = rcValues[finger] || 0;
    if (rc === 0) {
      percentages[finger] = "X";
      percentagesDisplay[finger] = "X";
    } else if (totalRc > 0) {
      const internal = roundTo((rc / totalRc) * 100, 3);
      percentages[finger] = internal;
      percentagesDisplay[finger] = roundTo(internal, 2);
    } else {
      percentages[finger] = "X";
      percentagesDisplay[finger] = "X";
    }
  }
  return { percentages, percentagesDisplay };
}

// ── Brain Analysis ──────────────────────────────────────────────
function formatBrainResult(numericSum: number, xCount: number): string {
  const rounded = roundTo(numericSum, 2);
  if (xCount > 0) {
    if (rounded > 0) return `${rounded}+${xCount}X`;
    return `${xCount}X`;
  }
  return `${rounded}`;
}

function calculateBrainAnalysis(percentages: Percentages) {
  // Left brain = R1-R5 percentages
  let aLeft = 0,
    bLeft = 0;
  for (const f of ["R1", "R2", "R3", "R4", "R5"]) {
    const val = percentages[f];
    if (val === "X") bLeft++;
    else aLeft += val;
  }
  const leftBrainResult = formatBrainResult(aLeft, bLeft);

  // Right brain = L1-L5 percentages
  let aRight = 0,
    bRight = 0;
  for (const f of ["L1", "L2", "L3", "L4", "L5"]) {
    const val = percentages[f];
    if (val === "X") bRight++;
    else aRight += val;
  }
  const rightBrainResult = formatBrainResult(aRight, bRight);

  return { leftBrainResult, rightBrainResult };
}

// ── Achievement Styles ──────────────────────────────────────────
function calculateAchievementStyles(
  patterns: Record<string, string>
): Record<string, string> {
  const allPatterns: string[] = [];
  for (const f of FINGERS) {
    const p = (patterns[f] || "").toUpperCase();
    if (p) allPatterns.push(p);
  }

  const follower = allPatterns.filter((p) => p === "UL" || p === "FL").length;
  const experimental = allPatterns.filter((p) => p.startsWith("W")).length;
  const different = allPatterns.filter((p) => p === "RL").length;
  const thoughtful = allPatterns.filter((p) => p.startsWith("A")).length;

  return {
    follower: `${follower * 10}%`,
    experimental: `${experimental * 10}%`,
    different: `${different * 10}%`,
    thoughtful: `${thoughtful * 10}%`,
  };
}

// ── Learning & Communication Style ──────────────────────────────
function calculateLearningCommunicationStyle(percentages: Percentages) {
  // TP = sum of L3,L4,L5,R3,R4,R5
  const tpFingers = ["L3", "L4", "L5", "R3", "R4", "R5"];
  let tp = 0;
  for (const f of tpFingers) {
    const val = percentages[f];
    if (val !== "X") tp += val;
  }
  tp = roundTo(tp, 3);

  function calcStyle(fingers: string[]): string {
    let a = 0,
      b = 0;
    for (const f of fingers) {
      const val = percentages[f];
      if (val === "X") b++;
      else a += val;
    }
    if (tp > 0) a = roundTo((a / tp) * 100, 2);
    else a = 0;

    if (b > 0) {
      if (a > 0) return `${a}+${b}X`;
      return `${b}X`;
    }
    return `${a}`;
  }

  const kinResult = calcStyle(["L3", "R3"]);
  const audResult = calcStyle(["L4", "R4"]);
  const visResult = calcStyle(["L5", "R5"]);

  return { kinResult, audResult, visResult };
}

// ── Work Ability Style ──────────────────────────────────────────
function calculateWorkAbilityStyle(
  percentages: Percentages
): Record<string, string> {
  const results: Record<string, string> = {};

  const quotients: [string, string[]][] = [
    ["iq", ["R2", "R4"]],
    ["aq", ["R5", "L3"]],
    ["cq", ["L2", "L4"]],
    ["eq", ["R1", "L1"]],
    ["vq", ["R3", "L5"]],
  ];

  for (const [key, fingers] of quotients) {
    let a = 0,
      b = 0;
    for (const f of fingers) {
      const val = percentages[f];
      if (val === "X") b++;
      else a += val;
    }
    a = roundTo(a, 2);
    if (b > 0) {
      if (a > 0) results[key] = `${a}+${b}X`;
      else results[key] = `${b}X`;
    } else {
      results[key] = `${a}`;
    }
  }

  return results;
}

// ── Personality Features ────────────────────────────────────────
function calculatePersonalityFeatures(
  patterns: Record<string, string>
): Record<string, Record<string, boolean>> {
  const personality: Record<string, Record<string, boolean>> = {};
  const r1 = (patterns["R1"] || "").toUpperCase();
  const l1 = (patterns["L1"] || "").toUpperCase();

  const steady: Record<string, boolean> = {};
  const dominant: Record<string, boolean> = {};
  const influential: Record<string, boolean> = {};
  const conscious: Record<string, boolean> = {};

  // Steady features
  if (l1 === "UL" && (r1 === "UL" || r1 === "FL")) steady["Assertive"] = true;
  if (l1 === "UL" && r1 === "RL") steady["Different"] = true;
  if (l1 === "UL" && r1.startsWith("A")) steady["Unpredictable"] = true;
  if (l1 === "UL" && ["WS", "WT", "WX", "WE"].includes(r1))
    steady["Aggressive"] = true;
  if (l1 === "UL" && ["WC", "WD", "WI"].includes(r1)) steady["Smart"] = true;
  if (l1 === "UL" && r1 === "WL") steady["Wizard"] = true;
  if (l1 === "UL" && r1 === "WP") steady["Genius"] = true;
  if (
    (l1 === "RL" || l1 === "FL") &&
    ["RL", "UL", "WI", "WS"].includes(r1)
  )
    steady["Assertive"] = true;
  if (
    (l1 === "RL" || l1 === "FL") &&
    ["AS", "AT", "AR"].includes(r1)
  )
    steady["Different"] = true;
  if ((l1 === "RL" || l1 === "FL") && r1 === "FL")
    steady["Unpredictable"] = true;
  if (
    (l1 === "RL" || l1 === "FL") &&
    ["WD", "WE", "WL"].includes(r1)
  )
    steady["Aggressive"] = true;
  if ((l1 === "RL" || l1 === "FL") && (r1 === "AU" || r1 === "WP"))
    steady["Smart"] = true;
  if (
    (l1 === "RL" || l1 === "FL") &&
    (r1 === "WT" || r1 === "WX")
  )
    steady["Wizard"] = true;
  if ((l1 === "RL" || l1 === "FL") && r1 === "WC")
    steady["Genius"] = true;

  // Dominant features
  if ((l1 === "WS" || l1 === "WX") && (r1 === "UL" || r1 === "FL"))
    dominant["Assertive"] = true;
  if (l1 === "WX" && r1 === "WS") dominant["Assertive"] = true;
  if (
    ["WS", "WT", "WX", "WE"].includes(l1) &&
    r1 === "RL"
  )
    dominant["Different"] = true;
  if (["WS", "WT", "WX", "WE"].includes(l1) && r1.startsWith("A"))
    dominant["Unpredictable"] = true;
  if (
    ["WS", "WT", "WE"].includes(l1) &&
    ["WS", "WT", "WX", "WE"].includes(r1)
  )
    dominant["Aggressive"] = true;
  if (l1 === "WX" && ["WT", "WX", "WE"].includes(r1))
    dominant["Aggressive"] = true;
  if (
    ["WS", "WT", "WX", "WE"].includes(l1) &&
    ["WC", "WD", "WI"].includes(r1)
  )
    dominant["Smart"] = true;
  if (["WS", "WT", "WX", "WE"].includes(l1) && r1 === "WL")
    dominant["Wizard"] = true;
  if (["WS", "WT", "WX", "WE"].includes(l1) && r1 === "WP")
    dominant["Genius"] = true;
  if ((l1 === "WT" || l1 === "WE") && r1 === "UL")
    dominant["Assertive"] = true;
  if ((l1 === "WT" || l1 === "WE") && r1 === "FL")
    dominant["Unpredictable"] = true;

  // Influential features
  const infCondition =
    l1.startsWith("A") || r1 === "WP" || r1 === "WL";
  if (infCondition && (r1 === "UL" || r1 === "FL"))
    influential["Assertive"] = true;
  if (infCondition && r1 === "RL") influential["Different"] = true;
  if (infCondition && r1.startsWith("A")) influential["Unpredictable"] = true;
  if (infCondition && ["WS", "WT", "WX", "WE"].includes(r1))
    influential["Aggressive"] = true;
  if (infCondition && ["WC", "WD", "WI"].includes(r1))
    influential["Smart"] = true;
  if (infCondition && r1 === "WL") influential["Wizard"] = true;
  if (infCondition && r1 === "WP") influential["Genius"] = true;

  // Conscious features
  if (["WD", "WC", "WI"].includes(l1) && ["UL", "WS", "FL"].includes(r1))
    conscious["Assertive"] = true;
  if (["WD", "WC", "WI"].includes(l1) && r1 === "RL")
    conscious["Different"] = true;
  if (["WD", "WC", "WI"].includes(l1) && r1.startsWith("A"))
    conscious["Unpredictable"] = true;
  if (["WD", "WC", "WI"].includes(l1) && ["WT", "WX", "WE"].includes(r1))
    conscious["Aggressive"] = true;
  if (["WD", "WC", "WI"].includes(l1) && ["WC", "WD", "WI"].includes(r1))
    conscious["Smart"] = true;
  if (["WD", "WC", "WI"].includes(l1) && r1 === "WL")
    conscious["Wizard"] = true;
  if (["WD", "WC", "WI"].includes(l1) && r1 === "WP")
    conscious["Genius"] = true;

  if (Object.keys(steady).length) personality["Steady"] = steady;
  if (Object.keys(dominant).length) personality["Dominant"] = dominant;
  if (Object.keys(influential).length) personality["Influential"] = influential;
  if (Object.keys(conscious).length) personality["Conscious"] = conscious;

  return personality;
}

// ── Career Recommendations ──────────────────────────────────────
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  const chars = content.split("");

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === '"') {
      if (inQuotes && chars[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      rows.length === 0
        ? rows.push([current])
        : rows[rows.length - 1].push(current);
      current = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && chars[i + 1] === "\n") i++;
      if (rows.length === 0) {
        rows.push([current]);
      } else {
        rows[rows.length - 1].push(current);
      }
      current = "";
      rows.push([]);
    } else {
      current += ch;
    }
  }
  // push last field
  if (current || rows.length > 0) {
    if (rows.length === 0) rows.push([]);
    rows[rows.length - 1].push(current);
  }
  // remove empty trailing rows
  while (rows.length && rows[rows.length - 1].every((c) => c === "")) rows.pop();
  return rows;
}

function consolidateCareerRecommendations(
  highlyRecommended: string[],
  recommended: string[]
) {
  try {
    const csvPath = getDataPath("Global_Career_Categories_Final.csv");
    const content = fs.readFileSync(csvPath, "utf-8");
    const rows = parseCSV(content);

    // Build domain → categories map (skip header)
    const domainToCategories: Record<string, Set<string>> = {};
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 2) continue;
      const domain = row[0].trim();
      const category = row[1].trim();
      if (!domain || !category) continue;
      if (!domainToCategories[domain]) domainToCategories[domain] = new Set();
      domainToCategories[domain].add(category);
    }

    const hrSet = new Set(highlyRecommended);
    const recSet = new Set(recommended);
    const hrDomains: string[] = [];
    const recDomains: string[] = [];

    for (const [domain, categories] of Object.entries(domainToCategories)) {
      const catArr = Array.from(categories);
      if (catArr.every((c) => hrSet.has(c))) {
        hrDomains.push(domain);
        catArr.forEach((c) => hrSet.delete(c));
      } else if (catArr.every((c) => recSet.has(c))) {
        recDomains.push(domain);
        catArr.forEach((c) => recSet.delete(c));
      }
    }

    return {
      highly_recommended: [...hrDomains, ...Array.from(hrSet)],
      recommended: [...recDomains, ...Array.from(recSet)],
    };
  } catch (e) {
    console.error("Error in domain consolidation:", e);
    return { highly_recommended: highlyRecommended, recommended };
  }
}

function calculateCareerRecommendations(
  percentagesDisplay: PercentagesDisplay,
  _rcValues: RcValues,
  totalRc: number
) {
  const fingerMapping: Record<string, string> = {
    R1: "Management",
    R2: "Logic",
    R3: "Body Balance",
    R4: "Communication",
    R5: "Observation",
    L1: "Leadership",
    L2: "Visual",
    L3: "Body Movement",
    L4: "Rhythm",
    L5: "Physical Senses",
  };

  function convertToNumeric(value: number | "X"): number {
    if (value === "X") {
      return totalRc > 0 ? roundTo((24 / totalRc) * 100, 2) : 0;
    }
    return typeof value === "number" ? value : 0;
  }

  try {
    const csvPath = getDataPath("Global_Career_Categories_Temp.csv");
    const content = fs.readFileSync(csvPath, "utf-8");
    const rows = parseCSV(content);

    const careerScores: { name: string; score: number }[] = [];

    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const careerName = (row[0] || "").trim();
      if (!careerName || careerName.toLowerCase() === "nan") continue;

      const requiredTraits: string[] = [];
      for (let j = 1; j < row.length; j++) {
        const trait = (row[j] || "").trim();
        if (trait) requiredTraits.push(trait);
      }

      const traitValues: number[] = [];
      for (const trait of requiredTraits) {
        let fingerKey: string | null = null;
        for (const [k, v] of Object.entries(fingerMapping)) {
          if (v.toLowerCase() === trait.toLowerCase()) {
            fingerKey = k;
            break;
          }
        }
        if (fingerKey && fingerKey in percentagesDisplay) {
          traitValues.push(convertToNumeric(percentagesDisplay[fingerKey]));
        } else {
          traitValues.push(0);
        }
      }

      if (!traitValues.length) continue;
      const avg = traitValues.reduce((s, v) => s + v, 0) / traitValues.length;
      careerScores.push({ name: careerName, score: avg });
    }

    // Sort by score descending
    careerScores.sort((a, b) => b.score - a.score);

    const highlyRecommended = careerScores
      .filter((c) => c.score >= 10)
      .map((c) => c.name);
    const recommended = careerScores
      .filter((c) => c.score >= 9 && c.score < 10)
      .map((c) => c.name);

    const consolidated = consolidateCareerRecommendations(
      highlyRecommended,
      recommended
    );

    return {
      highly_recommended: consolidated.highly_recommended,
      recommended: consolidated.recommended,
      pdf_highly_recommended: consolidated.highly_recommended.slice(0, 20),
      pdf_recommended: consolidated.recommended.slice(0, 20),
    };
  } catch (e) {
    console.error("Error loading career CSV:", e);
    return {
      highly_recommended: [],
      recommended: [],
      pdf_highly_recommended: [],
      pdf_recommended: [],
    };
  }
}

// ── Main Calculation Entry ──────────────────────────────────────
export function runCalculations(input: AnalysisInput): CalculationResult {
  const rcValues: RcValues = {};
  let totalRc = 0;
  for (const f of FINGERS) {
    const rc = input.ridgeCounts[f] || 0;
    rcValues[f] = rc;
    totalRc += rc;
  }

  const { percentages, percentagesDisplay } = calculatePercentages(
    rcValues,
    totalRc
  );
  const { leftBrainResult, rightBrainResult } =
    calculateBrainAnalysis(percentages);
  const achievementStyles = calculateAchievementStyles(input.patterns);
  const { kinResult, audResult, visResult } =
    calculateLearningCommunicationStyle(percentages);
  const workAbilityResults = calculateWorkAbilityStyle(percentages);
  const personalityFeatures = calculatePersonalityFeatures(input.patterns);
  const careerRecommendations = calculateCareerRecommendations(
    percentagesDisplay,
    rcValues,
    totalRc
  );

  return {
    rcValues,
    totalRc,
    percentages,
    percentagesDisplay,
    leftBrainResult,
    rightBrainResult,
    achievementStyles,
    kinResult,
    audResult,
    visResult,
    workAbilityResults,
    personalityFeatures,
    careerRecommendations,
  };
}
