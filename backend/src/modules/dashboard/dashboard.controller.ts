import { Request, Response } from 'express';
import prisma from '../../config/db';
import { asyncHandler } from '../../utils/asyncHandler';
import { getSetting } from '../../utils/settings';

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  // 1. Fetch active term settings
  const semesterVal = await getSetting('CURRENT_SEMESTER');
  const academicYearVal = await getSetting('CURRENT_ACADEMIC_YEAR');
  const academicYear = parseInt(academicYearVal, 10);

  // 2. Count active students
  const activeStudentsCount = await prisma.student.count({
    where: {
      Users: {
        is_active: true
      }
    }
  });

  // 3. Count active staff
  const activeStaffCount = await prisma.staff.count({
    where: {
      Users: {
        is_active: true
      }
    }
  });

  // 4. Count approved enrollments for the active term
  const approvedEnrollmentsCount = await prisma.student_Enrollment.count({
    where: {
      enrollment_status: 'approving',
      Course_Section: {
        semester: semesterVal as any,
        academic_year: academicYear
      }
    }
  });

  // 5. Aggregate fees
  const feesAgg = await prisma.fee.aggregate({
    _sum: {
      amount_due: true,
      amount_paid: true
    }
  });

  const totalDue = Number(feesAgg._sum.amount_due || 0);
  const totalPaid = Number(feesAgg._sum.amount_paid || 0);
  const unpaidBalance = Math.max(0, totalDue - totalPaid);

  // 6. Section enrollment breakdown for active term
  const activeSections = await prisma.course_Section.findMany({
    where: {
      semester: semesterVal as any,
      academic_year: academicYear
    },
    include: {
      Subject: true,
      _count: {
        select: {
          Student_Enrollment: {
            where: {
              enrollment_status: 'approving'
            }
          }
        }
      }
    }
  });

  const sectionEnrollments = activeSections.map(sec => ({
    section_id: sec.id,
    section_number: sec.section_number,
    subject_code: sec.Subject.subject_code,
    subject_name: sec.Subject.subject_name,
    approved_enrollment_count: sec._count.Student_Enrollment
  }));

  res.json({
    activeTerm: {
      semester: semesterVal,
      academic_year: academicYear
    },
    counts: {
      activeStudents: activeStudentsCount,
      activeStaff: activeStaffCount,
      approvedEnrollments: approvedEnrollmentsCount
    },
    finances: {
      totalDue,
      totalPaid,
      unpaidBalance
    },
    sectionEnrollments
  });
});
