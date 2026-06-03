import { useSchedules, useSystemSettings } from '../api/academic.hooks';
import { Calendar, Clock, MapPin, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

export const StaffTimetablePage = () => {
  const { data: schedules = [], isLoading } = useSchedules();
  const { data: settings = [] } = useSystemSettings();
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [selectedDay, setSelectedDay] = useState<'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'>('MON');
  const [weekOffset, setWeekOffset] = useState(0);

  // Set descriptive title for SEO
  useEffect(() => {
    document.title = 'Teaching Schedule - School Management System';
  }, []);

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

  if (isLoading) {
    return (
      <div className="p-12 max-w-[1280px] mx-auto w-full flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#5e6ad2] mx-auto"></div>
          <p className="text-muted-foreground text-[14px]">Loading teaching schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-12 max-w-[1280px] mx-auto w-full">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-display text-[32px] tracking-[-0.8px] font-semibold text-foreground">
            Teaching Schedule
          </h1>
          <p className="font-sans text-[16px] text-muted-foreground mt-2">
            View and manage your weekly classroom teaching slots and room allocations.
          </p>
        </div>
        
        {/* Google Calendar-like controls */}
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
          <div className="flex items-center gap-3 bg-secondary border border-border p-1 rounded-lg shadow-sm">
            <button 
              onClick={handlePrevWeekOrDay}
              className="p-1 rounded transition-colors text-muted-foreground hover:bg-background"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-sans font-semibold text-sm px-2 text-foreground min-w-[160px] text-center">
              {viewMode === 'week' ? getWeekRangeString() : getDayDateString(selectedDay)}
            </span>
            <button 
              onClick={handleNextWeekOrDay}
              className="p-1 rounded transition-colors text-muted-foreground hover:bg-background"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {schedules.length === 0 ? (
        <div className="bg-secondary border border-border rounded-[12px] p-12 text-center shadow-sm">
          <Calendar size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-[16px] font-medium text-foreground">
            No classes scheduled for this week.
          </p>
          <p className="text-muted-foreground text-[14px] mt-1">
            Please contact the academic administration if you believe this is an error.
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
                                <Layers size={10} className="shrink-0 opacity-80" />
                                Section {s.Course_Section?.section_number}
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
  );
};
