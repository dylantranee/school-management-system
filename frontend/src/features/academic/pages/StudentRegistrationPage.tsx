import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, AlertTriangle, XCircle, Calendar, Clock, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useCourseSections,
  useMyEnrollments,
  useSystemSettings,
  useEnrollStudentMutation,
  useDropEnrollmentMutation,
  useSchedules
} from '../api/academic.hooks';

export const StudentRegistrationPage = () => {
  const [activeTab, setActiveTab] = useState<'register' | 'timetable'>('register');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [selectedDay, setSelectedDay] = useState<'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'>('MON');
  const [weekOffset, setWeekOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query to prevent excessive queries
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset page to 1 when search query changes
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const { data: settings = [] } = useSystemSettings();

  const currentSemester = settings.find((s: any) => s.key === 'CURRENT_SEMESTER')?.value;
  const currentAcademicYearVal = settings.find((s: any) => s.key === 'CURRENT_ACADEMIC_YEAR')?.value;
  const currentAcademicYear = currentAcademicYearVal ? Number(currentAcademicYearVal) : undefined;

  const { data: sectionsData } = useCourseSections({
    page,
    limit,
    semester: currentSemester,
    academic_year: currentAcademicYear,
    search: debouncedSearchQuery || undefined
  });
  const { data: myEnrollments = [] } = useMyEnrollments();
  const { data: schedules = [] } = useSchedules();

  const enrollMutation = useEnrollStudentMutation();
  const dropMutation = useDropEnrollmentMutation();

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [draftSections, setDraftSections] = useState<string[]>([]);
  const [draftDrops, setDraftDrops] = useState<string[]>([]);

  // Set descriptive page title for SEO
  useEffect(() => {
    document.title = 'Course Registration - School Management System';
  }, []);

  // Parse settings reactively
  const start = settings.find((s: any) => s.key === 'REGISTRATION_START_DATE')?.value || '';
  const end = settings.find((s: any) => s.key === 'REGISTRATION_END_DATE')?.value || '';
  const maxCredits = parseInt(settings.find((s: any) => s.key === 'MAX_SEMESTER_CREDITS')?.value || '20', 10);
  
  const now = new Date();
  const isOpen = start && end && now >= new Date(start) && now <= new Date(end);
  const registrationWindow = { start, end, isOpen };

  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const getEventTimes = (startTime: string | Date, endTime: string | Date) => {
    const getIsoStr = (val: string | Date) => {
      if (val instanceof Date) return val.toISOString();
      return val;
    };
    const startStr = getIsoStr(startTime);
    const endStr = getIsoStr(endTime);

    const extractTime = (str: string) => {
      if (str.includes('T')) {
        return str.substr(11, 5);
      }
      const parts = str.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    };

    const startLocal = extractTime(startStr);
    const endLocal = extractTime(endStr);

    return { startLocal, endLocal };
  };

  const CALENDAR_START = 480; // 08:00 AM
  const CALENDAR_END = 1080;  // 06:00 PM
  const TOTAL_MINUTES = CALENDAR_END - CALENDAR_START;

  const days = [
    { key: 'MON', label: 'MON', offset: 0 },
    { key: 'TUE', label: 'TUE', offset: 1 },
    { key: 'WED', label: 'WED', offset: 2 },
    { key: 'THU', label: 'THU', offset: 3 },
    { key: 'FRI', label: 'FRI', offset: 4 },
    { key: 'SAT', label: 'SAT', offset: 5 }
  ];

  const hours = Array.from({ length: 11 }, (_, i) => 8 + i);

  const activeDays = viewMode === 'week' ? days : days.filter(d => d.key === selectedDay);

  const getWeekDayDate = (dayOffset: number): Date => {
    const current = new Date();
    const currentDay = current.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const targetDate = new Date(current);
    targetDate.setDate(current.getDate() + distanceToMonday + dayOffset + (weekOffset * 7));
    targetDate.setHours(0, 0, 0, 0);
    return targetDate;
  };

  const getWeekDayDateNumber = (dayOffset: number): number => {
    return getWeekDayDate(dayOffset).getDate();
  };

  const startVal = settings.find((s: any) => s.key === 'SEMESTER_START_DATE')?.value;
  const endVal = settings.find((s: any) => s.key === 'SEMESTER_END_DATE')?.value;

  const isDateInSemester = (date: Date): boolean => {
    if (!startVal || !endVal) return true;
    const startDate = new Date(startVal);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endVal);
    endDate.setHours(23, 59, 59, 999);
    return date >= startDate && date <= endDate;
  };

  const getWeekRangeString = (): string => {
    const current = new Date();
    const currentDay = current.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(current);
    monday.setDate(current.getDate() + distanceToMonday + (weekOffset * 7));
    
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const mondayStr = monday.toLocaleDateString('en-US', formatOptions);
    const saturdayStr = saturday.toLocaleDateString('en-US', formatOptions);
    const yearStr = monday.getFullYear();

    return `${mondayStr} - ${saturdayStr}, ${yearStr}`;
  };

  const getDayDateString = (dayKey: string): string => {
    const targetDay = days.find(d => d.key === dayKey);
    if (!targetDay) return '';
    const current = new Date();
    const currentDay = current.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const targetDate = new Date(current);
    targetDate.setDate(current.getDate() + distanceToMonday + targetDay.offset + (weekOffset * 7));
    
    return targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handlePrevWeekOrDay = () => {
    if (viewMode === 'week') {
      setWeekOffset(prev => prev - 1);
    } else {
      const currentIndex = days.findIndex(d => d.key === selectedDay);
      if (currentIndex === 0) {
        setWeekOffset(prev => prev - 1);
        setSelectedDay(days[5].key as any);
      } else {
        setSelectedDay(days[currentIndex - 1].key as any);
      }
    }
  };

  const handleNextWeekOrDay = () => {
    if (viewMode === 'week') {
      setWeekOffset(prev => prev + 1);
    } else {
      const currentIndex = days.findIndex(d => d.key === selectedDay);
      if (currentIndex === 5) {
        setWeekOffset(prev => prev + 1);
        setSelectedDay(days[0].key as any);
      } else {
        setSelectedDay(days[currentIndex + 1].key as any);
      }
    }
  };

  const sections = Array.isArray(sectionsData) ? sectionsData : sectionsData?.courseSections || [];
  const pagination = (!Array.isArray(sectionsData) && sectionsData?.pagination) || { totalPages: 1, currentPage: 1, totalCount: 0 };

  const checkSchedulesOverlap = (sched1: any, sched2: any): boolean => {
    if (sched1.day_of_week !== sched2.day_of_week) return false;
    const t1 = getEventTimes(sched1.start_time, sched1.end_time);
    const t2 = getEventTimes(sched2.start_time, sched2.end_time);
    const s1 = timeToMinutes(t1.startLocal);
    const e1 = timeToMinutes(t1.endLocal);
    const s2 = timeToMinutes(t2.startLocal);
    const e2 = timeToMinutes(t2.endLocal);
    return s1 < e2 && e1 > s2;
  };

  const handleAddToDraft = (section: any) => {
    setErrorMsg('');
    setSuccessMsg('');

    // 1. Check duplicate subject in active registrations (excluding draft drops)
    const duplicateRegistered = myEnrollments.find(
      (e: any) => e.Course_Section?.subject_id === section.subject_id && !draftDrops.includes(e.id)
    );
    if (duplicateRegistered) {
      setErrorMsg(`You have already registered for ${duplicateRegistered.Course_Section?.Subject?.subject_name || 'this subject'} in the current term.`);
      return;
    }

    // 2. Check duplicate subject in draft sections
    const duplicateDraft = draftSections.find(id => {
      const s = sections.find((sec: any) => sec.id === id);
      return s?.subject_id === section.subject_id;
    });
    if (duplicateDraft) {
      const s = sections.find((sec: any) => sec.id === duplicateDraft);
      setErrorMsg(`You already have a section of ${s?.Subject?.subject_name || 'this subject'} in your draft.`);
      return;
    }

    // 3. Check credit cap
    const nextCredits = currentCredits + (section.Subject?.credits || 0);
    if (nextCredits > maxCredits) {
      setErrorMsg(`Adding this section would exceed your maximum semester credit limit of ${maxCredits} credits.`);
      return;
    }

    // 4. Check schedule overlap with registered sections (excluding draft drops)
    const activeEnrolledSections = myEnrollments
      .filter((e: any) => !draftDrops.includes(e.id))
      .map((e: any) => e.Course_Section);

    // Get all sections currently in draft
    const draftSecs = draftSections.map(id => sections.find((sec: any) => sec.id === id)).filter(Boolean);

    for (const newSched of section.Schedule || []) {
      // Check overlap with enrolled
      for (const enrolledSec of activeEnrolledSections) {
        for (const enrolledSched of enrolledSec?.Schedule || []) {
          if (checkSchedulesOverlap(newSched, enrolledSched)) {
            setErrorMsg(`Schedule conflict: This section overlaps with registered course "${enrolledSec?.Subject?.subject_name}" on ${newSched.day_of_week}.`);
            return;
          }
        }
      }

      // Check overlap with draft
      for (const draftSec of draftSecs) {
        for (const draftSched of draftSec?.Schedule || []) {
          if (checkSchedulesOverlap(newSched, draftSched)) {
            setErrorMsg(`Schedule conflict: This section overlaps with draft course "${draftSec?.Subject?.subject_name}" on ${newSched.day_of_week}.`);
            return;
          }
        }
      }
    }

    if (!draftSections.includes(section.id)) {
      setDraftSections(prev => [...prev, section.id]);
    }
  };

  const handleRemoveFromDraft = (sectionId: string) => {
    setDraftSections(prev => prev.filter(id => id !== sectionId));
  };

  const handleAddToDropDraft = (enrollmentId: string) => {
    if (!draftDrops.includes(enrollmentId)) {
      setDraftDrops(prev => [...prev, enrollmentId]);
    }
  };

  const handleRemoveFromDropDraft = (enrollmentId: string) => {
    setDraftDrops(prev => prev.filter(id => id !== enrollmentId));
  };

  const handleConfirmRegistration = async () => {
    if (draftSections.length === 0 && draftDrops.length === 0) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Drop sections
      if (draftDrops.length > 0) {
        await Promise.all(
          draftDrops.map(enrollmentId =>
            dropMutation.mutateAsync(enrollmentId)
          )
        );
      }

      // 2. Enroll sections
      if (draftSections.length > 0) {
        await Promise.all(
          draftSections.map(sectionId =>
            enrollMutation.mutateAsync({ course_section_id: sectionId })
          )
        );
      }

      setSuccessMsg('Registration changes confirmed successfully!');
      setDraftSections([]);
      setDraftDrops([]);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit enrollment changes.');
    }
  };

  const getPaginationPages = (current: number, total: number) => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (current > 3) {
        pages.push('...');
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push('...');
      }

      pages.push(total);
    }

    return pages;
  };

  const isLoading = enrollMutation.isPending;

  // Calculate current credit load
  const activeEnrollments = myEnrollments.filter(
    (e: any) => e.enrollment_status === 'pending' || e.enrollment_status === 'approving'
  );
  
  const enrolledCredits = activeEnrollments.reduce((acc: number, e: any) => acc + (e.Course_Section?.Subject?.credits || 0), 0);
  const draftCredits = draftSections.reduce((acc: number, id: string) => {
    const s = sections.find((sec: any) => sec.id === id);
    return acc + (s?.Subject?.credits || 0);
  }, 0);
  const droppedCredits = draftDrops.reduce((acc: number, id: string) => {
    const e = myEnrollments.find((enroll: any) => enroll.id === id);
    return acc + (e?.Course_Section?.Subject?.credits || 0);
  }, 0);

  const pastelPalettes = [
    {
      bg: 'bg-indigo-50 dark:bg-indigo-950/20',
      border: 'border-indigo-200 dark:border-indigo-900/30',
      text: 'text-indigo-700 dark:text-indigo-300',
      subText: 'text-indigo-600 dark:text-indigo-400',
      hoverBg: 'hover:bg-indigo-100/70 dark:hover:bg-indigo-950/40'
    },
    {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      subText: 'text-emerald-600 dark:text-emerald-400',
      hoverBg: 'hover:bg-emerald-100/70 dark:hover:bg-emerald-950/40'
    },
    {
      bg: 'bg-sky-50 dark:bg-sky-950/20',
      border: 'border-sky-200 dark:border-sky-900/30',
      text: 'text-sky-700 dark:text-sky-300',
      subText: 'text-sky-600 dark:text-sky-400',
      hoverBg: 'hover:bg-sky-100/70 dark:hover:bg-sky-950/40'
    },
    {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      subText: 'text-amber-600 dark:text-amber-400',
      hoverBg: 'hover:bg-amber-100/70 dark:hover:bg-amber-950/40'
    },
    {
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      border: 'border-rose-200 dark:border-rose-900/30',
      text: 'text-rose-700 dark:text-rose-300',
      subText: 'text-rose-600 dark:text-rose-400',
      hoverBg: 'hover:bg-rose-100/70 dark:hover:bg-rose-950/40'
    },
    {
      bg: 'bg-violet-50 dark:bg-violet-950/20',
      border: 'border-violet-200 dark:border-violet-900/30',
      text: 'text-violet-700 dark:text-violet-300',
      subText: 'text-violet-600 dark:text-violet-400',
      hoverBg: 'hover:bg-violet-100/70 dark:hover:bg-violet-950/40'
    },
    {
      bg: 'bg-teal-50 dark:bg-teal-950/20',
      border: 'border-teal-200 dark:border-teal-900/30',
      text: 'text-teal-700 dark:text-teal-300',
      subText: 'text-teal-600 dark:text-teal-400',
      hoverBg: 'hover:bg-teal-100/70 dark:hover:bg-teal-950/40'
    },
    {
      bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20',
      border: 'border-fuchsia-200 dark:border-fuchsia-900/30',
      text: 'text-fuchsia-700 dark:text-fuchsia-300',
      subText: 'text-fuchsia-600 dark:text-fuchsia-400',
      hoverBg: 'hover:bg-fuchsia-100/70 dark:hover:bg-fuchsia-950/40'
    }
  ];

  const getCoursePastelColor = (subjectCode: string) => {
    let hash = 0;
    for (let i = 0; i < subjectCode.length; i++) {
      hash = subjectCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % pastelPalettes.length;
    return pastelPalettes[index];
  };

  const getSlotNumber = (timeVal: string | Date): number => {
    const timeStr = typeof timeVal === 'string' ? timeVal : new Date(timeVal).toISOString();
    const timeOnly = timeStr.includes('T') ? timeStr.split('T')[1].substring(0, 5) : timeStr.substring(0, 5);
    const [h, m] = timeOnly.split(':').map(Number);
    const mins = h * 60 + m;

    if (mins >= 480 && mins < 530) return 1;
    if (mins >= 530 && mins < 580) return 2;
    if (mins >= 580 && mins < 635) return 3;
    if (mins >= 635 && mins < 685) return 4;
    if (mins >= 685 && mins < 735) return 5;
    if (mins >= 735 && mins < 795) return 6;
    if (mins >= 795 && mins < 845) return 7;
    if (mins >= 845 && mins < 895) return 8;
    if (mins >= 895 && mins < 950) return 9;
    if (mins >= 950 && mins < 1000) return 10;
    if (mins >= 1000 && mins < 1050) return 11;
    if (mins >= 1050) return 12;
    return 1;
  };

  const getSectionScheduleDetails = (schedules: any[]) => {
    if (!schedules || schedules.length === 0) {
      return { days: '-', startSlots: '-', sumSlots: '-' };
    }
    
    const parsed = schedules.map(s => {
      const startNum = getSlotNumber(s.start_time);
      const endNum = getSlotNumber(s.end_time);
      const sum = endNum >= startNum ? (endNum - startNum + 1) : 1;
      return {
        day: s.day_of_week,
        startSlot: `${startNum}`,
        sumSlot: `${sum}`
      };
    });

    return {
      days: parsed.map(p => p.day).join(', '),
      startSlots: parsed.map(p => p.startSlot).join(', '),
      sumSlots: parsed.map(p => p.sumSlot).join(', ')
    };
  };

  const currentCredits = enrolledCredits + draftCredits - droppedCredits;

  const formatWindowDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-6 md:p-8 max-w-[1280px] mx-auto w-full">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-[32px] tracking-[-0.8px] font-semibold text-foreground">
            {activeTab === 'register' ? 'Course Registration' : 'My Timetable'}
          </h1>
          <p className="font-sans text-[16px] text-muted-foreground mt-2">
            {activeTab === 'register' 
              ? 'Select course sections to register for the current semester.' 
              : 'View and manage your weekly class schedule and room allocations.'}
          </p>
        </div>

        {/* Registration Window Badge (Solid background) */}
        <div className={`px-4 py-3 rounded-lg border flex flex-col gap-1 text-[13px] shadow-sm ${
          registrationWindow.isOpen 
            ? 'bg-emerald-600 text-white border-emerald-700' 
            : 'bg-rose-600 text-white border-rose-700'
        }`}>
          <div className="flex items-center gap-1.5 font-semibold">
            {registrationWindow.isOpen ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>Registration is {registrationWindow.isOpen ? 'OPEN' : 'CLOSED'}</span>
          </div>
          {registrationWindow.isOpen && (
            <span className="text-[12px] text-white/95 font-sans">
              Window: {formatWindowDate(registrationWindow.start)} to {formatWindowDate(registrationWindow.end)}
            </span>
          )}
        </div>
      </header>

      {/* Tabs Layout */}
      <div className="flex gap-2 mb-6 bg-secondary p-1.5 rounded-lg border border-border w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('register')}
          className={`px-5 py-2.5 rounded-md text-[14px] font-medium transition-all ${
            activeTab === 'register' 
              ? 'bg-[#5e69d1] text-white shadow-sm font-semibold' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Register Courses
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`px-5 py-2.5 rounded-md text-[14px] font-medium transition-all ${
            activeTab === 'timetable' 
              ? 'bg-[#5e69d1] text-white shadow-sm font-semibold' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My Timetable
        </button>
      </div>

      {successMsg && (
        <div className="p-4 mb-6 rounded-md bg-emerald-600/10 border border-emerald-500/20 text-emerald-600 text-[14px]">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 mb-6 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[14px]">
          {errorMsg}
        </div>
      )}

      {activeTab === 'register' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Available Offerings Table */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-secondary border border-border rounded-[12px] p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h3 className="font-display font-semibold text-[18px] text-foreground">Available Course Sections</h3>
                <div className="relative w-full md:w-72">
                  <input
                    type="text"
                    placeholder="Search code, subject or teacher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-background border border-border text-[13px] rounded-md pl-9 pr-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#5e69d1] transition-all"
                  />
                  <div className="absolute left-3 top-2.5 text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-semibold">
                      <th className="py-3 px-2 text-left">Code</th>
                      <th className="py-3 px-2 text-left">Subject</th>
                      <th className="py-3 px-2 text-right pr-4">Credits</th>
                      <th className="py-3 px-2 text-left">Teacher</th>
                      <th className="py-3 px-2 text-left">Day</th>
                      <th className="py-3 px-2 text-left">Start Slot</th>
                      <th className="py-3 px-2 text-left">Sum Slot</th>
                      <th className="py-3 px-2 text-left">Seats</th>
                      <th className="py-3 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((s: any) => {
                      const enrollment = myEnrollments.find(
                        (e: any) => e.course_section_id === s.id && e.enrollment_status !== 'declining'
                      );
                      const isEnrolled = !!enrollment;
                      const inDraft = draftSections.includes(s.id);
                      const enrolledCount = s._count?.Student_Enrollment || 0;
                      const isFull = enrolledCount >= s.max_capacity;
                      const disableRegister = isFull && !isEnrolled && !inDraft;

                      const { days, startSlots, sumSlots } = getSectionScheduleDetails(s.Schedule || []);

                      return (
                        <tr 
                           key={s.id} 
                           className={`border-b border-border/50 hover:bg-background/40 transition-colors ${
                            disableRegister ? 'opacity-50 bg-secondary/30 select-none' : ''
                           }`}
                        >
                          <td className="py-3 px-2 font-sans font-medium text-foreground">{s.Subject?.subject_code}</td>
                          <td className="py-3 px-2 font-display font-medium text-foreground">{s.Subject?.subject_name}</td>
                          <td className="py-3 px-2 text-right pr-4 font-sans font-medium">{s.Subject?.credits}</td>
                          <td className="py-3 px-2 text-muted-foreground truncate max-w-[120px]" title={`${s.Staff?.staff_first_name} ${s.Staff?.staff_last_name}`}>
                            {s.Staff?.staff_first_name} {s.Staff?.staff_last_name}
                          </td>
                          <td className="py-3 px-2 text-muted-foreground font-semibold text-[12px]">{days}</td>
                          <td className="py-3 px-2 text-muted-foreground text-[12px]">{startSlots}</td>
                          <td className="py-3 px-2 text-muted-foreground text-[12px]">{sumSlots}</td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {enrolledCount} / {s.max_capacity}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isEnrolled ? (
                              enrollment && draftDrops.includes(enrollment.id) ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-600/10 text-rose-600">
                                    To Drop
                                  </span>
                                  <Button
                                    onClick={() => enrollment && handleRemoveFromDropDraft(enrollment.id)}
                                    variant="primary"
                                    className="h-7 w-7 p-0 rounded-full flex items-center justify-center font-bold text-sm bg-[#5e69d1] hover:bg-[#5e69d1]/90"
                                  >
                                    +
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-600/10 text-emerald-600">
                                    Registered
                                  </span>
                                  <Button
                                    onClick={() => enrollment && handleAddToDropDraft(enrollment.id)}
                                    variant="secondary"
                                    className="h-7 w-7 p-0 rounded-full flex items-center justify-center font-bold text-sm bg-rose-600 text-white border-rose-700 hover:bg-rose-500 active:bg-rose-700"
                                  >
                                    -
                                  </Button>
                                </div>
                              )
                            ) : inDraft ? (
                              <Button
                                onClick={() => handleRemoveFromDraft(s.id)}
                                variant="secondary"
                                className="h-7 w-7 p-0 rounded-full flex items-center justify-center font-bold text-sm bg-rose-600 text-white border-rose-700 hover:bg-rose-500 active:bg-rose-700"
                              >
                                -
                              </Button>
                            ) : disableRegister ? (
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border/80 select-none">
                                Full
                              </span>
                            ) : (
                              <Button
                                onClick={() => handleAddToDraft(s)}
                                disabled={!registrationWindow.isOpen || isLoading}
                                variant="primary"
                                className="h-7 w-7 p-0 rounded-full flex items-center justify-center font-bold text-sm bg-[#5e69d1] hover:bg-[#5e69d1]/90"
                              >
                                +
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {sections.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground">
                          No courses are offered for the selected term.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Centered Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-1.5 mt-6">
                  <Button
                    variant="secondary"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  
                  {getPaginationPages(page, pagination.totalPages).map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground select-none">
                          ...
                        </span>
                      );
                    }
                    const pageNum = p as number;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? 'primary' : 'secondary'}
                        className={`h-8 w-8 p-0 rounded-md font-medium text-sm transition-all ${
                          pageNum === page ? 'bg-[#5e69d1] text-white font-semibold' : ''
                        }`}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}

                  <Button
                    variant="secondary"
                    disabled={page === pagination.totalPages}
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Current Registrations Sidebar */}
          <div className="space-y-4">
            <div className="bg-secondary border border-border rounded-[12px] p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-border/80 pb-3">
                <h3 className="font-display font-semibold text-[16px] text-foreground">My Registrations</h3>
                <span className="font-sans font-bold text-[14px] text-[#5e6ad2]">
                  {currentCredits} / {maxCredits} Credits
                </span>
              </div>

              <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                {/* Render Draft Sections first */}
                {draftSections.map((sectionId: string) => {
                  const s = sections.find((sec: any) => sec.id === sectionId);
                  if (!s) return null;
                  return (
                    <div 
                      key={s.id} 
                      className="border border-[#5e69d1]/20 bg-[#5e69d1]/5 p-3 rounded-lg flex justify-between items-start gap-4 transition-all"
                    >
                      <div className="space-y-1">
                        <h5 className="font-medium text-[14px] leading-tight text-foreground">
                          {s.Subject?.subject_name}
                        </h5>
                        <span className="block text-[12px] text-[#5e69d1] font-sans font-medium uppercase">
                          {s.Subject?.subject_code} • Sec {s.section_number} • {s.Subject?.credits} Credits (Draft)
                        </span>
                      </div>
                      <button 
                        onClick={() => handleRemoveFromDraft(s.id)}
                        className="text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors"
                      >
                        <XCircle size={15} />
                      </button>
                    </div>
                  );
                })}

                {/* Render Enrolled Enrollments */}
                {myEnrollments.map((e: any) => {
                  const isDropped = draftDrops.includes(e.id);
                  return (
                    <div 
                      key={e.id} 
                      className={`border-b border-border/50 pb-3 last:border-b-0 last:pb-0 flex justify-between items-center gap-4 ${isDropped ? 'opacity-50' : ''}`}
                    >
                      <div className="space-y-1">
                        <h5 className={`font-medium text-[14px] leading-tight text-foreground ${isDropped ? 'line-through decoration-rose-500' : ''}`}>
                          {e.Course_Section?.Subject?.subject_name} {isDropped && <span className="text-xs text-rose-500 font-normal font-sans not-italic ml-1">(To Drop)</span>}
                        </h5>
                        <span className="block text-[12px] text-muted-foreground font-sans uppercase">
                          Sec {e.Course_Section?.section_number} • {e.Course_Section?.Subject?.credits} Credits
                        </span>
                      </div>

                      {isDropped ? (
                        <Button
                          onClick={() => handleRemoveFromDropDraft(e.id)}
                          variant="primary"
                          className="h-7 w-7 p-0 rounded-full flex items-center justify-center font-bold text-sm bg-[#5e69d1] hover:bg-[#5e69d1]/90 shrink-0"
                        >
                          +
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleAddToDropDraft(e.id)}
                          variant="secondary"
                          className="h-7 w-7 p-0 rounded-full flex items-center justify-center font-bold text-sm bg-rose-600 text-white border-rose-700 hover:bg-rose-500 active:bg-rose-700 shrink-0"
                        >
                          -
                        </Button>
                      )}
                    </div>
                  );
                })}

                {draftSections.length === 0 && myEnrollments.length === 0 && (
                  <p className="py-6 text-center text-muted-foreground text-[14px]">
                    You have not registered for any classes yet.
                  </p>
                )}
              </div>

              {/* Confirm Registration Button */}
              {(draftSections.length > 0 || draftDrops.length > 0) && (
                <Button 
                  onClick={handleConfirmRegistration} 
                  disabled={isLoading || enrollMutation.isPending || dropMutation.isPending}
                  className="w-full mt-4 font-semibold text-center py-2.5 bg-[#5e69d1] hover:bg-[#5e69d1]/90 text-white rounded-lg transition-colors shadow-sm"
                >
                  {isLoading || enrollMutation.isPending || dropMutation.isPending ? 'Confirming...' : 'Confirm Changes'}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* My Weekly Timetable Tab */
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex justify-between items-center bg-secondary border border-border p-4 rounded-xl shadow-sm">
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground">Weekly Class Schedule</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Your approved course schedules mapped on the calendar grid.</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Day/Week Toggle segment */}
              <div className="flex items-center gap-1 bg-background border border-border p-1 rounded-lg">
                <button 
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${viewMode === 'day' ? 'bg-[#5e69d1] text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary'}`}
                >
                  Day
                </button>
                <button 
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${viewMode === 'week' ? 'bg-[#5e69d1] text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary'}`}
                >
                  Week
                </button>
              </div>

              {/* Google Calendar-like controls */}
              <div className="flex items-center gap-3 bg-background border border-border p-1 rounded-lg">
                <button 
                  onClick={handlePrevWeekOrDay}
                  className="p-1 rounded transition-colors text-muted-foreground hover:bg-secondary"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="font-sans font-semibold text-xs px-2 text-foreground min-w-[160px] text-center">
                  {viewMode === 'week' ? getWeekRangeString() : getDayDateString(selectedDay)}
                </span>
                <button 
                  onClick={handleNextWeekOrDay}
                  className="p-1 rounded transition-colors text-muted-foreground hover:bg-secondary"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>

          {schedules.length === 0 ? (
            <div className="bg-secondary border border-border rounded-[12px] p-12 text-center shadow-sm">
              <Calendar size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-[16px] font-medium text-foreground">
                No approved classes scheduled for this week.
              </p>
              <p className="text-muted-foreground text-[14px] mt-1">
                Please check your pending registrations.
              </p>
            </div>
          ) : (
            <div className="flex flex-col border border-border rounded-xl bg-card overflow-hidden shadow-sm">
              {/* Calendar Header Row */}
              <div className="flex border-b border-border bg-secondary">
                {/* Hour column spacer */}
                <div className="w-20 border-r border-border shrink-0" />
                
                {/* Days header list */}
                <div className="flex flex-1">
                  {activeDays.map((day) => {
                    return (
                      <div 
                        key={day.key} 
                        className="flex-1 py-4 text-center border-r border-border/60 last:border-r-0 flex flex-col items-center justify-center gap-0.5"
                      >
                        <span className="font-sans font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                          {day.label}
                        </span>
                        <span className="font-sans font-bold text-[18px] text-foreground leading-none mt-1">
                          {getWeekDayDateNumber(day.offset)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Calendar Grid Container */}
              <div className="relative flex h-[600px]">
                {/* Hour ticks labels axis column */}
                <div className="w-20 border-r border-border bg-secondary shrink-0 relative flex flex-col justify-between select-none py-1">
                  {hours.map((hour) => {
                    const topPct = ((hour * 60 - CALENDAR_START) / TOTAL_MINUTES) * 100;
                    const displayHour = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
                    return (
                      <div 
                        key={hour} 
                        className={`absolute right-3 text-[10px] font-sans font-medium text-muted-foreground/80 ${hour === 8 ? 'translate-y-1' : hour === 18 ? '-translate-y-full -mt-1' : '-translate-y-1/2'}`}
                        style={{ top: `${topPct}%` }}
                      >
                        {displayHour}
                      </div>
                    );
                  })}
                </div>

                {/* Time Grid Canvas */}
                <div className="flex-1 relative bg-background/50">
                  {/* Horizontal Grid lines */}
                  {hours.map((hour) => {
                    const topPct = ((hour * 60 - CALENDAR_START) / TOTAL_MINUTES) * 100;
                    return (
                      <div 
                        key={hour} 
                        className="absolute left-0 right-0 border-t border-border/50 pointer-events-none"
                        style={{ top: `${topPct}%` }}
                      />
                    );
                  })}

                  {/* Day Columns */}
                  <div className="absolute inset-0 flex">
                    {activeDays.map((day) => {
                      const dayDate = getWeekDayDate(day.offset);
                      const isScheduled = isDateInSemester(dayDate);
                      const daySchedules = isScheduled ? schedules.filter((s: any) => s.day_of_week === day.key) : [];
                      return (
                        <div 
                          key={day.key} 
                          className="flex-1 h-full relative border-r border-border/30 last:border-r-0"
                        >
                          {daySchedules.map((s: any) => {
                            const { startLocal, endLocal } = getEventTimes(s.start_time, s.end_time);
                            const startMins = timeToMinutes(startLocal);
                            const endMins = timeToMinutes(endLocal);
                            const topPct = ((startMins - CALENDAR_START) / TOTAL_MINUTES) * 100;
                            const heightPct = ((endMins - startMins) / TOTAL_MINUTES) * 100;

                            const palette = getCoursePastelColor(s.Course_Section?.Subject?.subject_code || '');

                            return (
                              <div
                                key={s.id}
                                className={`absolute left-1 right-1 rounded-lg p-2.5 text-xs border ${palette.border} ${palette.bg} ${palette.text} ${palette.hoverBg} hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-200 overflow-hidden flex flex-col justify-between group cursor-pointer shadow-sm select-none`}
                                style={{ 
                                  top: `${topPct}%`, 
                                  height: `${heightPct}%` 
                                }}
                              >
                                <div className="flex flex-col gap-0.5">
                                  <span className={`font-sans font-bold text-[10px] ${palette.subText} uppercase tracking-wider`}>
                                    {s.Course_Section?.Subject?.subject_code}
                                  </span>
                                  <h5 className={`font-display font-semibold text-[12px] text-foreground leading-tight truncate mt-0.5 group-hover:${palette.subText} transition-colors`}>
                                    {s.Course_Section?.Subject?.subject_name}
                                  </h5>
                                </div>
                                
                                <div className="flex flex-col gap-0.5 mt-2 text-[10px] opacity-90">
                                  <span className="truncate flex items-center gap-1 font-medium text-inherit">
                                    <Clock size={10} className="shrink-0 opacity-80" />
                                    {startLocal} - {endLocal}
                                  </span>
                                  <span className="truncate flex items-center gap-1 font-medium text-inherit">
                                    <MapPin size={10} className="shrink-0 opacity-80" />
                                    Room {s.Room?.room_number} {s.Room?.is_lab ? '(Lab)' : ''}
                                  </span>
                                  <span className="truncate flex items-center gap-1 font-medium text-inherit">
                                    <User size={10} className="shrink-0 opacity-80" />
                                    {s.Course_Section?.Staff?.staff_first_name} {s.Course_Section?.Staff?.staff_last_name}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
