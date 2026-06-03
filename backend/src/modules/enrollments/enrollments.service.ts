import prisma from '../../config/db';
import { ApiError } from '../../middlewares/errorHandler';
import { getSetting } from '../../utils/settings';
import crypto from 'crypto';
import { dateToMinutes } from '../../utils/time';

export const enrollmentService = {
  /**
   * Request enrollment in a course section (status starts as 'pending').
   */
  async createEnrollment(userId: string, courseSectionId: string) {
    // 1. Verify user is a Student
    const student = await prisma.student.findUnique({
      where: { user_id: userId }
    });
    if (!student) {
      throw new ApiError(400, 'Only students are permitted to enroll in courses.');
    }

    // 2. Enforce tuition compliance block
    const overdueFees = await prisma.fee.findFirst({
      where: {
        student_id: student.id,
        payment_status: 'overdue'
      }
    });
    if (overdueFees) {
      throw new ApiError(402, 'Tuition compliance block: You have outstanding overdue invoice statements.');
    }

    // 3. Enforce Registration Window check
    const startDateVal = await getSetting('REGISTRATION_START_DATE');
    const endDateVal = await getSetting('REGISTRATION_END_DATE');
    const now = new Date();
    const registrationStart = new Date(startDateVal);
    const registrationEnd = new Date(endDateVal);

    if (now < registrationStart || now > registrationEnd) {
      throw new ApiError(400, 'Course registration window is currently closed.');
    }

    // Execute database operations inside a concurrency-locking transaction
    return prisma.$transaction(async (tx) => {
      // A. Enforce Concurrency locking on Course Section
      await tx.$executeRaw`SELECT * FROM Course_Section WHERE id = ${courseSectionId} FOR UPDATE`;

      // B. Fetch Course Section inside locked transaction
      const section = await tx.course_Section.findUnique({
        where: { id: courseSectionId },
        include: {
          Subject: true,
          Schedule: true,
          _count: {
            select: {
              Student_Enrollment: {
                where: { enrollment_status: { in: ['pending', 'approving'] } }
              }
            }
          }
        }
      });

      if (!section) {
        throw new ApiError(404, 'Course Section not found');
      }

      // C. Active Term Enforcement
      const currentSemester = await getSetting('CURRENT_SEMESTER');
      const currentAcademicYear = await getSetting('CURRENT_ACADEMIC_YEAR');
      const expectedEnumSemester = currentSemester.startsWith('SEMESTER_') ? currentSemester : `SEMESTER_${currentSemester}`;
      
      if (section.semester !== expectedEnumSemester || section.academic_year !== parseInt(currentAcademicYear, 10)) {
        throw new ApiError(400, `Registration is only allowed for the active term (Semester ${currentSemester}, Year ${currentAcademicYear}).`);
      }

      // D. Enforce Max Capacity limit
      if (section._count.Student_Enrollment >= section.max_capacity) {
        throw new ApiError(409, 'Course Section is full.');
      }

      // E. Prevent Duplicate Subject registration
      const duplicateSubjectEnrollment = await tx.student_Enrollment.findFirst({
        where: {
          student_id: student.id,
          enrollment_status: { in: ['pending', 'approving'] },
          Course_Section: {
            subject_id: section.subject_id,
            semester: section.semester,
            academic_year: section.academic_year
          }
        }
      });
      if (duplicateSubjectEnrollment) {
        throw new ApiError(409, 'You are already enrolled or pending approval for a section of this subject in the current term.');
      }

      // F. Fetch existing enrollments to check credits and schedule conflicts
      const existingEnrollments = await tx.student_Enrollment.findMany({
        where: {
          student_id: student.id,
          enrollment_status: { in: ['pending', 'approving'] },
          Course_Section: {
            semester: section.semester,
            academic_year: section.academic_year
          }
        },
        include: {
          Course_Section: {
            include: { Subject: true }
          }
        }
      });

      // Enforce credit cap checks
      const currentCredits = existingEnrollments.reduce((acc, e) => acc + e.Course_Section.Subject.credits, 0);
      const maxCreditsVal = await getSetting('MAX_SEMESTER_CREDITS');
      const maxCredits = parseInt(maxCreditsVal, 10);

      if (currentCredits + section.Subject.credits > maxCredits) {
        throw new ApiError(400, `Enrolling in this course would exceed the maximum limit of ${maxCredits} credits for the semester (current: ${currentCredits}).`);
      }

      // G. Enforce Student Timetable Overlap check
      const existingEnrollmentIds = existingEnrollments.map(e => e.course_section_id);
      const existingSchedules = await tx.schedule.findMany({
        where: {
          course_section_id: { in: existingEnrollmentIds }
        },
        include: {
          Course_Section: {
            include: { Subject: true }
          }
        }
      });

      for (const newSched of section.Schedule) {
        const newStart = dateToMinutes(newSched.start_time);
        const newEnd = dateToMinutes(newSched.end_time);

        for (const oldSched of existingSchedules) {
          if (newSched.day_of_week === oldSched.day_of_week) {
            const oldStart = dateToMinutes(oldSched.start_time);
            const oldEnd = dateToMinutes(oldSched.end_time);

            if (newStart < oldEnd && newEnd > oldStart) {
              throw new ApiError(409, `Schedule conflict on ${newSched.day_of_week}: overlaps with already registered subject "${oldSched.Course_Section.Subject.subject_name}".`);
            }
          }
        }
      }

      // Create pending enrollment record
      return tx.student_Enrollment.create({
        data: {
          id: crypto.randomUUID(),
          student_id: student.id,
          course_section_id: courseSectionId,
          enrollment_status: 'pending',
          created_by: userId,
          updated_by: userId
        }
      });
    });
  },

  /**
   * List enrollments scoped by active role permissions.
   */
  async listEnrollments(userId: string, userRole: string) {
    // Students can only view their own enrollments
    if (userRole === 'Student') {
      const student = await prisma.student.findUnique({
        where: { user_id: userId }
      });
      if (!student) {
        throw new ApiError(400, 'Student profile not found');
      }
      return prisma.student_Enrollment.findMany({
        where: { student_id: student.id },
        include: {
          Course_Section: {
            include: {
              Subject: true,
              Staff: {
                select: {
                  staff_first_name: true,
                  staff_last_name: true
                }
              }
            }
          }
        }
      });
    }

    // Staff can only view enrollments of their advisees
    if (userRole === 'Staff') {
      const staff = await prisma.staff.findUnique({
        where: { user_id: userId }
      });
      if (!staff) {
        throw new ApiError(400, 'Staff profile not found');
      }
      return prisma.student_Enrollment.findMany({
        where: {
          Student: {
            advisor_id: staff.id
          }
        },
        include: {
          Student: true,
          Course_Section: {
            include: {
              Subject: true,
              Staff: true
            }
          }
        }
      });
    }

    // Admins can see all enrollments
    if (userRole === 'Admin') {
      return prisma.student_Enrollment.findMany({
        include: {
          Student: true,
          Course_Section: {
            include: {
              Subject: true,
              Staff: true
            }
          }
        }
      });
    }

    throw new ApiError(400, 'Invalid user role');
  },

  /**
   * Update the status of an enrollment (e.g. approve/decline).
   */
  async updateEnrollmentStatus(id: string, status: string, userId: string, userRole: string, comment?: string) {
    const enrollment = await prisma.student_Enrollment.findUnique({
      where: { id },
      include: {
        Student: true,
        Course_Section: true
      }
    });

    if (!enrollment) {
      throw new ApiError(404, 'Enrollment record not found');
    }

    // Advisor-only approval check (Admin fallback removed)
    if (userRole === 'Staff') {
      const staff = await prisma.staff.findUnique({
        where: { user_id: userId }
      });
      if (!staff || staff.id !== enrollment.Student.advisor_id) {
        throw new ApiError(403, "Permission denied. Only the student's designated academic advisor can approve or decline their enrollment.");
      }
    } else {
      throw new ApiError(403, "Permission denied. Only the student's designated academic advisor can approve or decline their enrollment.");
    }

    return prisma.student_Enrollment.update({
      where: { id },
      data: {
        enrollment_status: status as any,
        comment: comment || null,
        updated_by: userId
      }
    });
  },

  /**
   * Drop an enrollment and automatically adjust any corresponding tuition fee balance.
   */
  async dropEnrollment(id: string, userId: string, userRole: string) {
    // 1. Fetch enrollment record
    const enrollment = await prisma.student_Enrollment.findUnique({
      where: { id },
      include: {
        Student: true,
        Course_Section: {
          include: { Subject: true }
        }
      }
    });

    if (!enrollment) {
      throw new ApiError(404, 'Enrollment record not found');
    }

    // 2. Validate ownership or role
    if (userRole === 'Student' && enrollment.Student.user_id !== userId) {
      throw new ApiError(403, 'Permission denied. You can only drop your own course enrollments.');
    }

    // 3. Verify Registration Window check
    const startDateVal = await getSetting('REGISTRATION_START_DATE');
    const endDateVal = await getSetting('REGISTRATION_END_DATE');
    const now = new Date();
    const registrationStart = new Date(startDateVal);
    const registrationEnd = new Date(endDateVal);

    if (now < registrationStart || now > registrationEnd) {
      throw new ApiError(400, 'Course dropping window is closed.');
    }

    const droppedCredits = enrollment.Course_Section.Subject.credits;
    const isApproved = enrollment.enrollment_status === 'approving';

    // 4. Delete the enrollment record
    await prisma.student_Enrollment.delete({
      where: { id }
    });

    // 5. Recalculate invoice balance if dropping an approved course
    if (isApproved) {
      const semesterVal = await getSetting('CURRENT_SEMESTER');
      const academicYearVal = await getSetting('CURRENT_ACADEMIC_YEAR');
      const academicYear = parseInt(academicYearVal, 10);

      // Fetch approved enrollments in current term including the dropped one's credits
      const approvedEnrollments = await prisma.student_Enrollment.findMany({
        where: {
          student_id: enrollment.student_id,
          enrollment_status: 'approving',
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
      });

      const totalCreditsBefore = approvedEnrollments.reduce((acc, e) => acc + e.Course_Section.Subject.credits, 0) + droppedCredits;

      const latestFee = await prisma.fee.findFirst({
        where: { student_id: enrollment.student_id },
        orderBy: { due_date: 'desc' }
      });

      if (latestFee && totalCreditsBefore > 0) {
        const costPerCredit = Number(latestFee.amount_due) / totalCreditsBefore;
        const newAmountDue = Math.max(0, Number(latestFee.amount_due) - (droppedCredits * costPerCredit));

        let newStatus = latestFee.payment_status;
        const newPaid = Number(latestFee.amount_paid || 0);
        if (newPaid >= newAmountDue) {
          newStatus = 'paid';
        } else if (new Date() > latestFee.due_date) {
          newStatus = 'overdue';
        } else {
          newStatus = 'unpaid';
        }

        await prisma.fee.update({
          where: { id: latestFee.id },
          data: {
            amount_due: newAmountDue,
            payment_status: newStatus
          }
        });
      }
    }

    return { message: 'Course enrollment dropped successfully' };
  }
};
