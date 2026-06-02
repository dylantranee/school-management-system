import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../../config/db';
import { signToken, signTokenWithExpiry, verifyTokenCustom } from '../../utils/jwt';
import { ApiError } from '../../middlewares/errorHandler';
import { getSetting } from '../../utils/settings';

// Helper to hash token for secure DB storage (Scenario 5)
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Helper to validate password complexity (Scenario 2 complexity rules)
const validatePasswordComplexity = (password: string) => {
  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long.');
  }
  if (!/\d/.test(password)) {
    throw new ApiError(400, 'Password must contain at least one number.');
  }
  const specialCharRegex = /[!@#$%^&*(),.?":{}|<>_+\-=\[\]\\/;`~]/;
  if (!specialCharRegex.test(password)) {
    throw new ApiError(400, 'Password must contain at least one special character.');
  }
};

export const authService = {
  /**
   * Login user, verifying credentials and checking lockout conditions.
   */
  async login(data: { email?: string; password?: string }): Promise<{ token: string; user: any }> {
    const { email, password } = data;
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required.');
    }

    // Normalization (Scenario 6)
    const trimmedEmail = email.toLowerCase().trim();

    const user = await prisma.users.findUnique({
      where: { email: trimmedEmail }
    });

    // Obfuscated Errors (Scenario 2)
    if (!user) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    // Deactivated/Suspended check (Scenario 5)
    if (user.is_active === false) {
      throw new ApiError(403, 'Your account is currently inactive. Please contact the administrator.');
    }

    // Brute-force Lockout check (Scenario 3)
    if (user.locked_until && new Date() < user.locked_until) {
      throw new ApiError(423, 'Account locked due to too many failed attempts. Please try again later.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      const maxAttemptsVal = await getSetting('MAX_FAILED_LOGIN_ATTEMPTS');
      const maxAttempts = parseInt(maxAttemptsVal, 10);

      const lockoutDurationVal = await getSetting('LOGIN_LOCKOUT_DURATION_MINUTES');
      const lockoutDurationMinutes = parseInt(lockoutDurationVal, 10);

      const newAttempts = user.failed_login_attempts + 1;
      let locked_until = user.locked_until;

      if (newAttempts >= maxAttempts) {
        locked_until = new Date(Date.now() + lockoutDurationMinutes * 60 * 1000);
        await prisma.users.update({
          where: { id: user.id },
          data: {
            failed_login_attempts: newAttempts,
            locked_until
          }
        });
        throw new ApiError(423, 'Account locked due to too many failed attempts. Please try again later.');
      } else {
        await prisma.users.update({
          where: { id: user.id },
          data: {
            failed_login_attempts: newAttempts
          }
        });
      }

      throw new ApiError(401, 'Invalid email or password.');
    }

    // Success: reset attempts
    await prisma.users.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: 0,
        locked_until: null
      }
    });

    const token = signToken({ userId: user.id, role: user.role });

    const { password_hash, reset_token_hash, reset_token_expires, activation_token_hash, activation_token_expires, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword
    };
  },

  /**
   * Fetch current authenticated user.
   */
  async getMe(userId: string): Promise<any> {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.is_active === false) {
      throw new ApiError(403, 'Your account is currently inactive. Please contact the administrator.');
    }

    const { password_hash, reset_token_hash, reset_token_expires, activation_token_hash, activation_token_expires, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  /**
   * Process forgot password request and mock mail service delivery.
   */
  async forgotPassword(email?: string): Promise<void> {
    if (!email) {
      throw new ApiError(400, 'Email is required.');
    }
    const trimmedEmail = email.toLowerCase().trim();

    const user = await prisma.users.findUnique({
      where: { email: trimmedEmail }
    });

    // Always return silently to prevent email enumeration/discovery (Scenario 1)
    if (!user) {
      return;
    }

    // Generate 15-minute secure token
    const token = signTokenWithExpiry({ email: user.email, action: 'reset-password' }, '15m');
    const tokenHash = hashToken(token);

    await prisma.users.update({
      where: { id: user.id },
      data: {
        reset_token_hash: tokenHash,
        reset_token_expires: new Date(Date.now() + 15 * 60 * 1000)
      }
    });

    console.log(`✉️ [Mail Service Mock] Send password-reset link to ${user.email}: http://localhost:5173/reset-password?token=${token}`);
  },

  /**
   * Reset user password.
   */
  async resetPassword(data: { token?: string; newPassword?: string }): Promise<void> {
    const { token, newPassword } = data;
    if (!token || !newPassword) {
      throw new ApiError(400, 'Token and new password are required.');
    }

    try {
      const payload = verifyTokenCustom(token);
      if (payload.action !== 'reset-password') {
        throw new ApiError(400, 'Invalid token action.');
      }

      const tokenHash = hashToken(token);
      const user = await prisma.users.findFirst({
        where: {
          email: payload.email,
          reset_token_hash: tokenHash,
          reset_token_expires: { gte: new Date() }
        }
      });

      if (!user) {
        throw new ApiError(400, 'This link is expired or invalid. Please request a new one.');
      }

      validatePasswordComplexity(newPassword);

      // Reuse prevention (Scenario 2)
      const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
      if (isSamePassword) {
        throw new ApiError(400, 'New password cannot match the current password.');
      }

      const password_hash = await bcrypt.hash(newPassword, 10);
      await prisma.users.update({
        where: { id: user.id },
        data: {
          password_hash,
          reset_token_hash: null,
          reset_token_expires: null,
          failed_login_attempts: 0,
          locked_until: null
        }
      });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(400, 'This link is expired or invalid. Please request a new one.');
    }
  },

  /**
   * Setup Initial Password / Activate Account (Scenario 3 & 4)
   */
  async activateAccount(data: { token?: string; password?: string }): Promise<void> {
    const { token, password } = data;
    if (!token || !password) {
      throw new ApiError(400, 'Token and password are required.');
    }

    try {
      const payload = verifyTokenCustom(token);
      if (payload.action !== 'activate') {
        throw new ApiError(400, 'Invalid token action.');
      }

      const tokenHash = hashToken(token);
      const user = await prisma.users.findFirst({
        where: {
          email: payload.email,
          activation_token_hash: tokenHash,
          activation_token_expires: { gte: new Date() }
        }
      });

      if (!user || user.is_active === true) {
        throw new ApiError(400, 'This link is expired or invalid. Please request a new one.');
      }

      validatePasswordComplexity(password);

      const password_hash = await bcrypt.hash(password, 10);
      await prisma.users.update({
        where: { id: user.id },
        data: {
          password_hash,
          is_active: true,
          activation_token_hash: null,
          activation_token_expires: null
        }
      });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(400, 'This link is expired or invalid. Please request a new one.');
    }
  },

  /**
   * Change password from profile.
   */
  async changePassword(data: { userId: string; currentPassword?: string; newPassword?: string }): Promise<void> {
    const { userId, currentPassword, newPassword } = data;
    if (!currentPassword || !newPassword) {
      throw new ApiError(400, 'Current and new passwords are required.');
    }

    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new ApiError(404, 'User not found.');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new ApiError(400, 'Invalid current password.');
    }

    validatePasswordComplexity(newPassword);

    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      throw new ApiError(400, 'New password cannot match the current password.');
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.users.update({
      where: { id: userId },
      data: { password_hash }
    });
  }
};
