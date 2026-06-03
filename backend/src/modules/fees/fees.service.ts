import prisma from '../../config/db';
import { ApiError } from '../../middlewares/errorHandler';
import { getSetting } from '../../utils/settings';
import crypto from 'crypto';

export const feesService = {
  /**
   * Run a semester-wide billing run for active students with approved course sections.
   */
  async generateSemesterFees(adminId: string, data: { cost_per_credit: number; due_date: string }) {
    const { cost_per_credit, due_date } = data;

    // 1. Fetch active term configurations (SMS-23/SMS-27)
    const semesterVal = await getSetting('CURRENT_SEMESTER');
    const academicYearVal = await getSetting('CURRENT_ACADEMIC_YEAR');
    const academicYear = parseInt(academicYearVal, 10);

    // 2. Fetch all active students
    const activeStudents = await prisma.student.findMany({
      include: {
        Users: true,
        Student_Enrollment: {
          where: {
            enrollment_status: 'approving', // Only charge for approved enrollments
            Course_Section: {
              semester: semesterVal as any,
              academic_year: academicYear
            }
          },
          include: {
            Course_Section: {
              include: { Subject: true }
            }
          }
        }
      }
    });

    const generatedFees: any[] = [];
    const errors: string[] = [];

    // 3. Process billing run in individual transactions
    for (const student of activeStudents) {
      if (student.Users && student.Users.is_active === false) {
        continue;
      }

      const totalCredits = student.Student_Enrollment.reduce((acc, e) => acc + e.Course_Section.Subject.credits, 0);
      if (totalCredits === 0) {
        continue; // No approved enrollments -> no charge
      }

      const amountDue = totalCredits * cost_per_credit;

      try {
        await prisma.$transaction(async (tx) => {
          // Prevent duplicate fee invoices for the same student and due date
          const existing = await tx.fee.findFirst({
            where: {
              student_id: student.id,
              due_date: new Date(due_date)
            }
          });
          if (existing) {
            throw new Error('Billing already run for this student on this due date');
          }

          const fee = await tx.fee.create({
            data: {
              id: crypto.randomUUID(),
              amount_due: amountDue,
              amount_paid: 0,
              due_date: new Date(due_date),
              payment_status: 'unpaid',
              student_id: student.id,
              created_by: adminId,
              updated_by: adminId
            }
          });
          generatedFees.push(fee);
        });
      } catch (err: any) {
        errors.push(`Student ${student.student_code}: ${err.message}`);
      }
    }

    return {
      message: 'Billing run completed',
      invoiceCount: generatedFees.length,
      invoices: generatedFees,
      errorCount: errors.length,
      errors
    };
  },

  /**
   * List all fees scoped by active role permissions.
   */
  async listFees(userId: string, userRole: string, query: { page?: number; limit?: number } = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    // Students can only view their own fees
    if (userRole === 'Student') {
      const student = await prisma.student.findUnique({ where: { user_id: userId } });
      if (!student) {
        throw new ApiError(400, 'Student profile not found');
      }
      whereClause.student_id = student.id;
    }

    if (userRole === 'Student') {
      const [fees, totalCount] = await Promise.all([
        prisma.fee.findMany({
          where: whereClause,
          orderBy: { due_date: 'desc' },
          skip,
          take: limit
        }),
        prisma.fee.count({ where: whereClause })
      ]);
      const totalPages = Math.ceil(totalCount / limit);
      return {
        fees,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit
        }
      };
    }

    // Admins/Staff can list all fees
    const [fees, totalCount] = await Promise.all([
      prisma.fee.findMany({
        where: whereClause,
        include: {
          Student: {
            select: {
              id: true,
              student_code: true,
              student_first_name: true,
              student_last_name: true
            }
          }
        },
        orderBy: { due_date: 'desc' },
        skip,
        take: limit
      }),
      prisma.fee.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    return {
      fees,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit
      }
    };
  },

  /**
   * Record a payment manually.
   */
  async recordPayment(id: string, amount: number, adminId: string) {
    const fee = await prisma.fee.findUnique({
      where: { id }
    });
    if (!fee) {
      throw new ApiError(404, 'Fee record not found');
    }

    const currentPaid = Number(fee.amount_paid || 0);
    const totalDue = Number(fee.amount_due);
    const newPaid = currentPaid + amount;

    // Overpayment Block (Scenario 3)
    if (newPaid > totalDue) {
      throw new ApiError(400, `Overpayment blocked: Payment of ${amount} would put total paid (${newPaid}) above amount due (${totalDue}).`);
    }

    // Determine status (under strict MySQL DB enum constraints: paid, unpaid, overdue)
    let status: 'paid' | 'unpaid' | 'overdue' = 'unpaid';
    if (newPaid >= totalDue) {
      status = 'paid';
    } else if (new Date() > fee.due_date) {
      status = 'overdue';
    }

    return prisma.fee.update({
      where: { id },
      data: {
        amount_paid: newPaid,
        payment_status: status,
        updated_by: adminId
      }
    });
  },

  /**
   * Check for overdue unpaid fees and update status.
   */
  async checkOverdueFees(adminId: string) {
    const now = new Date();

    // Find all unpaid fees that are past their due date
    const overdueFees = await prisma.fee.findMany({
      where: {
        payment_status: 'unpaid',
        due_date: { lt: now }
      }
    });

    let updatedCount = 0;
    for (const fee of overdueFees) {
      await prisma.fee.update({
        where: { id: fee.id },
        data: {
          payment_status: 'overdue',
          updated_by: adminId
        }
      });
      updatedCount++;
    }

    return {
      message: 'Completed overdue check',
      updatedCount
    };
  },

  /**
   * Handle payment gateway webhook verification and balance recording.
   */
  async handlePaymentWebhook(body: { fee_id: string; amount: number }, signature: string | string[] | undefined) {
    const { fee_id, amount } = body;

    // Webhook HMAC signature verification
    const webhookSecret = await getSetting('PAYMENT_WEBHOOK_SECRET');
    if (!signature) {
      throw new ApiError(401, 'Missing signature header');
    }

    const computedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (signature !== computedSig) {
      throw new ApiError(401, 'Invalid signature');
    }

    const fee = await prisma.fee.findUnique({
      where: { id: fee_id }
    });
    if (!fee) {
      throw new ApiError(404, 'Fee record not found');
    }

    const currentPaid = Number(fee.amount_paid || 0);
    const totalDue = Number(fee.amount_due);
    const newPaid = currentPaid + Number(amount);

    if (newPaid > totalDue) {
      throw new ApiError(400, `Overpayment blocked: Payment of ${amount} would put total paid (${newPaid}) above amount due (${totalDue}).`);
    }

    let status: 'paid' | 'unpaid' | 'overdue' = 'unpaid';
    if (newPaid >= totalDue) {
      status = 'paid';
    } else if (new Date() > fee.due_date) {
      status = 'overdue';
    }

    const updated = await prisma.fee.update({
      where: { id: fee_id },
      data: {
        amount_paid: newPaid,
        payment_status: status,
        updated_by: 'webhook'
      }
    });

    return { message: 'Webhook payment recorded successfully', fee: updated };
  }
};
