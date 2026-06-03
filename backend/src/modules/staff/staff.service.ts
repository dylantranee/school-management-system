import prisma from '../../config/db';
import { ApiError } from '../../middlewares/errorHandler';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { signTokenWithExpiry } from '../../utils/jwt';
import { getSetting } from '../../utils/settings';

export const staffService = {
  /**
   * Create a new staff profile.
   */
  async createStaff(data: {
    employee_code: string;
    staff_first_name: string;
    staff_last_name: string;
    hire_date?: string;
    department: string;
    userId?: string;
  }) {
    const { employee_code, staff_first_name, staff_last_name, hire_date, department, userId } = data;

    const existing = await prisma.staff.findUnique({
      where: { employee_code }
    });
    if (existing) {
      throw new ApiError(409, 'Employee code already in use');
    }

    if (userId) {
      const user = await prisma.users.findUnique({
        where: { id: userId }
      });
      if (!user) {
        throw new ApiError(400, 'Linked user not found');
      }
      const userAlreadyLinked = await prisma.staff.findUnique({
        where: { user_id: userId }
      });
      if (userAlreadyLinked) {
        throw new ApiError(409, 'User is already linked to another staff member');
      }
    }

    return prisma.staff.create({
      data: {
        id: crypto.randomUUID(),
        employee_code,
        staff_first_name,
        staff_last_name,
        hire_date: hire_date ? new Date(hire_date) : null,
        department,
        user_id: userId || null
      }
    });
  },

  /**
   * List all staff members.
   */
  async listStaff() {
    return prisma.staff.findMany({
      include: {
        Users: {
          select: {
            email: true,
            is_active: true,
            role: true
          }
        }
      }
    });
  },

  /**
   * Fetch single staff member details by ID.
   */
  async getStaff(id: string) {
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        Users: {
          select: {
            email: true,
            is_active: true,
            role: true
          }
        }
      }
    });
    if (!staff) {
      throw new ApiError(404, 'Staff member not found');
    }
    return staff;
  },

  /**
   * Update staff profile details.
   */
  async updateStaff(
    id: string,
    data: {
      employee_code?: string;
      staff_first_name?: string;
      staff_last_name?: string;
      hire_date?: string;
      department?: string;
    }
  ) {
    const { employee_code, staff_first_name, staff_last_name, hire_date, department } = data;

    const staff = await prisma.staff.findUnique({
      where: { id }
    });
    if (!staff) {
      throw new ApiError(404, 'Staff member not found');
    }

    if (employee_code && employee_code !== staff.employee_code) {
      const other = await prisma.staff.findUnique({
        where: { employee_code }
      });
      if (other) {
        throw new ApiError(409, 'Employee code already in use');
      }
    }

    return prisma.staff.update({
      where: { id },
      data: {
        employee_code: employee_code ?? staff.employee_code,
        staff_first_name: staff_first_name ?? staff.staff_first_name,
        staff_last_name: staff_last_name ?? staff.staff_last_name,
        hire_date: hire_date ? new Date(hire_date) : staff.hire_date,
        department: department ?? staff.department
      }
    });
  },

  /**
   * Deactivate a staff member profile (sets corresponding User to inactive).
   */
  async deactivateStaff(id: string) {
    const staff = await prisma.staff.findUnique({
      where: { id }
    });
    if (!staff) {
      throw new ApiError(404, 'Staff member not found');
    }

    if (staff.user_id) {
      await prisma.users.update({
        where: { id: staff.user_id },
        data: { is_active: false }
      });
    }

    return staff;
  },

  /**
   * Reactivate a staff member profile.
   */
  async reactivateStaff(id: string) {
    const staff = await prisma.staff.findUnique({
      where: { id }
    });
    if (!staff) {
      throw new ApiError(404, 'Staff member not found');
    }

    if (staff.user_id) {
      await prisma.users.update({
        where: { id: staff.user_id },
        data: { is_active: true }
      });
    }

    return staff;
  },

  /**
   * Delete staff member profile with dependencies constraints.
   */
  async deleteStaff(id: string) {
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        Course_Section: true,
        Salary: true
      }
    });

    if (!staff) {
      throw new ApiError(404, 'Staff member not found');
    }

    // Load current term configurations
    const currentSemester = await getSetting('CURRENT_SEMESTER');
    const currentAcademicYear = await getSetting('CURRENT_ACADEMIC_YEAR');
    const currentYearNum = parseInt(currentAcademicYear, 10);
    const expectedEnumSemester = currentSemester.startsWith('SEMESTER_') ? currentSemester : `SEMESTER_${currentSemester}`;

    // Check if they teach any active course section in the current term
    const activeSections = staff.Course_Section.filter(
      cs => cs.semester === expectedEnumSemester && cs.academic_year === currentYearNum
    );

    if (activeSections.length > 0) {
      throw new ApiError(409, 'Cannot delete staff member who is assigned to teach one or more active course sections in the current semester. Please reassign the courses first.');
    }

    const hasHistoricalSections = staff.Course_Section.length > 0;
    const hasSalaryRecords = staff.Salary.length > 0;

    if (hasHistoricalSections || hasSalaryRecords) {
      // Perform soft delete (deactivate user account)
      if (staff.user_id) {
        await prisma.users.update({
          where: { id: staff.user_id },
          data: { is_active: false }
        });
      }
      return { softDeleted: true, message: 'Staff member has historical records. Profile soft-deleted (account deactivated) to preserve integrity.' };
    }

    // Hard delete if no records/dependencies exist
    await prisma.$transaction(async (tx) => {
      await tx.staff.delete({
        where: { id }
      });

      if (staff.user_id) {
        await tx.users.delete({
          where: { id: staff.user_id }
        });
      }
    });

    return { softDeleted: false, message: 'Staff member deleted successfully' };
  },

  /**
   * Process a CSV containing bulk staff member profiles.
   */
  async importStaffCSV(csvData: string) {
    if (!csvData || typeof csvData !== 'string') {
      throw new ApiError(400, 'csvData is required as a string');
    }

    const lines = csvData.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) {
      throw new ApiError(400, 'CSV file is empty or missing headers');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const firstNameIdx = headers.indexOf('first_name');
    const lastNameIdx = headers.indexOf('last_name');
    const emailIdx = headers.indexOf('email');
    const codeIdx = headers.indexOf('employee_code');
    const deptIdx = headers.indexOf('department');
    const hireDateIdx = headers.indexOf('hire_date');

    if (firstNameIdx === -1 || lastNameIdx === -1 || emailIdx === -1 || codeIdx === -1 || deptIdx === -1) {
      throw new ApiError(400, 'CSV must contain headers: first_name, last_name, email, employee_code, department');
    }

    // 1. Internal CSV Duplicate Checks
    const emailsInCsv = new Set<string>();
    const codesInCsv = new Set<string>();
    const rowsToProcess: { firstName: string; lastName: string; email: string; code: string; department: string; hireDateStr: string | null; lineNum: number }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length < headers.length) {
        throw new ApiError(400, `Row ${i + 1} has fewer fields than headers`);
      }

      const firstName = parts[firstNameIdx];
      const lastName = parts[lastNameIdx];
      const email = parts[emailIdx].toLowerCase();
      const code = parts[codeIdx];
      const department = parts[deptIdx];
      const hireDateStr = hireDateIdx !== -1 ? parts[hireDateIdx] : null;

      if (!firstName || !lastName || !email || !code || !department) {
        throw new ApiError(400, `Row ${i + 1}: Missing required fields`);
      }

      if (emailsInCsv.has(email)) {
        throw new ApiError(400, `Duplicate email found in CSV: ${email}`);
      }
      emailsInCsv.add(email);

      if (codesInCsv.has(code)) {
        throw new ApiError(400, `Duplicate employee code found in CSV: ${code}`);
      }
      codesInCsv.add(code);

      rowsToProcess.push({ firstName, lastName, email, code, department, hireDateStr, lineNum: i + 1 });
    }

    const successes: any[] = [];

    // 2. All-or-nothing parent transaction
    try {
      await prisma.$transaction(async (tx) => {
        for (const row of rowsToProcess) {
          const { firstName, lastName, email, code, department, hireDateStr, lineNum } = row;

          // Check existing email in DB
          const existingUser = await tx.users.findUnique({ where: { email } });
          if (existingUser) {
            throw new ApiError(400, `Row ${lineNum}: Email ${email} is already in use`);
          }

          // Check existing employee code in DB
          const existingStaff = await tx.staff.findUnique({ where: { employee_code: code } });
          if (existingStaff) {
            throw new ApiError(400, `Row ${lineNum}: Employee code ${code} is already in use`);
          }

          const userId = crypto.randomUUID();
          const activationToken = signTokenWithExpiry({ email, action: 'activate' }, '3d');
          const tokenHash = crypto.createHash('sha256').update(activationToken).digest('hex');
          const tempPassword = crypto.randomBytes(32).toString('hex');
          const passwordHash = await bcrypt.hash(tempPassword, 10);

          // Create base user account
          await tx.users.create({
            data: {
              id: userId,
              email,
              password_hash: passwordHash,
              role: 'Staff',
              is_active: false,
              activation_token_hash: tokenHash,
              activation_token_expires: new Date(Date.now() + 72 * 60 * 60 * 1000)
            }
          });

          // Create staff profile
          await tx.staff.create({
            data: {
              id: crypto.randomUUID(),
              employee_code: code,
              staff_first_name: firstName,
              staff_last_name: lastName,
              hire_date: hireDateStr ? new Date(hireDateStr) : null,
              department,
              user_id: userId
            }
          });

          console.log(`✉️ [Mail Service Mock] Onboarding Staff ${email}: http://localhost:5173/activate?token=${activationToken}`);
          successes.push({ email, employee_code: code });
        }
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(400, err.message || 'Error processing CSV import');
    }

    return {
      successCount: successes.length,
      successes
    };
  }
};
