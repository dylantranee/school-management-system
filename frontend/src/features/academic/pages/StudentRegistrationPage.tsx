import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { HelpCircle, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import {
  useCourseSections,
  useMyEnrollments,
  useSystemSettings,
  useEnrollStudentMutation
} from '../api/academic.hooks';

export const StudentRegistrationPage = () => {
  const { data: sections = [] } = useCourseSections();
  const { data: myEnrollments = [] } = useMyEnrollments();
  const { data: settings = [] } = useSystemSettings();

  const enrollMutation = useEnrollStudentMutation();

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Parse settings reactively
  const start = settings.find((s: any) => s.key === 'REGISTRATION_START_DATE')?.value || '';
  const end = settings.find((s: any) => s.key === 'REGISTRATION_END_DATE')?.value || '';
  const maxCredits = parseInt(settings.find((s: any) => s.key === 'MAX_SEMESTER_CREDITS')?.value || '20', 10);
  
  const now = new Date();
  const isOpen = start && end && now >= new Date(start) && now <= new Date(end);
  const registrationWindow = { start, end, isOpen };

  const handleEnroll = async (sectionId: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    enrollMutation.mutate(
      { course_section_id: sectionId },
      {
        onSuccess: () => {
          setSuccessMsg('Enrollment request submitted successfully (pending approval)!');
        },
        onError: (err: any) => {
          setErrorMsg(err.response?.data?.message || 'Failed to submit enrollment request.');
        }
      }
    );
  };

  const isLoading = enrollMutation.isPending;

  // Calculate current credit load
  const activeEnrollments = myEnrollments.filter(
    (e: any) => e.enrollment_status === 'pending' || e.enrollment_status === 'approving'
  );
  const currentCredits = activeEnrollments.reduce((acc: number, e: any) => acc + (e.Course_Section?.Subject?.credits || 0), 0);
  const creditLoadPercentage = Math.min((currentCredits / maxCredits) * 100, 100);

  return (
    <div className="p-12 max-w-[1280px] mx-auto w-full">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display text-[32px] tracking-[-0.8px] font-semibold text-foreground">
            Course Registration
          </h1>
          <p className="font-sans text-[16px] text-muted-foreground mt-2">
            Select course sections to register for the current semester.
          </p>
        </div>

        {/* Registration Window Badge */}
        <div className={`px-4 py-3 rounded-lg border flex flex-col gap-1 text-[13px] ${registrationWindow.isOpen ? 'bg-[#5e69d1]/5 border-[#5e69d1]/20 text-[#5e69d1]' : 'bg-destructive/5 border-destructive/20 text-destructive'}`}>
          <div className="flex items-center gap-1.5 font-semibold">
            {registrationWindow.isOpen ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>Registration is {registrationWindow.isOpen ? 'OPEN' : 'CLOSED'}</span>
          </div>
          <span className="text-[12px] text-muted-foreground font-mono">Window: {registrationWindow.start} to {registrationWindow.end}</span>
        </div>
      </header>

      {/* Credit Load Card */}
      <div className="bg-secondary border border-border rounded-[12px] p-6 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex-1 w-full space-y-3">
          <div className="flex justify-between items-center text-[14px]">
            <span className="font-medium text-foreground">Semester Credit Load Progress</span>
            <span className="font-bold text-[#5e6ad2]">{currentCredits} / {maxCredits} Credits</span>
          </div>
          <div className="w-full bg-background rounded-full h-3 border border-border overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${creditLoadPercentage > 85 ? 'bg-destructive' : 'bg-[#5e6ad2]'}`}
              style={{ width: `${creditLoadPercentage}%` }}
            />
          </div>
          <div className="text-[12px] text-muted-foreground">
            * Minimum credit load: 12. Maximum limit set by school policy: {maxCredits}.
          </div>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Available Offerings */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-display font-semibold text-[18px] text-foreground">Available Course Sections</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((s: any) => {
              const isEnrolled = myEnrollments.some((e: any) => e.course_section_id === s.id && e.enrollment_status !== 'declining');
              return (
                <div key={s.id} className="bg-secondary border border-border rounded-lg p-5 flex flex-col justify-between gap-4 hover:border-[#5e6ad2]/40 transition-colors">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-[12px] text-muted-foreground font-semibold uppercase">{s.Subject?.subject_code}</span>
                      <span className="px-2 py-0.5 rounded bg-[#5e69d1]/10 text-[#5e69d1] text-[11px] font-bold">{s.Subject?.credits} Credits</span>
                    </div>
                    <h4 className="font-display font-medium text-[16px] text-foreground leading-snug">{s.Subject?.subject_name}</h4>
                    <p className="text-[13px] text-muted-foreground">
                      Teacher: {s.Staff?.staff_first_name} {s.Staff?.staff_last_name}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      Seats Remaining: {s.max_capacity - (s._count?.Student_Enrollment || 0)} / {s.max_capacity}
                    </p>
                  </div>

                  <Button
                    onClick={() => handleEnroll(s.id)}
                    disabled={isEnrolled || isLoading || !registrationWindow.isOpen}
                    className="w-full text-center"
                    variant={isEnrolled ? 'secondary' : 'primary'}
                  >
                    {isEnrolled ? 'Registered' : 'Enroll Now'}
                  </Button>
                </div>
              );
            })}
            {sections.length === 0 && (
              <p className="col-span-2 py-6 text-center text-muted-foreground">No courses are offered for the selected term.</p>
            )}
          </div>
        </div>

        {/* Current Registrations */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-[18px] text-foreground">My Registrations</h3>
          
          <div className="bg-secondary border border-border rounded-[12px] p-5 shadow-sm space-y-4">
            {myEnrollments.map((e: any) => (
              <div key={e.id} className="border-b border-border/50 pb-3 last:border-b-0 last:pb-0 flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h5 className="font-medium text-[14px] leading-tight">{e.Course_Section?.Subject?.subject_name}</h5>
                  <span className="block text-[12px] text-muted-foreground font-mono">Sec {e.Course_Section?.section_number} • {e.Course_Section?.Subject?.credits} Cr</span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {e.enrollment_status === 'pending' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-600 text-[11px] font-semibold">
                      <HelpCircle size={10} /> Pending
                    </span>
                  )}
                  {e.enrollment_status === 'approving' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-600 text-[11px] font-semibold">
                      <CheckCircle2 size={10} /> Approved
                    </span>
                  )}
                  {e.enrollment_status === 'declining' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-[11px] font-semibold">
                      <XCircle size={10} /> Declined
                    </span>
                  )}

                </div>
              </div>
            ))}
            {myEnrollments.length === 0 && (
              <p className="py-6 text-center text-muted-foreground text-[14px]">You have not registered for any classes yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
