import prisma from '../config/db';

export const SETTING_DEFAULTS = {
  CURRENT_SEMESTER: '1',
  CURRENT_ACADEMIC_YEAR: '2026',
  MAX_ROOM_CAPACITY: '250',
  MAX_SUBJECT_CREDITS: '10',
  MAX_SEMESTER_CREDITS: '20',
  MAX_FAILED_LOGIN_ATTEMPTS: '5',
  LOGIN_LOCKOUT_DURATION_MINUTES: '15',
  REGISTRATION_START_DATE: '2026-05-01',
  REGISTRATION_END_DATE: '2026-06-30',
  PAYMENT_WEBHOOK_SECRET: 'super-secret-key',
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

/**
 * Dynamically retrieves a configuration value from the System_Setting table.
 * Falls back to a provided default value if the key does not exist or if database lookup fails.
 */
export async function getSettingValue(key: string, defaultValue: string): Promise<string> {
  try {
    const setting = await prisma.system_Setting.findUnique({
      where: { key }
    });
    return setting ? setting.value : defaultValue;
  } catch (error) {
    console.error(`❌ [Settings Util] Error fetching system setting "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Dynamically retrieves a system setting value using type-safe keys and centralized defaults.
 */
export async function getSetting(key: SettingKey): Promise<string> {
  return getSettingValue(key, SETTING_DEFAULTS[key]);
}

