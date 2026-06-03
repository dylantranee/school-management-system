import prisma from '../../config/db';
import { ApiError } from '../../middlewares/errorHandler';
import { getSetting } from '../../utils/settings';
import crypto from 'crypto';
import { dateToMinutes } from '../../utils/time';

export const courseSectionService = {
  /**
   * Create a new course section for a subject in the active term.
   */
  async createCourseSection(adminId: string, data: { semester: any; academic_year: number; section_number: string; max_capacity: number; subject_id: string; staff_id: string }) {
    const { semester, academic_year, section_number, max_capacity, subject_id, staff_id } = data;

    // 1. Verify Subject exists and is active
    const subject = await prisma.subject.findUnique({
      where: { id: subject_id }
    });
    if (!subject) {
      throw new ApiError(404, 'Subject not found');
    }
    if (subject.is_active === false) {
      throw new ApiError(400, 'Assigned Subject is currently deactivated');
    }

    // 2. Verify Staff exists and is active
    const staff = await prisma.staff.findUnique({
      where: { id: staff_id },
      include: { Users: true }
    });
    if (!staff) {
      throw new ApiError(404, 'Staff member not found');
    }
    if (staff.Users && staff.Users.is_active === false) {
      throw new ApiError(400, 'Assigned Staff member is currently deactivated');
    }

    // 3. Verify max_capacity does not exceed MAX_ROOM_CAPACITY limit (Scenario 1)
    const maxRoomCapVal = await getSetting('MAX_ROOM_CAPACITY');
    const maxRoomCap = parseInt(maxRoomCapVal, 10);
    if (max_capacity > maxRoomCap) {
      throw new ApiError(400, `Maximum capacity cannot exceed the global limit of ${maxRoomCap} students.`);
    }

    // 4. Verify semester and academic_year are not in the past relative to active configurations (Scenario 1)
    const currentSemester = await getSetting('CURRENT_SEMESTER');
    const currentAcademicYear = await getSetting('CURRENT_ACADEMIC_YEAR');
    const curSemNum = parseInt(currentSemester, 10);
    const curYearNum = parseInt(currentAcademicYear, 10);
    const reqSemNum = parseInt(semester, 10);

    if (academic_year < curYearNum || (academic_year === curYearNum && reqSemNum < curSemNum)) {
      throw new ApiError(400, 'Cannot create a course section in a past term.');
    }

    // 5. Verify Unique constraint: subject_id + semester + academic_year + section_number
    const existing = await prisma.course_Section.findFirst({
      where: {
        subject_id,
        semester: semester as any,
        academic_year,
        section_number
      }
    });

    if (existing) {
      throw new ApiError(409, `Course Section already exists for this subject, semester, and section number (${section_number})`);
    }

    return prisma.course_Section.create({
      data: {
        id: crypto.randomUUID(),
        semester: semester as any,
        academic_year,
        section_number,
        max_capacity,
        subject_id,
        staff_id,
        created_by: adminId,
        updated_by: adminId
      }
    });
  },

  async listCourseSections(query?: { page?: number; limit?: number; semester?: string; academic_year?: number; search?: string }) {
    const page = query?.page ? Number(query.page) : undefined;
    const limit = query?.limit ? Number(query.limit) : undefined;
    const semester = query?.semester;
    const academic_year = query?.academic_year;
    const search = query?.search;

    const where: any = {};
    if (semester !== undefined) {
      if (semester === '1' || semester === 'SEMESTER_1') {
        where.semester = 'SEMESTER_1';
      } else if (semester === '2' || semester === 'SEMESTER_2') {
        where.semester = 'SEMESTER_2';
      } else if (semester === '3' || semester === 'SEMESTER_3') {
        where.semester = 'SEMESTER_3';
      } else {
        where.semester = semester as any;
      }
    }
    if (academic_year !== undefined) {
      where.academic_year = Number(academic_year);
    }

    if (search) {
      where.OR = [
        {
          Subject: {
            subject_name: { contains: search }
          }
        },
        {
          Subject: {
            subject_code: { contains: search }
          }
        },
        {
          Staff: {
            staff_first_name: { contains: search }
          }
        },
        {
          Staff: {
            staff_last_name: { contains: search }
          }
        }
      ];
    }

    if (page !== undefined || limit !== undefined) {
      const activePage = page || 1;
      const activeLimit = limit || 10;
      const skip = (activePage - 1) * activeLimit;

      const [courseSections, totalCount] = await Promise.all([
        prisma.course_Section.findMany({
          where,
          include: {
            Subject: true,
            Staff: {
              select: {
                id: true,
                employee_code: true,
                staff_first_name: true,
                staff_last_name: true,
                department: true
              }
            },
            _count: {
              select: { Student_Enrollment: true }
            },
            Schedule: true
          },
          skip,
          take: activeLimit
        }),
        prisma.course_Section.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / activeLimit);
      return {
        courseSections,
        pagination: {
          totalCount,
          totalPages,
          currentPage: activePage,
          limit: activeLimit
        }
      };
    }

    return prisma.course_Section.findMany({
      where,
      include: {
        Subject: true,
        Staff: {
          select: {
            id: true,
            employee_code: true,
            staff_first_name: true,
            staff_last_name: true,
            department: true
          }
        },
        _count: {
          select: { Student_Enrollment: true }
        },
        Schedule: true
      }
    });
  },

  /**
   * Retrieve a single course section with registrations.
   */
  async getCourseSection(id: string) {
    const section = await prisma.course_Section.findUnique({
      where: { id },
      include: {
        Subject: true,
        Staff: {
          select: {
            id: true,
            employee_code: true,
            staff_first_name: true,
            staff_last_name: true,
            department: true
          }
        },
        Student_Enrollment: {
          include: {
            Student: true
          }
        }
      }
    });
    if (!section) {
      throw new ApiError(404, 'Course Section not found');
    }
    return section;
  },

  /**
   * Update a course section's details, enforcing teacher reassignments and limits.
   */
  async updateCourseSection(id: string, adminId: string, data: { semester?: any; academic_year?: number; section_number?: string; max_capacity?: number; subject_id?: string; staff_id?: string }) {
    const { semester, academic_year, section_number, max_capacity, subject_id, staff_id } = data;

    const section = await prisma.course_Section.findUnique({
      where: { id },
      include: {
        _count: {
          select: { Student_Enrollment: true }
        }
      }
    });
    if (!section) {
      throw new ApiError(404, 'Course Section not found');
    }

    // 1. Enforce max_capacity limits (Scenario 2)
    if (max_capacity !== undefined) {
      const maxRoomCapVal = await getSetting('MAX_ROOM_CAPACITY');
      const maxRoomCap = parseInt(maxRoomCapVal, 10);
      if (max_capacity > maxRoomCap) {
        throw new ApiError(400, `Maximum capacity cannot exceed the global limit of ${maxRoomCap} students.`);
      }

      const currentEnrolled = section._count.Student_Enrollment;
      if (max_capacity < currentEnrolled) {
        throw new ApiError(409, `Cannot reduce capacity to ${max_capacity} because there are already ${currentEnrolled} students enrolled in this section.`);
      }
    }

    // 2. Validate term settings are not in the past relative to active configuration (Scenario 2)
    const parsePrismaSemester = (sem: string): number => {
      if (sem === 'SEMESTER_1' || sem === '1') return 1;
      if (sem === 'SEMESTER_2' || sem === '2') return 2;
      if (sem === 'SEMESTER_3' || sem === '3') return 3;
      return 1;
    };

    const finalSemester = semester ?? section.semester;
    const finalSemNum = parsePrismaSemester(finalSemester);
    const finalYear = academic_year !== undefined ? parseInt(academic_year as any, 10) : section.academic_year;

    const currentSemester = await getSetting('CURRENT_SEMESTER');
    const currentAcademicYear = await getSetting('CURRENT_ACADEMIC_YEAR');
    const curSemNum = parseInt(currentSemester, 10);
    const curYearNum = parseInt(currentAcademicYear, 10);

    if (finalYear < curYearNum || (finalYear === curYearNum && finalSemNum < curSemNum)) {
      throw new ApiError(400, 'Cannot set course section to a past term.');
    }

    // 3. Validate Subject if changing
    if (subject_id && subject_id !== section.subject_id) {
      const subject = await prisma.subject.findUnique({ where: { id: subject_id } });
      if (!subject) throw new ApiError(404, 'Subject not found');
      if (subject.is_active === false) throw new ApiError(400, 'Selected Subject is currently deactivated');
    }

    // 4. Validate Staff if changing
    if (staff_id && staff_id !== section.staff_id) {
      const staff = await prisma.staff.findUnique({
        where: { id: staff_id },
        include: { Users: true }
      });
      if (!staff) throw new ApiError(404, 'Staff member not found');
      if (staff.Users && staff.Users.is_active === false) throw new ApiError(400, 'Selected Staff member is currently deactivated');

      // Section Teacher Reassignment Check (Scenario 4)
      const thisSectionSchedules = await prisma.schedule.findMany({
        where: { course_section_id: id }
      });

      for (const slot of thisSectionSchedules) {
        const slotStart = dateToMinutes(slot.start_time);
        const slotEnd = dateToMinutes(slot.end_time);

        // Find other schedules for the new teacher in the target semester/year, excluding this section's schedules
        const teacherSchedules = await prisma.schedule.findMany({
          where: {
            Course_Section: {
              staff_id,
              semester: finalSemester as any,
              academic_year: finalYear
            },
            course_section_id: { not: id }
          }
        });

        for (const tSlot of teacherSchedules) {
          if (slot.day_of_week === tSlot.day_of_week) {
            const tStart = dateToMinutes(tSlot.start_time);
            const tEnd = dateToMinutes(tSlot.end_time);

            if (slotStart < tEnd && slotEnd > tStart) {
              throw new ApiError(409, `Teacher reassignment failed due to schedule overlap conflict on ${slot.day_of_week}.`);
            }
          }
        }
      }
    }

    // 5. Validate unique constraint if unique fields are changing
    const finalSubjectId = subject_id ?? section.subject_id;
    const finalSectionNo = section_number ?? section.section_number;

    if (
      finalSubjectId !== section.subject_id ||
      finalSemester !== section.semester ||
      finalYear !== section.academic_year ||
      finalSectionNo !== section.section_number
    ) {
      const other = await prisma.course_Section.findFirst({
        where: {
          subject_id: finalSubjectId,
          semester: finalSemester as any,
          academic_year: finalYear,
          section_number: finalSectionNo,
          id: { not: id }
        }
      });
      if (other) {
        throw new ApiError(409, 'Another course section already exists with this combination of subject, semester, academic year, and section number.');
      }
    }

    return prisma.course_Section.update({
      where: { id },
      data: {
        semester: semester ?? section.semester,
        academic_year: academic_year !== undefined ? parseInt(academic_year as any, 10) : section.academic_year,
        section_number: section_number ?? section.section_number,
        max_capacity: max_capacity ?? section.max_capacity,
        subject_id: subject_id ?? section.subject_id,
        staff_id: staff_id ?? section.staff_id,
        updated_by: adminId
      }
    });
  },

  /**
   * Delete a course section.
   */
  async deleteCourseSection(id: string) {
    const section = await prisma.course_Section.findUnique({
      where: { id },
      include: {
        _count: {
          select: { Student_Enrollment: true }
        }
      }
    });

    if (!section) {
      throw new ApiError(404, 'Course Section not found');
    }

    // 1. Enforce deletion constraint (Scenario 5)
    if (section._count.Student_Enrollment > 0) {
      throw new ApiError(409, 'Cannot delete Course Section because it has active student enrollments.');
    }

    await prisma.course_Section.delete({
      where: { id }
    });

    return { message: 'Course Section deleted successfully' };
  }
};
