import prisma from '../../config/db';
import { ApiError } from '../../middlewares/errorHandler';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';

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
  async listSalaries(userId: string, userRole: string) {
    // Staff can only view their own payslips (Scenario 4)
    if (userRole === 'Staff') {
      const staff = await prisma.staff.findUnique({
        where: { user_id: userId }
      });
      if (!staff) {
        throw new ApiError(400, 'Staff profile not found');
      }
      return prisma.salary.findMany({
        where: { staff_id: staff.id },
        orderBy: [
          { payment_year: 'desc' },
          { payment_month: 'desc' }
        ]
      });
    }

    // Admins can view all salaries
    if (userRole === 'Admin') {
      return prisma.salary.findMany({
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
        ]
      });
    }

    // Students are forbidden from viewing salary statements
    throw new ApiError(403, 'Permission denied');
  },

  /**
   * Validates access and generates PDF payslip document.
   */
  async exportPayslipPDF(id: string, userId: string, userRole: string) {
    // 1. Fetch salary record with staff details
    const salary = await prisma.salary.findUnique({
      where: { id },
      include: {
        Staff: {
          include: { Users: true }
        }
      }
    });

    if (!salary) {
      throw new ApiError(404, 'Payslip record not found');
    }

    // 2. Validate access: Admin or the Staff owner of the payslip
    let authorized = false;
    if (userRole === 'Admin') {
      authorized = true;
    } else if (userRole === 'Staff' && salary.Staff.user_id === userId) {
      authorized = true;
    }

    if (!authorized) {
      throw new ApiError(403, 'Permission denied. You are not authorized to export this payslip PDF.');
    }

    // 3. Generate PDF Document
    const doc = new PDFDocument({ margin: 50 });

    // Header Design
    doc.fillColor('#2C5282')
       .fontSize(24)
       .text('MONTHLY PAYSLIP', { align: 'center' });
    doc.moveDown(0.5);

    doc.fillColor('#4A5568')
       .fontSize(12)
       .text(`Employee Name: ${salary.Staff.staff_first_name} ${salary.Staff.staff_last_name}`, { align: 'left' })
       .text(`Employee Code: ${salary.Staff.employee_code}`, { align: 'left' })
       .text(`Department: ${salary.Staff.department}`, { align: 'left' })
       .text(`Pay Period: ${salary.payment_month}/${salary.payment_year}`, { align: 'left' });
    
    doc.moveDown(1.5);
    doc.strokeColor('#CBD5E0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    // Salary Breakdown Table
    doc.fillColor('#1A202C').fontSize(14).text('Earnings & Deductions', { underline: true });
    doc.moveDown(0.8);

    doc.fontSize(12).fillColor('#2D3748')
       .text(`Base Salary:`, { continued: true })
       .text(` $${Number(salary.base_salary).toFixed(2)}`, { align: 'right' });
    doc.moveDown(0.4);

    doc.text(`Allowances:`, { continued: true })
       .text(` $${Number(salary.allowances || 0).toFixed(2)}`, { align: 'right' });
    doc.moveDown(0.4);

    doc.text(`Deductions:`, { continued: true })
       .text(`-$${Number(salary.deductions || 0).toFixed(2)}`, { align: 'right' });
    doc.moveDown(0.8);

    doc.strokeColor('#CBD5E0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.8);

    doc.fontSize(14).fillColor('#2B6CB0')
       .text(`Net Salary:`, { continued: true })
       .text(` $${Number(salary.net_salary).toFixed(2)}`, { align: 'right' });

    const fileName = `payslip_${salary.Staff.employee_code}_${salary.payment_month}_${salary.payment_year}.pdf`;

    return { doc, fileName };
  }
};
