import prisma from '../config/db';
import crypto from 'crypto';

/**
 * Reusable audit log helper for tracking administrative/critical actions.
 */
export const writeAuditLog = async (
  userId: string,
  targetId: string | null,
  action: string,
  oldValue: any,
  newValue: any,
  ipAddress: string
) => {
  await prisma.audit_Log.create({
    data: {
      id: crypto.randomUUID(),
      user_id: userId,
      target_id: targetId,
      action,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      ip_address: ipAddress
    }
  });
};
