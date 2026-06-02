import prisma from '../../config/db';
import { ApiError } from '../../middlewares/errorHandler';
import crypto from 'crypto';
import { getSetting } from '../../utils/settings';

export const subjectsService = {
  /**
   * Create a new subject curriculum configuration.
   */
  async createSubject(data: { subject_name: string; subject_code: string; credits: number }) {
    const { subject_name, subject_code, credits } = data;

    const maxCreditsVal = await getSetting('MAX_SUBJECT_CREDITS');
    const maxCredits = parseInt(maxCreditsVal, 10);
    if (credits < 1 || credits > maxCredits) {
      throw new ApiError(400, `Credits must be an integer between 1 and ${maxCredits}.`);
    }

    const existing = await prisma.subject.findUnique({
      where: { subject_code }
    });
    if (existing) {
      throw new ApiError(409, 'Subject code already exists');
    }

    return prisma.subject.create({
      data: {
        id: crypto.randomUUID(),
        subject_name,
        subject_code,
        credits
      }
    });
  },

  /**
   * List all subjects.
   */
  async listSubjects() {
    return prisma.subject.findMany();
  },

  /**
   * Fetch single subject details by ID.
   */
  async getSubject(id: string) {
    const subject = await prisma.subject.findUnique({
      where: { id }
    });
    if (!subject) {
      throw new ApiError(404, 'Subject not found');
    }
    return subject;
  },

  /**
   * Update subject details with restrictions.
   */
  async updateSubject(
    id: string,
    data: {
      subject_name?: string;
      subject_code?: string;
      credits?: number;
    }
  ) {
    const { subject_name, subject_code, credits } = data;

    const subject = await prisma.subject.findUnique({
      where: { id }
    });
    if (!subject) {
      throw new ApiError(404, 'Subject not found');
    }

    // Active Term Modification Restrictions (Scenario 2)
    const currentSemester = await getSetting('CURRENT_SEMESTER');
    const currentAcademicYear = await getSetting('CURRENT_ACADEMIC_YEAR');
    const currentYearNum = parseInt(currentAcademicYear, 10);

    const isChangingCodeOrCredits = 
      (subject_code !== undefined && subject_code !== subject.subject_code) ||
      (credits !== undefined && credits !== subject.credits);

    if (isChangingCodeOrCredits) {
      const activeSection = await prisma.course_Section.findFirst({
        where: {
          subject_id: id,
          semester: currentSemester as any,
          academic_year: currentYearNum
        }
      });
      if (activeSection) {
        throw new ApiError(409, 'Cannot edit code or credits for a Subject referenced by active course sections in the current semester.');
      }
    }

    if (credits !== undefined) {
      const maxCreditsVal = await getSetting('MAX_SUBJECT_CREDITS');
      const maxCredits = parseInt(maxCreditsVal, 10);
      if (credits < 1 || credits > maxCredits) {
        throw new ApiError(400, `Credits must be an integer between 1 and ${maxCredits}.`);
      }
    }

    if (subject_code && subject_code !== subject.subject_code) {
      const other = await prisma.subject.findUnique({
        where: { subject_code }
      });
      if (other) {
        throw new ApiError(409, 'Subject code already exists');
      }
    }

    return prisma.subject.update({
      where: { id },
      data: {
        subject_name: subject_name ?? subject.subject_name,
        subject_code: subject_code ?? subject.subject_code,
        credits: credits !== undefined ? credits : subject.credits
      }
    });
  },

  /**
   * Delete a subject (performing soft-delete if historical data exists).
   */
  async deleteSubject(id: string) {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        Course_Section: true
      }
    });

    if (!subject) {
      throw new ApiError(404, 'Subject not found');
    }

    // Load current term configurations
    const currentSemester = await getSetting('CURRENT_SEMESTER');
    const currentAcademicYear = await getSetting('CURRENT_ACADEMIC_YEAR');
    const currentYearNum = parseInt(currentAcademicYear, 10);

    // Check if subject is referenced by active course sections in current term
    const activeSections = subject.Course_Section.filter(
      cs => cs.semester === currentSemester && cs.academic_year === currentYearNum
    );

    if (activeSections.length > 0) {
      throw new ApiError(409, 'Cannot delete Subject referenced by an active Course Section in the current semester.');
    }

    const hasHistoricalSections = subject.Course_Section.length > 0;

    if (hasHistoricalSections) {
      // Perform soft delete
      const updated = await prisma.subject.update({
        where: { id },
        data: { is_active: false }
      });
      return { softDeleted: true, subject: updated, message: 'Subject has historical references. Subject soft-deleted (set inactive) to preserve academic integrity.' };
    }

    // Hard delete
    await prisma.subject.delete({
      where: { id }
    });

    return { softDeleted: false, message: 'Subject deleted successfully' };
  },

  /**
   * Reactivate a subject profile.
   */
  async reactivateSubject(id: string) {
    const subject = await prisma.subject.findUnique({
      where: { id }
    });

    if (!subject) {
      throw new ApiError(404, 'Subject not found');
    }

    return prisma.subject.update({
      where: { id },
      data: { is_active: true }
    });
  }
};
