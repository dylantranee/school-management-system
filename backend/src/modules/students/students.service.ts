import prisma from '../../config/db';
import { ApiError } from '../../middlewares/errorHandler';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { signTokenWithExpiry } from '../../utils/jwt';
import { getSetting } from '../../utils/settings';
import PDFDocument from 'pdfkit';

export const studentsService = {
  /**
   * Create a new student profile.
   */
  async createStudent(data: {
    student_code: string;
    student_first_name: string;
    student_last_name: string;
    enrollment_date?: string;
    userId?: string;
    advisor_id?: string;
  }) {
    const { student_code, student_first_name, student_last_name, enrollment_date, userId, advisor_id } = data;

    const existing = await prisma.student.findUnique({
      where: { student_code }
    });
    if (existing) {
      throw new ApiError(409, 'Student code already in use');
    }

    if (userId) {
      const user = await prisma.users.findUnique({
        where: { id: userId }
      });
      if (!user) {
        throw new ApiError(400, 'Linked user not found');
      }
      const userAlreadyLinked = await prisma.student.findUnique({
        where: { user_id: userId }
      });
      if (userAlreadyLinked) {
        throw new ApiError(409, 'User is already linked to another student');
      }
    }

    if (advisor_id) {
      const advisor = await prisma.staff.findUnique({
        where: { id: advisor_id },
        include: { Users: true }
      });
      if (!advisor) {
        throw new ApiError(400, 'Assigned academic advisor does not exist.');
      }
      if (advisor.Users?.is_active !== true) {
        throw new ApiError(400, 'Assigned academic advisor is inactive.');
      }
    }

    return prisma.student.create({
      data: {
        id: crypto.randomUUID(),
        student_code,
        student_first_name,
        student_last_name,
        enrollment_date: enrollment_date ? new Date(enrollment_date) : null,
        user_id: userId || null,
        advisor_id: advisor_id || null
      }
    });
  },

  /**
   * List all students.
   */
  async listStudents() {
    return prisma.student.findMany({
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
   * Fetch single student details by ID.
   */
  async getStudent(id: string) {
    const student = await prisma.student.findUnique({
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
    if (!student) {
      throw new ApiError(404, 'Student not found');
    }
    return student;
  },

  /**
   * Update student profile.
   */
  async updateStudent(
    id: string,
    data: {
      student_code?: string;
      student_first_name?: string;
      student_last_name?: string;
      enrollment_date?: string;
      advisor_id?: string | null;
    }
  ) {
    const { student_code, student_first_name, student_last_name, enrollment_date, advisor_id } = data;

    const student = await prisma.student.findUnique({
      where: { id }
    });
    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    if (student_code && student_code !== student.student_code) {
      const other = await prisma.student.findUnique({
        where: { student_code }
      });
      if (other) {
        throw new ApiError(409, 'Student code already in use');
      }
    }

    if (advisor_id) {
      const advisor = await prisma.staff.findUnique({
        where: { id: advisor_id },
        include: { Users: true }
      });
      if (!advisor) {
        throw new ApiError(400, 'Assigned academic advisor does not exist.');
      }
      if (advisor.Users?.is_active !== true) {
        throw new ApiError(400, 'Assigned academic advisor is inactive.');
      }
    }

    return prisma.student.update({
      where: { id },
      data: {
        student_code: student_code ?? student.student_code,
        student_first_name: student_first_name ?? student.student_first_name,
        student_last_name: student_last_name ?? student.student_last_name,
        enrollment_date: enrollment_date ? new Date(enrollment_date) : student.enrollment_date,
        advisor_id: advisor_id !== undefined ? advisor_id : student.advisor_id
      }
    });
  },

  /**
   * Deactivate student profile.
   */
  async deactivateStudent(id: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        Student_Enrollment: {
          where: {
            enrollment_status: { in: ['pending', 'approving'] }
          }
        },
        Fee: {
          where: {
            payment_status: { in: ['unpaid', 'overdue'] }
          }
        }
      }
    });

    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    const warnings: string[] = [];
    if (student.Student_Enrollment && student.Student_Enrollment.length > 0) {
      warnings.push(`Student has ${student.Student_Enrollment.length} active course enrollments.`);
    }

    if (student.Fee && student.Fee.length > 0) {
      const totalUnpaid = student.Fee.reduce((acc, f) => acc + Number(f.amount_due) - Number(f.amount_paid || 0), 0);
      warnings.push(`Student has unpaid outstanding balance of $${totalUnpaid.toFixed(2)}.`);
    }

    if (student.user_id) {
      await prisma.users.update({
        where: { id: student.user_id },
        data: { is_active: false }
      });
    }

    return {
      student,
      warnings: warnings.length > 0 ? warnings : null
    };
  },

  /**
   * Reactivate student profile.
   */
  async reactivateStudent(id: string) {
    const student = await prisma.student.findUnique({
      where: { id }
    });
    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    if (student.user_id) {
      await prisma.users.update({
        where: { id: student.user_id },
        data: { is_active: true }
      });
    }

    return student;
  },

  /**
   * Delete student profile checking for active/historical dependencies.
   */
  async deleteStudent(id: string) {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        Fee: true,
        Student_Enrollment: true
      }
    });

    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    const hasEnrollments = student.Student_Enrollment && student.Student_Enrollment.length > 0;
    const hasFees = student.Fee && student.Fee.length > 0;

    if (hasEnrollments || hasFees) {
      if (student.user_id) {
        await prisma.users.update({
          where: { id: student.user_id },
          data: { is_active: false }
        });
      }
      return { softDeleted: true, message: 'Student has active or historical enrollment/fee records. Profile soft-deleted (account deactivated) to preserve audit integrity.' };
    }

    // Delete student profile and base user account atomically
    await prisma.$transaction(async (tx) => {
      await tx.student.delete({
        where: { id }
      });

      if (student.user_id) {
        await tx.users.delete({
          where: { id: student.user_id }
        });
      }
    });

    return { softDeleted: false, message: 'Student deleted successfully' };
  },

  /**
   * Process a CSV containing student profiles for onboarding.
   */
  async importStudentCSV(csvData: string) {
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
    const codeIdx = headers.indexOf('student_code');
    const enrollDateIdx = headers.indexOf('enrollment_date');

    if (firstNameIdx === -1 || lastNameIdx === -1 || emailIdx === -1 || codeIdx === -1) {
      throw new ApiError(400, 'CSV must contain headers: first_name, last_name, email, student_code');
    }

    // 1. Internal CSV Duplicate Checks
    const emailsInCsv = new Set<string>();
    const codesInCsv = new Set<string>();
    const rowsToProcess: { firstName: string; lastName: string; email: string; code: string; enrollDateStr: string | null; lineNum: number }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length < headers.length) {
        throw new ApiError(400, `Row ${i + 1} has fewer fields than headers`);
      }

      const firstName = parts[firstNameIdx];
      const lastName = parts[lastNameIdx];
      const email = parts[emailIdx].toLowerCase();
      const code = parts[codeIdx];
      const enrollDateStr = enrollDateIdx !== -1 ? parts[enrollDateIdx] : null;

      if (!firstName || !lastName || !email || !code) {
        throw new ApiError(400, `Row ${i + 1}: Missing required fields`);
      }

      if (emailsInCsv.has(email)) {
        throw new ApiError(400, `Duplicate email found in CSV: ${email}`);
      }
      emailsInCsv.add(email);

      if (codesInCsv.has(code)) {
        throw new ApiError(400, `Duplicate student code found in CSV: ${code}`);
      }
      codesInCsv.add(code);

      rowsToProcess.push({ firstName, lastName, email, code, enrollDateStr, lineNum: i + 1 });
    }

    const successes: any[] = [];

    // 2. All-or-nothing parent transaction
    try {
      await prisma.$transaction(async (tx) => {
        for (const row of rowsToProcess) {
          const { firstName, lastName, email, code, enrollDateStr, lineNum } = row;

          // Check existing email in DB
          const existingUser = await tx.users.findUnique({ where: { email } });
          if (existingUser) {
            throw new ApiError(400, `Row ${lineNum}: Email ${email} is already in use`);
          }

          // Check existing student code in DB
          const existingStudent = await tx.student.findUnique({ where: { student_code: code } });
          if (existingStudent) {
            throw new ApiError(400, `Row ${lineNum}: Student code ${code} is already in use`);
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
              role: 'Student',
              is_active: false,
              activation_token_hash: tokenHash,
              activation_token_expires: new Date(Date.now() + 72 * 60 * 60 * 1000)
            }
          });

          // Create student profile
          await tx.student.create({
            data: {
              id: crypto.randomUUID(),
              student_code: code,
              student_first_name: firstName,
              student_last_name: lastName,
              enrollment_date: enrollDateStr ? new Date(enrollDateStr) : null,
              user_id: userId
            }
          });

          console.log(`✉️ [Mail Service Mock] Onboarding Student ${email}: http://localhost:5173/activate?token=${activationToken}`);
          successes.push({ email, student_code: code });
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
  },

  /**
   * Validate access permissions and export timetable PDF document stream.
   */
  async exportTimetablePDF(id: string, userId: string, userRole: string) {
    // 1. Fetch student
    const student = await prisma.student.findUnique({
      where: { id },
      include: { Users: true }
    });
    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    // 2. Validate access: Admin, Student owner, or Academic Advisor (Staff)
    let authorized = false;
    if (userRole === 'Admin') {
      authorized = true;
    } else if (userRole === 'Student' && student.user_id === userId) {
      authorized = true;
    } else if (userRole === 'Staff') {
      const staff = await prisma.staff.findUnique({ where: { user_id: userId } });
      if (staff && student.advisor_id === staff.id) {
        authorized = true;
      }
    }

    if (!authorized) {
      throw new ApiError(403, 'Permission denied. You are not authorized to export this timetable PDF.');
    }

    // 3. Fetch current active semester details
    const semesterVal = await getSetting('CURRENT_SEMESTER');
    const academicYearVal = await getSetting('CURRENT_ACADEMIC_YEAR');
    const academicYear = parseInt(academicYearVal, 10);

    // 4. Fetch approved enrollments & schedules
    const approvedEnrollments = await prisma.student_Enrollment.findMany({
      where: {
        student_id: student.id,
        enrollment_status: 'approving',
        Course_Section: {
          semester: semesterVal as any,
          academic_year: academicYear
        }
      },
      include: {
        Course_Section: {
          include: {
            Subject: true,
            Staff: true,
            Schedule: {
              include: { Room: true }
            }
          }
        }
      }
    });

    // 5. Generate PDF
    const doc = new PDFDocument({ margin: 50 });

    // Header Design
    doc.fillColor('#2B6CB0')
       .fontSize(24)
       .text('ACADEMIC TIMETABLE', { align: 'center' });
    doc.moveDown(0.5);

    doc.fillColor('#4A5568')
       .fontSize(12)
       .text(`Student Name: ${student.student_first_name} ${student.student_last_name}`, { align: 'left' })
       .text(`Student Code: ${student.student_code}`, { align: 'left' })
       .text(`Term: Semester ${semesterVal}, Academic Year ${academicYearVal}`, { align: 'left' });
    
    doc.moveDown(1.5);
    doc.strokeColor('#CBD5E0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    if (approvedEnrollments.length === 0) {
      doc.fillColor('#718096')
         .fontSize(14)
         .text('No approved course registrations found for the active semester.', { align: 'center' });
    } else {
      const daysOrder = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const schedulesList: any[] = [];
      
      for (const enrollment of approvedEnrollments) {
        const section = enrollment.Course_Section;
        for (const schedule of section.Schedule) {
          schedulesList.push({
            day: schedule.day_of_week,
            start: schedule.start_time.toISOString().slice(11, 16),
            end: schedule.end_time.toISOString().slice(11, 16),
            subject: section.Subject.subject_name,
            room: schedule.Room.room_number,
            teacher: `${section.Staff.staff_first_name} ${section.Staff.staff_last_name}`
          });
        }
      }

      schedulesList.sort((a, b) => {
        const dayDiff = daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.start.localeCompare(b.start);
      });

      doc.fillColor('#1A202C').fontSize(14).text('Weekly Schedule', { underline: true });
      doc.moveDown(0.8);

      schedulesList.forEach((s) => {
        doc.fillColor('#2D3748').fontSize(11)
           .text(`${s.day} | ${s.start} - ${s.end}`, { continued: true })
           .fillColor('#4A5568')
           .text(`   Subject: ${s.subject}   Room: ${s.room}   Instructor: ${s.teacher}`);
        doc.moveDown(0.4);
      });
    }

    const fileName = `timetable_${student.student_code}.pdf`;

    return { doc, fileName };
  }
};
