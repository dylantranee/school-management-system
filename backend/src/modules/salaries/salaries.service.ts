import prisma from '../../config/db';
import { ApiError } from '../../middlewares/errorHandler';
import crypto from 'crypto';

export const salariesService = {
  /**
   * Create a new salary/payslip record.
   */
  async createSalary(
    adminId: string,
    data: {
      base_salary: number;
      allowances?: number;
      deductions?: number;
      payment_month: number;
      payment_year: number;
      staff_id: string;
    }
  ) {
    const { base_salary, allowances, deductions, payment_month, payment_year, staff_id } = data;

    // 1. Verify Staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: staff_id }
    });
    if (!staff) {
      throw new ApiError(404, 'Staff member not found');
    }

    // 2. Prevent Duplicate monthly payslip (Scenario 2)
    const existing = await prisma.salary.findFirst({
      where: {
        staff_id,
        payment_month,
        payment_year
      }
    });
    if (existing) {
      throw new ApiError(409, `A payslip has already been generated for this staff member for the period ${payment_month}/${payment_year}.`);
    }

    // 3. Calculate net salary
    const base = Number(base_salary);
    const allow = Number(allowances || 0);
    const deduct = Number(deductions || 0);

    // Enforce non-negative inputs
    if (base < 0 || allow < 0 || deduct < 0) {
      throw new ApiError(400, 'Salary components must be non-negative values.');
    }

    const net = base + allow - deduct;

    // Verify net salary is strictly greater than zero
    if (net <= 0) {
      throw new ApiError(400, 'Calculated net salary must be strictly greater than zero.');
    }

    return prisma.salary.create({
      data: {
        id: crypto.randomUUID(),
        base_salary: base,
        allowances: allow,
        deductions: deduct,
        net_salary: net,
        payment_month,
        payment_year,
        staff_id,
        created_by: adminId,
        updated_by: adminId
      }
    });
  },

  /**
   * List salaries based on user role.
   */
  async listSalaries(userId: string, userRole: string, query: { page?: number; limit?: number } = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    // Staff can only view their own payslips (Scenario 4)
    if (userRole === 'Staff') {
      const staff = await prisma.staff.findUnique({
        where: { user_id: userId }
      });
      if (!staff) {
        throw new ApiError(400, 'Staff profile not found');
      }
      whereClause.staff_id = staff.id;
    }

    if (userRole === 'Staff') {
      const [salaries, totalCount] = await Promise.all([
        prisma.salary.findMany({
          where: whereClause,
          orderBy: [
            { payment_year: 'desc' },
            { payment_month: 'desc' }
          ],
          skip,
          take: limit
        }),
        prisma.salary.count({ where: whereClause })
      ]);
      const totalPages = Math.ceil(totalCount / limit);
      return {
        salaries,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit
        }
      };
    }

    // Admins can view all salaries
    if (userRole === 'Admin') {
      const [salaries, totalCount] = await Promise.all([
        prisma.salary.findMany({
          where: whereClause,
          include: {
            Staff: {
              select: {
                id: true,
                employee_code: true,
                staff_first_name: true,
                staff_last_name: true,
                department: true
              }
            }
          },
          orderBy: [
            { payment_year: 'desc' },
            { payment_month: 'desc' }
          ],
          skip,
          take: limit
        }),
        prisma.salary.count({ where: whereClause })
      ]);
      const totalPages = Math.ceil(totalCount / limit);
      return {
        salaries,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit
        }
      };
    }

    // Students are forbidden from viewing salary statements
    throw new ApiError(403, 'Permission denied');
  }
};
