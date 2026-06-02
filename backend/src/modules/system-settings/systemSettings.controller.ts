import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { systemSettingsService } from './systemSettings.service';

export const listSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await systemSettingsService.listSettings();
  res.status(200).json(settings);
});

export const updateSetting = asyncHandler(async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;
  const updatedBy = req.user?.userId || 'SYSTEM';

  const updatedSetting = await systemSettingsService.updateSetting(key, value, updatedBy);

  res.status(200).json({
    message: 'System setting updated successfully',
    setting: updatedSetting
  });
});
