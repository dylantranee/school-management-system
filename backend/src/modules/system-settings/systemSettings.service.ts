import prisma from '../../config/db';
import { ApiError } from '../../middlewares/errorHandler';

export const systemSettingsService = {
  /**
   * List all configurations sorted by key.
   */
  async listSettings() {
    return prisma.system_Setting.findMany({
      orderBy: { key: 'asc' }
    });
  },

  /**
   * Update a system configuration setting value with specific validation rules.
   */
  async updateSetting(key: string, value: any, updatedBy: string) {
    const existing = await prisma.system_Setting.findUnique({
      where: { key }
    });

    if (!existing) {
      throw new ApiError(404, `System setting key "${key}" not found.`);
    }

    // Key-specific validation (Scenario 2 and Scenario 5)
    if (key === 'MAX_FAILED_LOGIN_ATTEMPTS') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || num > 20) {
        throw new ApiError(400, 'MAX_FAILED_LOGIN_ATTEMPTS must be a positive integer between 1 and 20.');
      }
    } else if (key === 'LOGIN_LOCKOUT_DURATION_MINUTES') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1) {
        throw new ApiError(400, 'LOGIN_LOCKOUT_DURATION_MINUTES must be a positive integer.');
      }
    } else if (key === 'MAX_SUBJECT_CREDITS') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1) {
        throw new ApiError(400, 'MAX_SUBJECT_CREDITS must be a positive integer.');
      }
    } else if (key === 'MAX_ROOM_CAPACITY') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1) {
        throw new ApiError(400, 'MAX_ROOM_CAPACITY must be a positive integer.');
      }
    } else if (key === 'CURRENT_SEMESTER') {
      if (value !== '1' && value !== '2' && value !== '3') {
        throw new ApiError(400, "CURRENT_SEMESTER must be '1', '2', or '3'.");
      }
    } else if (key === 'CURRENT_ACADEMIC_YEAR') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1900 || num > 2100) {
        throw new ApiError(400, 'CURRENT_ACADEMIC_YEAR must be a valid year between 1900 and 2100.');
      }
    } else if (key === 'MAX_SEMESTER_CREDITS') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1) {
        throw new ApiError(400, 'MAX_SEMESTER_CREDITS must be a positive integer.');
      }
    } else if (key === 'REGISTRATION_START_DATE' || key === 'REGISTRATION_END_DATE') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value) || isNaN(Date.parse(value))) {
        throw new ApiError(400, `${key} must be a valid date in YYYY-MM-DD format.`);
      }
      if (key === 'REGISTRATION_START_DATE') {
        const endSetting = await prisma.system_Setting.findUnique({ where: { key: 'REGISTRATION_END_DATE' } });
        if (endSetting && new Date(value) > new Date(endSetting.value)) {
          throw new ApiError(400, 'REGISTRATION_START_DATE cannot be after REGISTRATION_END_DATE.');
        }
      } else {
        const startSetting = await prisma.system_Setting.findUnique({ where: { key: 'REGISTRATION_START_DATE' } });
        if (startSetting && new Date(startSetting.value) > new Date(value)) {
          throw new ApiError(400, 'REGISTRATION_END_DATE cannot be before REGISTRATION_START_DATE.');
        }
      }
    }

    return prisma.system_Setting.update({
      where: { key },
      data: {
        value: String(value),
        updated_by: updatedBy,
        updated_at: new Date()
      }
    });
  }
};
