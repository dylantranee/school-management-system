import prisma from '../../config/db';
import { ApiError } from '../../middlewares/errorHandler';
import crypto from 'crypto';
import { getSetting } from '../../utils/settings';

export const roomsService = {
  /**
   * Create a new classroom.
   */
  async createRoom(data: { room_number: string; capacity: number; is_lab?: boolean }) {
    const { room_number, capacity, is_lab } = data;

    const maxCapacityVal = await getSetting('MAX_ROOM_CAPACITY');
    const maxCapacity = parseInt(maxCapacityVal, 10);
    if (capacity < 1 || capacity > maxCapacity) {
      throw new ApiError(400, `Capacity must be an integer between 1 and ${maxCapacity}.`);
    }

    const existing = await prisma.room.findUnique({
      where: { room_number }
    });
    if (existing) {
      throw new ApiError(409, 'Room number already exists');
    }

    return prisma.room.create({
      data: {
        id: crypto.randomUUID(),
        room_number,
        capacity,
        is_lab: is_lab ?? false
      }
    });
  },

  /**
   * List all classrooms.
   */
  async listRooms() {
    return prisma.room.findMany();
  },

  /**
   * Fetch room details by ID.
   */
  async getRoom(id: string) {
    const room = await prisma.room.findUnique({
      where: { id }
    });
    if (!room) {
      throw new ApiError(404, 'Room not found');
    }
    return room;
  },

  /**
   * Update classroom details with capacity, type, and status constraint checks.
   */
  async updateRoom(
    id: string,
    data: {
      room_number?: string;
      capacity?: number;
      is_lab?: boolean;
      is_active?: boolean;
    }
  ) {
    const { room_number, capacity, is_lab, is_active } = data;

    const room = await prisma.room.findUnique({
      where: { id }
    });
    if (!room) {
      throw new ApiError(404, 'Room not found');
    }

    // Active Term configurations for validations
    const currentSemester = await getSetting('CURRENT_SEMESTER');
    const currentAcademicYear = await getSetting('CURRENT_ACADEMIC_YEAR');
    const currentYearNum = parseInt(currentAcademicYear, 10);

    if (capacity !== undefined) {
      const maxCapacityVal = await getSetting('MAX_ROOM_CAPACITY');
      const maxCapacity = parseInt(maxCapacityVal, 10);
      if (capacity < 1 || capacity > maxCapacity) {
        throw new ApiError(400, `Capacity must be an integer between 1 and ${maxCapacity}.`);
      }

      // Capacity Constraint Check: if lowered, check scheduled active course sections (Scenario 2)
      if (capacity < room.capacity) {
        const activeSectionsInRoom = await prisma.course_Section.findMany({
          where: {
            semester: currentSemester as any,
            academic_year: currentYearNum,
            Schedule: {
              some: { room_id: id }
            }
          },
          include: {
            _count: {
              select: {
                Student_Enrollment: {
                  where: {
                    enrollment_status: { in: ['pending', 'approving'] }
                  }
                }
              }
            }
          }
        });

        for (const section of activeSectionsInRoom) {
          if (capacity < section.max_capacity) {
            throw new ApiError(409, `Cannot lower room capacity below the maximum capacity (${section.max_capacity}) of active course section ${section.section_number} scheduled in this room.`);
          }
          if (capacity < section._count.Student_Enrollment) {
            throw new ApiError(409, `Cannot lower room capacity below the current enrollment count (${section._count.Student_Enrollment}) of active course section ${section.section_number} scheduled in this room.`);
          }
        }
      }
    }

    // Lab Suitability Check (Scenario 2)
    if (is_lab === false && room.is_lab === true) {
      const activeLabSchedules = await prisma.schedule.findMany({
        where: {
          room_id: id,
          Course_Section: {
            semester: currentSemester as any,
            academic_year: currentYearNum
          }
        },
        include: {
          Course_Section: {
            include: { Subject: true }
          }
        }
      });

      const conflictLabSchedule = activeLabSchedules.find(s => {
        const name = s.Course_Section.Subject.subject_name.toLowerCase();
        const code = s.Course_Section.Subject.subject_code.toLowerCase();
        return name.includes('lab') || code.includes('lab');
      });

      if (conflictLabSchedule) {
        throw new ApiError(409, `Cannot change room to non-lab: it is currently hosting a lab-requiring subject "${conflictLabSchedule.Course_Section.Subject.subject_name}".`);
      }
    }

    // Room Maintenance Mode check (Scenario 3)
    if (is_active === false && room.is_active !== false) {
      const activeSchedulesInRoom = await prisma.schedule.findMany({
        where: {
          room_id: id,
          Course_Section: {
            semester: currentSemester as any,
            academic_year: currentYearNum
          }
        },
        include: {
          Course_Section: true
        }
      });

      if (activeSchedulesInRoom.length > 0) {
        const sectionCodes = Array.from(new Set(activeSchedulesInRoom.map(s => s.Course_Section.section_number)));
        throw new ApiError(409, `Cannot place room in maintenance mode: it is currently used by active course sections: ${sectionCodes.join(', ')}.`);
      }
    }

    if (room_number && room_number !== room.room_number) {
      const trimmedNumber = room_number.trim();
      const other = await prisma.room.findFirst({
        where: {
          room_number: { equals: trimmedNumber }
        }
      });
      if (other && other.id !== id) {
        throw new ApiError(409, 'Room number already exists');
      }
    }

    return prisma.room.update({
      where: { id },
      data: {
        room_number: room_number !== undefined ? room_number.trim() : room.room_number,
        capacity: capacity !== undefined ? capacity : room.capacity,
        is_lab: is_lab !== undefined ? is_lab : room.is_lab,
        is_active: is_active !== undefined ? is_active : room.is_active
      }
    });
  }
};
