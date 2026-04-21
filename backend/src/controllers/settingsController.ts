import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import AppSettings from "../models/AppSettings";

// Helper to get or create the singleton settings document
export const getAppSettings = async (): Promise<{ baseAmount: number; gstEnabled: boolean }> => {
  let settings = await AppSettings.findOne();
  if (!settings) {
    settings = await AppSettings.create({ baseAmount: 100, gstEnabled: false });
  }
  return { baseAmount: settings.baseAmount, gstEnabled: settings.gstEnabled };
};

// GET /api/settings
export const getSettings = async (_req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const settings = await getAppSettings();
    return res.json({ success: true, data: settings });
  } catch (err) {
    console.error("Get settings error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/settings
export const updateSettings = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { baseAmount, gstEnabled } = req.body;

    if (baseAmount !== undefined && (typeof baseAmount !== "number" || baseAmount <= 0)) {
      return res.status(400).json({ success: false, message: "baseAmount must be a positive number" });
    }

    const update: Partial<{ baseAmount: number; gstEnabled: boolean }> = {};
    if (baseAmount !== undefined) update.baseAmount = Number(baseAmount);
    if (gstEnabled !== undefined) update.gstEnabled = Boolean(gstEnabled);

    let settings = await AppSettings.findOne();
    if (!settings) {
      settings = await AppSettings.create({ baseAmount: 100, gstEnabled: false, ...update });
    } else {
      Object.assign(settings, update);
      await settings.save();
    }

    return res.json({ success: true, data: { baseAmount: settings.baseAmount, gstEnabled: settings.gstEnabled } });
  } catch (err) {
    console.error("Update settings error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
