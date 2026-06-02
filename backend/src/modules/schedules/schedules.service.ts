import prisma from '../../config/db';
import { ApiError } from '../../middlewares/errorHandler';
import crypto from 'crypto';
import { timeStringToMinutes, dateToMinutes } from '../../utils/time';

export const scheduleService = {
  /**
   * Create a new course schedule section time slot.
   */
  async createSchedule(adminId: string, data: { day_of_week: any; start_time: string; end_time: string; course_section_id: string; room_id: string }) {
    const { day_of_week, start_time, end_time, course_section_id, room_id } = data;

    const newStartMinutes = timeStringToMinutes(start_time);
    const newEndMinutes = timeStringToMinutes(end_time);

    if (newStartMinutes >= newEndMinutes) {
      throw new ApiError(400, 'Start time must be strictly before end time.');
    }

    // 1. Verify Course Section exists with detailed active checks
    const section = await prisma.course_Section.findUnique({
      where: { id: course_section_id },
      include: {
        Subject: true,
        Staff: {
          include: { Users: true }
        }
      }
    });
    if (!section) {
      throw new ApiError(404, 'Course Section not found');
    }

    // 2. Verify Room exists
    const room = await prisma.room.findUnique({
      where: { id: room_id }
    });
    if (!room) {
      throw new ApiError(404, 'Room not found');
    }

    // 3. Inactive Infrastructure, Subject, and Staff checks (Scenario 4)
    if (room.is_active === false) {
      throw new ApiError(400, `Selected Room ${room.room_number} is deactivated / in maintenance mode.`);
    }
    if (section.Subject.is_active === false) {
      throw new ApiError(400, `Selected Subject ${section.Subject.subject_name} is deactivated.`);
    }
    if (section.Staff.Users?.is_active === false) {
      throw new ApiError(400, `Assigned teacher ${section.Staff.staff_first_name} ${section.Staff.staff_last_name} is deactivated.`);
    }

    // 4. Classroom Capacity Fit Check (Scenario 1)
    if (room.capacity < section.max_capacity) {
      throw new ApiError(400, `Selected room capacity (${room.capacity}) is too small for the section's maximum capacity (${section.max_capacity}).`);
    }

    // 5. Lab suitability check (Scenario 4)
    const isLabSubject = 
      section.Subject.subject_name.toLowerCase().includes('lab') ||
      section.Subject.subject_code.toLowerCase().includes('lab');

    if (isLabSubject && !room.is_lab) {
      throw new ApiError(400, `The subject ${section.Subject.subject_name} requires a laboratory room. The selected room ${room.room_number} is not a lab.`);
    }

    // 6. Room Double-Booking Check (Scenario 2) - isolated by semester & academic year
    const roomSchedules = await prisma.schedule.findMany({
      where: {
        day_of_week: day_of_week as any,
        room_id,
        Course_Section: {
          semester: section.semester,
          academic_year: section.academic_year
        }
      }
    });

    const hasRoomOverlap = roomSchedules.some(s => {
      const sStart = dateToMinutes(s.start_time);
      const sEnd = dateToMinutes(s.end_time);
      return newStartMinutes < sEnd && newEndMinutes > sStart;
    });

    if (hasRoomOverlap) {
      throw new ApiError(409, `Room ${room.room_number} is already booked at an overlapping time on ${day_of_week} in the current term.`);
    }

    // 7. Teacher Double-Booking Check (Scenario 3) - isolated by semester & academic year
    const teacherSchedules = await prisma.schedule.findMany({
      where: {
        day_of_week: day_of_week as any,
        Course_Section: {
          staff_id: section.staff_id,
          semester: section.semester,
          academic_year: section.academic_year
        }
      }
    });

    const hasTeacherOverlap = teacherSchedules.some(s => {
      const sStart = dateToMinutes(s.start_time);
      const sEnd = dateToMinutes(s.end_time);
      return newStartMinutes < sEnd && newEndMinutes > sStart;
    });

    if (hasTeacherOverlap) {
      throw new ApiError(409, `The teacher of this section is already scheduled to teach at an overlapping time on ${day_of_week} in the current term.`);
    }

    const startDate = new Date(`1970-01-01T${start_time}Z`);
    const endDate = new Date(`1970-01-01T${end_time}Z`);

    return prisma.schedule.create({
      data: {
        id: crypto.randomUUID(),
        day_of_week: day_of_week as any,
        start_time: startDate,
        end_time: endDate,
        course_section_id,
        room_id,
        created_by: adminId,
        updated_by: adminId
      }
    });
  },

  /**
   * Update an existing schedule slot with capacity and double-booking validations.
   */
  async updateSchedule(id: string, adminId: string, data: { day_of_week?: any; start_time?: string; end_time?: string; course_section_id?: string; room_id?: string }) {
    const { day_of_week, start_time, end_time, course_section_id, room_id } = data;

    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: { Course_Section: true }
    });
    if (!schedule) {
      throw new ApiError(404, 'Schedule not found');
    }

    const finalDayOfWeek = day_of_week ?? schedule.day_of_week;
    const finalRoomId = room_id ?? schedule.room_id;
    const finalCourseSectionId = course_section_id ?? schedule.course_section_id;

    const section = await prisma.course_Section.findUnique({
      where: { id: finalCourseSectionId },
      include: {
        Subject: true,
        Staff: {
          include: { Users: true }
        }
      }
    });
    if (!section) {
      throw new ApiError(404, 'Course Section not found');
    }

    const room = await prisma.room.findUnique({
      where: { id: finalRoomId }
    });
    if (!room) {
      throw new ApiError(404, 'Room not found');
    }

    // 1. Inactive check (Scenario 4)
    if (room.is_active === false) {
      throw new ApiError(400, 'Selected Room is deactivated.');
    }
    if (section.Subject.is_active === false) {
      throw new ApiError(400, 'Selected Subject is deactivated.');
    }
    if (section.Staff.Users?.is_active === false) {
      throw new ApiError(400, 'Assigned Teacher is deactivated.');
    }

    // 2. Capacity Check
    if (room.capacity < section.max_capacity) {
      throw new ApiError(400, `Selected room capacity (${room.capacity}) is too small for the section's maximum capacity (${section.max_capacity}).`);
    }

    // 3. Lab suitability check
    const isLabSubject = 
      section.Subject.subject_name.toLowerCase().includes('lab') ||
      section.Subject.subject_code.toLowerCase().includes('lab');

    if (isLabSubject && !room.is_lab) {
      throw new ApiError(400, `The subject ${section.Subject.subject_name} requires a laboratory room. The selected room ${room.room_number} is not a lab.`);
    }

    const startStr = start_time ?? schedule.start_time.toISOString().slice(11, 19);
    const endStr = end_time ?? schedule.end_time.toISOString().slice(11, 19);

    const newStartMinutes = timeStringToMinutes(startStr);
    const newEndMinutes = timeStringToMinutes(endStr);

    if (newStartMinutes >= newEndMinutes) {
      throw new ApiError(400, 'Start time must be strictly before end time.');
    }

    // 4. Room Overlap Check (Excludes current schedule ID)
    const roomSchedules = await prisma.schedule.findMany({
      where: {
        day_of_week: finalDayOfWeek as any,
        room_id: finalRoomId,
        Course_Section: {
          semester: section.semester,
          academic_year: section.academic_year
        },
        id: { not: id }
      }
    });

    const hasRoomOverlap = roomSchedules.some(s => {
      const sStart = dateToMinutes(s.start_time);
      const sEnd = dateToMinutes(s.end_time);
      return newStartMinutes < sEnd && newEndMinutes > sStart;
    });

    if (hasRoomOverlap) {
      throw new ApiError(409, `Room ${room.room_number} is already booked at an overlapping time on ${finalDayOfWeek} in the current term.`);
    }

    // 5. Teacher Overlap Check (Excludes current schedule ID)
    const teacherSchedules = await prisma.schedule.findMany({
      where: {
        day_of_week: finalDayOfWeek as any,
        Course_Section: {
          staff_id: section.staff_id,
          semester: section.semester,
          academic_year: section.academic_year
        },
        id: { not: id }
      }
    });

    const hasTeacherOverlap = teacherSchedules.some(s => {
      const sStart = dateToMinutes(s.start_time);
      const sEnd = dateToMinutes(s.end_time);
      return newStartMinutes < sEnd && newEndMinutes > sStart;
    });

    if (hasTeacherOverlap) {
      throw new ApiError(409, `The teacher of this section is already scheduled to teach at an overlapping time on ${finalDayOfWeek} in the current term.`);
    }

    const startDate = new Date(`1970-01-01T${startStr}Z`);
    const endDate = new Date(`1970-01-01T${endStr}Z`);

    return prisma.schedule.update({
      where: { id },
      data: {
        day_of_week: finalDayOfWeek as any,
        start_time: startDate,
        end_time: endDate,
        course_section_id: finalCourseSectionId,
        room_id: finalRoomId,
        updated_by: adminId
      }
    });
  },

  /**
   * List schedules based on user role and query parameters.
   */
  async listSchedules(userId: string, userRole: string, query: { studentId?: string; staffId?: string }) {
    const { studentId, staffId } = query;

    // Admins get everything
    if (userRole === 'Admin') {
      const whereClause: any = {};
      if (studentId) {
        const enrollments = await prisma.student_Enrollment.findMany({
          where: { student_id: studentId, enrollment_status: 'approving' }
        });
        whereClause.course_section_id = { in: enrollments.map(e => e.course_section_id) };
      } else if (staffId) {
        whereClause.Course_Section = { staff_id: staffId };
      }

      return prisma.schedule.findMany({
        where: whereClause,
        include: {
          Room: true,
          Course_Section: {
            include: {
              Subject: true,
              Staff: {
                select: {
                  id: true,
                  staff_first_name: true,
                  staff_last_name: true
                }
              }
            }
          }
        }
      });
    }

    // If studentId provided
    if (studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });
      if (!student) {
        throw new ApiError(404, 'Student not found');
      }

      // Access check: must be student owner or student's assigned academic advisor
      let authorized = false;
      if (userRole === 'Student' && student.user_id === userId) {
        authorized = true;
      } else if (userRole === 'Staff') {
        const staff = await prisma.staff.findUnique({ where: { user_id: userId } });
        if (staff && student.advisor_id === staff.id) {
          authorized = true;
        }
      }

      if (!authorized) {
        throw new ApiError(403, 'Permission denied. You can only view your own timetable or the timetables of your advisees.');
      }

      const enrollments = await prisma.student_Enrollment.findMany({
        where: { student_id: student.id, enrollment_status: 'approving' }
      });

      if (enrollments.length === 0) {
        return [];
      }

      return prisma.schedule.findMany({
        where: {
          course_section_id: { in: enrollments.map(e => e.course_section_id) }
        },
        include: {
          Room: true,
          Course_Section: {
            include: {
              Subject: true,
              Staff: {
                select: {
                  id: true,
                  staff_first_name: true,
                  staff_last_name: true
                }
              }
            }
          }
        }
      });
    }

    // If staffId provided
    if (staffId) {
      const staff = await prisma.staff.findUnique({
        where: { id: staffId }
      });
      if (!staff) {
        throw new ApiError(404, 'Staff member not found');
      }

      if (staff.user_id !== userId) {
        throw new ApiError(403, 'Permission denied. You can only view your own teaching schedule.');
      }

      return prisma.schedule.findMany({
        where: {
          Course_Section: { staff_id: staff.id }
        },
        include: {
          Room: true,
          Course_Section: {
            include: {
              Subject: true,
              Staff: {
                select: {
                  id: true,
                  staff_first_name: true,
                  staff_last_name: true
                }
              }
            }
          }
        }
      });
    }

    // Defaults based on role
    if (userRole === 'Student') {
      const student = await prisma.student.findUnique({
        where: { user_id: userId }
      });
      if (!student) {
        throw new ApiError(404, 'Student profile not found');
      }

      const enrollments = await prisma.student_Enrollment.findMany({
        where: { student_id: student.id, enrollment_status: 'approving' }
      });

      if (enrollments.length === 0) {
        return [];
      }

      return prisma.schedule.findMany({
        where: {
          course_section_id: { in: enrollments.map(e => e.course_section_id) }
        },
        include: {
          Room: true,
          Course_Section: {
            include: {
              Subject: true,
              Staff: {
                select: {
                  id: true,
                  staff_first_name: true,
                  staff_last_name: true
                }
              }
            }
          }
        }
      });
    }

    if (userRole === 'Staff') {
      const staff = await prisma.staff.findUnique({
        where: { user_id: userId }
      });
      if (!staff) {
        throw new ApiError(404, 'Staff profile not found');
      }

      return prisma.schedule.findMany({
        where: {
          Course_Section: { staff_id: staff.id }
        },
        include: {
          Room: true,
          Course_Section: {
            include: {
              Subject: true,
              Staff: {
                select: {
                  id: true,
                  staff_first_name: true,
                  staff_last_name: true
                }
              }
            }
          }
        }
      });
    }

    throw new ApiError(400, 'Invalid request parameters');
  },

  /**
   * Delete a schedule slot.
   */
  async deleteSchedule(id: string) {
    const existing = await prisma.schedule.findUnique({
      where: { id }
    });
    if (!existing) {
      throw new ApiError(404, 'Schedule not found');
    }

    await prisma.schedule.delete({
      where: { id }
    });

    return { message: 'Schedule deleted successfully' };
  }
};
