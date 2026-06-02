import prisma from '../../config/db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ApiError } from '../../middlewares/errorHandler';
import { signTokenWithExpiry } from '../../utils/jwt';
import { writeAuditLog } from '../../utils/audit';

// Helper to hash token for secure DB storage (Scenario 5)
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const usersService = {
  /**
   * Create a new user account.
   */
  async createUser(actorId: string, clientIp: string, data: { email: string; role: 'Admin' | 'Staff' | 'Student' }) {
    const { email, role } = data;
    const trimmedEmail = email.toLowerCase().trim();

    // Case-Insensitive Duplicate Prevention
    const existingUser = await prisma.users.findUnique({
      where: { email: trimmedEmail }
    });

    if (existingUser) {
      throw new ApiError(409, 'A user with this email already exists.');
    }

    // Generate onboarding activation token (valid for 3 days)
    const activationToken = signTokenWithExpiry({ email: trimmedEmail, action: 'activate' }, '3d');
    const tokenHash = hashToken(activationToken);
    const activationTokenExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 3 days

    // Place a secure random placeholder for password_hash until user activates
    const tempPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email: trimmedEmail,
        password_hash: passwordHash,
        role,
        is_active: false, // Mark as pending_activation
        activation_token_hash: tokenHash,
        activation_token_expires: activationTokenExpires
      }
    });

    await writeAuditLog(actorId, newUser.id, 'CREATE_USER', null, { email: trimmedEmail, role }, clientIp);

    console.log(`✉️ [Mail Service Mock] Send onboarding activation link to ${newUser.email}: http://localhost:5173/activate?token=${activationToken}`);

    const { password_hash, activation_token_hash, activation_token_expires, reset_token_hash, reset_token_expires, ...userWithoutPassword } = newUser;

    return {
      user: userWithoutPassword,
      activationToken
    };
  },

  /**
   * List paginated users with filtering.
   */
  async listUsers(query: { page?: number; limit?: number; search?: string; role?: string; is_active?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const search = query.search || '';
    const role = query.role || '';
    const is_active = query.is_active || '';

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.email = {
        contains: search.toLowerCase().trim()
      };
    }

    if (role) {
      where.role = role;
    }

    if (is_active !== '') {
      where.is_active = is_active === 'true';
    }

    const [users, totalCount] = await Promise.all([
      prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.users.count({ where })
    ]);

    const cleanUsers = users.map(({ password_hash, activation_token_hash, activation_token_expires, reset_token_hash, reset_token_expires, ...u }) => u);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      users: cleanUsers,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Deactivate user profile.
   */
  async deactivateUser(id: string, actorId: string, clientIp: string) {
    if (actorId === id) {
      throw new ApiError(400, 'Self-deactivation is not permitted.');
    }

    const user = await prisma.users.findUnique({
      where: { id }
    });

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    await prisma.users.update({
      where: { id },
      data: { is_active: false }
    });

    await writeAuditLog(actorId, id, 'DEACTIVATE_USER', { is_active: user.is_active }, { is_active: false }, clientIp);
  },

  /**
   * Reactivate user profile.
   */
  async reactivateUser(id: string, actorId: string, clientIp: string) {
    if (actorId === id) {
      throw new ApiError(400, 'Self-reactivation is not permitted.');
    }

    const user = await prisma.users.findUnique({
      where: { id }
    });

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    await prisma.users.update({
      where: { id },
      data: { is_active: true }
    });

    await writeAuditLog(actorId, id, 'REACTIVATE_USER', { is_active: user.is_active }, { is_active: true }, clientIp);
  },

  /**
   * Reset locked-out state.
   */
  async unlockUser(id: string, actorId: string, clientIp: string) {
    const user = await prisma.users.findUnique({
      where: { id }
    });

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    await prisma.users.update({
      where: { id },
      data: {
        failed_login_attempts: 0,
        locked_until: null
      }
    });

    await writeAuditLog(actorId, id, 'UNLOCK_USER', { failed_attempts: user.failed_login_attempts, locked_until: user.locked_until }, { failed_attempts: 0, locked_until: null }, clientIp);
  },

  /**
   * Re-generate activation link.
   */
  async resendActivationLink(id: string, actorId: string, clientIp: string) {
    const user = await prisma.users.findUnique({
      where: { id }
    });

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    if (user.is_active === true) {
      throw new ApiError(400, 'This account is already active.');
    }

    const activationToken = signTokenWithExpiry({ email: user.email, action: 'activate' }, '3d');
    const tokenHash = hashToken(activationToken);
    const activationTokenExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 3 days

    await prisma.users.update({
      where: { id },
      data: {
        activation_token_hash: tokenHash,
        activation_token_expires: activationTokenExpires
      }
    });

    await writeAuditLog(actorId, id, 'RESEND_ACTIVATION_LINK', null, { token_expires: activationTokenExpires }, clientIp);

    console.log(`✉️ [Mail Service Mock] Resend onboarding activation link to ${user.email}: http://localhost:5173/activate?token=${activationToken}`);

    return { activationToken };
  },

  /**
   * Change user security role.
   */
  async updateUserRole(id: string, role: string, actorId: string, clientIp: string) {
    if (actorId === id) {
      throw new ApiError(400, 'Self-demotion is not permitted.');
    }

    const user = await prisma.users.findUnique({
      where: { id }
    });

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    if (user.role !== role) {
      // Check if linked to Staff or Student profile (Scenario 4)
      const linkedStaff = await prisma.staff.findFirst({
        where: { user_id: id }
      });
      const linkedStudent = await prisma.student.findFirst({
        where: { user_id: id }
      });

      if (linkedStaff || linkedStudent) {
        throw new ApiError(409, 'Cannot change role. This user is linked to an active profile. Please delete or unlink the profile first.');
      }
    }

    await prisma.users.update({
      where: { id },
      data: { role: role as any }
    });

    await writeAuditLog(actorId, id, 'CHANGE_ROLE', { role: user.role }, { role }, clientIp);
  },

  /**
   * Delete user account permanently.
   */
  async deleteUser(id: string, actorId: string, clientIp: string) {
    if (actorId === id) {
      throw new ApiError(400, 'Self-deletion is not permitted.');
    }

    const user = await prisma.users.findUnique({
      where: { id }
    });

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    const linkedStaff = await prisma.staff.findFirst({
      where: { user_id: id }
    });
    const linkedStudent = await prisma.student.findFirst({
      where: { user_id: id }
    });

    if (linkedStaff || linkedStudent) {
      throw new ApiError(409, 'Cannot delete user. This user has an associated profile. Please delete the profile first.');
    }

    await prisma.users.delete({
      where: { id }
    });

    await writeAuditLog(actorId, id, 'DELETE_USER', { email: user.email, role: user.role }, null, clientIp);
  }
};
