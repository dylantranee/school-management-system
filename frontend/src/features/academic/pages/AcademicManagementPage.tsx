import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Calendar, Layers, Plus, Upload, Trash2, ShieldAlert } from 'lucide-react';
import {
  useCourseSections,
  useSchedules,
  useRooms,
  useSubjects,
  useStaff,
  useCreateSectionMutation,
  useDeleteSectionMutation,
  useCreateScheduleMutation,
  useDeleteScheduleMutation,
  useImportCsvMutation
} from '../api/academic.hooks';

export const AcademicManagementPage = () => {
  const [activeTab, setActiveTab] = useState<'sections' | 'schedules' | 'import'>('sections');
  
  // Queries
  const { data: sections = [] } = useCourseSections();
  const { data: schedules = [] } = useSchedules();
  const { data: rooms = [] } = useRooms();
  const { data: subjects = [] } = useSubjects();
  const { data: staff = [] } = useStaff();

  // Mutations
  const createSectionMutation = useCreateSectionMutation();
  const deleteSectionMutation = useDeleteSectionMutation();
  const createScheduleMutation = useCreateScheduleMutation();
  const deleteScheduleMutation = useDeleteScheduleMutation();
  const importCsvMutation = useImportCsvMutation();

  // Form states
  const [sectionForm, setSectionForm] = useState({
    semester: '1',
    academic_year: 2026,
    section_number: 'A',
    max_capacity: 40,
    subject_id: '',
    staff_id: ''
  });

  const [scheduleForm, setScheduleForm] = useState({
    day_of_week: 'MON',
    start_time: '08:00:00',
    end_time: '09:30:00',
    course_section_id: '',
    room_id: ''
  });

  const [csvFileContent, setCsvFileContent] = useState('');
  const [importTarget, setImportTarget] = useState<'staff' | 'students'>('students');
  const [importResult, setImportResult] = useState<any>(null);

  // Status states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isLoading = createSectionMutation.isPending || 
                    deleteSectionMutation.isPending || 
                    createScheduleMutation.isPending || 
                    deleteScheduleMutation.isPending || 
                    importCsvMutation.isPending;

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    createSectionMutation.mutate({
      ...sectionForm,
      academic_year: Number(sectionForm.academic_year),
      max_capacity: Number(sectionForm.max_capacity)
    }, {
      onSuccess: () => {
        setSuccessMsg('Course Section created successfully!');
        setSectionForm({
          semester: '1',
          academic_year: 2026,
          section_number: 'A',
          max_capacity: 40,
          subject_id: '',
          staff_id: ''
        });
      },
      onError: (err: any) => {
        setErrorMsg(err.response?.data?.message || 'Error creating course section');
      }
    });
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    createScheduleMutation.mutate(scheduleForm, {
      onSuccess: () => {
        setSuccessMsg('Class schedule created successfully!');
        setScheduleForm({
          day_of_week: 'MON',
          start_time: '08:00:00',
          end_time: '09:30:00',
          course_section_id: '',
          room_id: ''
        });
      },
      onError: (err: any) => {
        setErrorMsg(err.response?.data?.message || 'Error creating schedule');
      }
    });
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    
    deleteSectionMutation.mutate(id, {
      onSuccess: () => {
        setSuccessMsg('Section deleted successfully!');
      },
      onError: (err: any) => {
        setErrorMsg(err.response?.data?.message || 'Failed to delete section');
      }
    });
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    setErrorMsg('');
    setSuccessMsg('');
    
    deleteScheduleMutation.mutate(id, {
      onSuccess: () => {
        setSuccessMsg('Schedule deleted successfully!');
      },
      onError: (err: any) => {
        setErrorMsg(err.response?.data?.message || 'Failed to delete schedule');
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvFileContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setImportResult(null);

    if (!csvFileContent) {
      setErrorMsg('Please select a valid CSV file.');
      return;
    }

    importCsvMutation.mutate({ target: importTarget, csvData: csvFileContent }, {
      onSuccess: (data) => {
        setImportResult(data);
        setSuccessMsg(`CSV Import complete. Successes: ${data.successCount}, Errors: ${data.errorCount}`);
        setCsvFileContent('');
      },
      onError: (err: any) => {
        setErrorMsg(err.response?.data?.message || 'Error during CSV import run.');
      }
    });
  };

  return (
    <div className="p-12 max-w-[1280px] mx-auto w-full">
      <header className="mb-8">
        <h1 className="font-display text-[32px] tracking-[-0.8px] font-semibold text-foreground">
          Academic Configuration
        </h1>
        <p className="font-sans text-[16px] text-muted-foreground mt-2">
          Manage course sections, class calendars, scheduling slots, and bulk user onboarding.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border pb-4 mb-8">
        <button
          onClick={() => { setActiveTab('sections'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-[14px] font-medium rounded-md transition-colors ${activeTab === 'sections' ? 'bg-[#5e69d1]/10 text-[#5e69d1]' : 'text-muted-foreground hover:bg-secondary-foreground/5 hover:text-foreground'}`}
        >
          <Layers size={16} />
          Course Sections
        </button>
        <button
          onClick={() => { setActiveTab('schedules'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-[14px] font-medium rounded-md transition-colors ${activeTab === 'schedules' ? 'bg-[#5e69d1]/10 text-[#5e69d1]' : 'text-muted-foreground hover:bg-secondary-foreground/5 hover:text-foreground'}`}
        >
          <Calendar size={16} />
          Schedules & Rooms
        </button>
        <button
          onClick={() => { setActiveTab('import'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-[14px] font-medium rounded-md transition-colors ${activeTab === 'import' ? 'bg-[#5e69d1]/10 text-[#5e69d1]' : 'text-muted-foreground hover:bg-secondary-foreground/5 hover:text-foreground'}`}
        >
          <Upload size={16} />
          Bulk CSV Import
        </button>
      </div>

      {successMsg && (
        <div className="p-4 mb-6 rounded-md bg-[#5e69d1]/10 border border-[#5e69d1]/20 text-[#5e69d1] text-[14px]">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 mb-6 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[14px]">
          {errorMsg}
        </div>
      )}

      {/* Course Sections Tab */}
      {activeTab === 'sections' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-secondary border border-border rounded-[12px] p-6 shadow-sm">
            <h3 className="font-display font-medium text-[18px] mb-4">Active Course Sections</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-3 font-semibold">Subject</th>
                    <th className="pb-3 font-semibold">Term</th>
                    <th className="pb-3 font-semibold">Section</th>
                    <th className="pb-3 font-semibold">Teacher</th>
                    <th className="pb-3 font-semibold">Enrolled / Cap</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((s: any) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-background/40 transition-colors">
                      <td className="py-3 font-medium">{s.Subject?.subject_name} ({s.Subject?.subject_code})</td>
                      <td className="py-3">S{s.semester} / {s.academic_year}</td>
                      <td className="py-3 font-mono">{s.section_number}</td>
                      <td className="py-3">{s.Staff?.staff_first_name} {s.Staff?.staff_last_name}</td>
                      <td className="py-3">{s._count?.Student_Enrollment || 0} / {s.max_capacity}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteSection(s.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sections.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">No sections generated yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-secondary border border-border rounded-[12px] p-6 shadow-sm h-fit">
            <h3 className="font-display font-medium text-[18px] mb-4 flex items-center gap-2">
              <Plus size={18} className="text-[#5e6ad2]" />
              New Section
            </h3>
            <form onSubmit={handleCreateSection} className="flex flex-col gap-4">
              <Select
                label="Subject"
                value={sectionForm.subject_id}
                onChange={e => setSectionForm({ ...sectionForm, subject_id: e.target.value })}
                options={[
                  { value: '', label: 'Select Subject' },
                  ...subjects.filter((s: any) => s.is_active !== false).map((s: any) => ({ value: s.id, label: `${s.subject_name} (${s.subject_code})` }))
                ]}
                required
              />
              <Select
                label="Teacher (Staff)"
                value={sectionForm.staff_id}
                onChange={e => setSectionForm({ ...sectionForm, staff_id: e.target.value })}
                options={[
                  { value: '', label: 'Select Teacher' },
                  ...staff.map((s: any) => ({ value: s.id, label: `${s.staff_first_name} ${s.staff_last_name} (${s.employee_code})` }))
                ]}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Semester"
                  value={sectionForm.semester}
                  onChange={e => setSectionForm({ ...sectionForm, semester: e.target.value })}
                  options={[
                    { value: '1', label: 'Semester 1' },
                    { value: '2', label: 'Semester 2' },
                    { value: '3', label: 'Semester 3' }
                  ]}
                />
                <Input
                  label="Year"
                  type="number"
                  value={sectionForm.academic_year}
                  onChange={e => setSectionForm({ ...sectionForm, academic_year: Number(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Section Code"
                  type="text"
                  placeholder="e.g. A"
                  value={sectionForm.section_number}
                  onChange={e => setSectionForm({ ...sectionForm, section_number: e.target.value })}
                  required
                />
                <Input
                  label="Max Capacity"
                  type="number"
                  value={sectionForm.max_capacity}
                  onChange={e => setSectionForm({ ...sectionForm, max_capacity: Number(e.target.value) })}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading} className="mt-2">
                {isLoading ? 'Creating...' : 'Create Section'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-secondary border border-border rounded-[12px] p-6 shadow-sm">
            <h3 className="font-display font-medium text-[18px] mb-4">Timetable Schedules</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-3 font-semibold">Day</th>
                    <th className="pb-3 font-semibold">Time Slot</th>
                    <th className="pb-3 font-semibold">Room</th>
                    <th className="pb-3 font-semibold">Class / Section</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s: any) => {
                    const startLocal = new Date(s.start_time).toISOString().substr(11, 5);
                    const endLocal = new Date(s.end_time).toISOString().substr(11, 5);
                    return (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-background/40 transition-colors">
                        <td className="py-3 font-medium font-mono">{s.day_of_week}</td>
                        <td className="py-3">{startLocal} - {endLocal}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${s.Room?.is_lab ? 'bg-primary/10 text-primary' : 'bg-surface-2 text-muted-foreground'}`}>
                            {s.Room?.room_number} {s.Room?.is_lab ? '(Lab)' : ''}
                          </span>
                        </td>
                        <td className="py-3">{s.Course_Section?.Subject?.subject_name} (Sec {s.Course_Section?.section_number})</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDeleteSchedule(s.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {schedules.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">No timetable slots scheduled yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-secondary border border-border rounded-[12px] p-6 shadow-sm h-fit">
            <h3 className="font-display font-medium text-[18px] mb-4 flex items-center gap-2">
              <Plus size={18} className="text-[#5e6ad2]" />
              Schedule Class
            </h3>
            <form onSubmit={handleCreateSchedule} className="flex flex-col gap-4">
              <Select
                label="Course Section"
                value={scheduleForm.course_section_id}
                onChange={e => setScheduleForm({ ...scheduleForm, course_section_id: e.target.value })}
                options={[
                  { value: '', label: 'Select Course Section' },
                  ...sections.map((s: any) => ({ value: s.id, label: `${s.Subject?.subject_name} (Sec ${s.section_number})` }))
                ]}
                required
              />
              <Select
                label="Classroom"
                value={scheduleForm.room_id}
                onChange={e => setScheduleForm({ ...scheduleForm, room_id: e.target.value })}
                options={[
                  { value: '', label: 'Select Room' },
                  ...rooms.map((r: any) => ({ value: r.id, label: `Room ${r.room_number} (Cap: ${r.capacity}) ${r.is_lab ? '[Lab]' : ''}` }))
                ]}
                required
              />
              <Select
                label="Day of Week"
                value={scheduleForm.day_of_week}
                onChange={e => setScheduleForm({ ...scheduleForm, day_of_week: e.target.value })}
                options={[
                  { value: 'MON', label: 'Monday' },
                  { value: 'TUE', label: 'Tuesday' },
                  { value: 'WED', label: 'Wednesday' },
                  { value: 'THU', label: 'Thursday' },
                  { value: 'FRI', label: 'Friday' },
                  { value: 'SAT', label: 'Saturday' }
                ]}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  type="text"
                  placeholder="08:00:00"
                  value={scheduleForm.start_time}
                  onChange={e => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                  required
                />
                <Input
                  label="End Time"
                  type="text"
                  placeholder="09:30:00"
                  value={scheduleForm.end_time}
                  onChange={e => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading} className="mt-2">
                {isLoading ? 'Scheduling...' : 'Save Schedule'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Tab */}
      {activeTab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-secondary border border-border rounded-[12px] p-6 shadow-sm">
            <h3 className="font-display font-medium text-[18px] mb-4">Upload CSV File</h3>
            <form onSubmit={handleCsvImport} className="space-y-6">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importTarget"
                    checked={importTarget === 'students'}
                    onChange={() => { setImportTarget('students'); setImportResult(null); }}
                    className="text-[#5e6ad2]"
                  />
                  <span className="text-[14px]">Import Students</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importTarget"
                    checked={importTarget === 'staff'}
                    onChange={() => { setImportTarget('staff'); setImportResult(null); }}
                    className="text-[#5e6ad2]"
                  />
                  <span className="text-[14px]">Import Staff</span>
                </label>
              </div>

              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-12 hover:bg-background/20 transition-colors cursor-pointer relative group">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload size={32} className="text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                <span className="text-[14px] text-foreground font-medium">Click to select CSV file</span>
                <span className="text-[12px] text-muted-foreground mt-1">Files must end in .csv</span>
              </div>

              {csvFileContent && (
                <div className="bg-background rounded border border-border p-3 flex justify-between items-center text-[13px]">
                  <span className="font-mono text-muted-foreground">CSV file loaded ({csvFileContent.length} bytes)</span>
                  <button
                    type="button"
                    onClick={() => setCsvFileContent('')}
                    className="text-destructive hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}

              <Button type="submit" disabled={isLoading || !csvFileContent}>
                {isLoading ? 'Processing CSV...' : 'Start Import Run'}
              </Button>
            </form>

            {/* Import results detail */}
            {importResult && (
              <div className="mt-8 border-t border-border pt-6 space-y-4">
                <h4 className="font-display font-medium text-[16px] text-foreground">Import Processing Results</h4>
                <div className="grid grid-cols-2 gap-4 text-[14px]">
                  <div className="bg-[#5e69d1]/5 border border-[#5e69d1]/10 rounded p-4 text-[#5e69d1]">
                    <span className="block text-[22px] font-bold">{importResult.successCount}</span>
                    <span className="text-[12px] text-muted-foreground">Successful Onboardings</span>
                  </div>
                  <div className="bg-destructive/5 border border-destructive/10 rounded p-4 text-destructive">
                    <span className="block text-[22px] font-bold">{importResult.errorCount}</span>
                    <span className="text-[12px] text-muted-foreground">Row Failures</span>
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded p-4">
                    <h5 className="font-semibold text-destructive text-[13px] mb-2 flex items-center gap-1">
                      <ShieldAlert size={14} />
                      Row Processing Failures Details:
                    </h5>
                    <ul className="text-[12px] font-mono text-destructive/80 space-y-1 list-disc list-inside">
                      {importResult.errors.map((err: string, idx: number) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-secondary border border-border rounded-[12px] p-6 shadow-sm h-fit space-y-4 text-[14px]">
            <h3 className="font-display font-medium text-[16px] text-foreground">CSV Format Specifications</h3>
            
            {importTarget === 'students' ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-[13px]">
                  Use the following headers in your CSV file for importing students:
                </p>
                <code className="block bg-background border border-border p-2.5 rounded font-mono text-[12px] text-foreground">
                  first_name,last_name,email,student_code,enrollment_date
                </code>
                <p className="text-[12px] text-muted-foreground">
                  * enrollment_date should use standard YYYY-MM-DD formats (e.g. 2026-05-31).
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground text-[13px]">
                  Use the following headers in your CSV file for importing staff members:
                </p>
                <code className="block bg-background border border-border p-2.5 rounded font-mono text-[12px] text-foreground">
                  first_name,last_name,email,employee_code,department,hire_date
                </code>
                <p className="text-[12px] text-muted-foreground">
                  * hire_date should use standard YYYY-MM-DD formats (e.g. 2026-01-15).
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
