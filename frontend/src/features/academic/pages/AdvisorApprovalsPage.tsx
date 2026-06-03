import { useState } from 'react';
import { useMyEnrollments, useUpdateEnrollmentStatusMutation } from '../api/academic.hooks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CheckSquare, X, Search, RefreshCw, AlertCircle, User, BookOpen, MessageSquare } from 'lucide-react';

export const AdvisorApprovalsPage = () => {
  const { data: enrollments = [], isLoading, refetch } = useMyEnrollments();
  const updateStatusMutation = useUpdateEnrollmentStatusMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approving' | 'declining'>('pending');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Track which course is currently being declined inline and the input comment
  const [declineContext, setDeclineContext] = useState<{ enrollmentId: string; comment: string } | null>(null);

  // Status handler for decline with comment
  const handleDecline = async (id: string) => {
    if (!declineContext || !declineContext.comment.trim()) return;
    try {
      setActionMessage(null);
      await updateStatusMutation.mutateAsync({ 
        id, 
        status: 'declining', 
        comment: declineContext.comment.trim() 
      });
      setActionMessage({
        type: 'success',
        text: 'Successfully declined the course registration request with comment.'
      });
      setDeclineContext(null);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update enrollment status.'
      });
    }
  };

  // Approve all pending enrollments for a specific student
  const handleApproveAllPending = async (_studentId: string, studentName: string, studentEnrollments: any[]) => {
    const pendingEnrollments = studentEnrollments.filter(e => e.enrollment_status === 'pending');
    if (pendingEnrollments.length === 0) return;

    try {
      setActionMessage(null);
      let successCount = 0;
      let errorCount = 0;

      for (const e of pendingEnrollments) {
        try {
          await updateStatusMutation.mutateAsync({ id: e.id, status: 'approving' });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (errorCount > 0) {
        setActionMessage({
          type: 'error',
          text: `Approved ${successCount} registrations for ${studentName}, but ${errorCount} failed.`
        });
      } else {
        setActionMessage({
          type: 'success',
          text: `Successfully approved all pending registrations (${successCount}) for ${studentName}.`
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: 'Failed to complete batch approval.'
      });
    }
  };

  // Filter enrollments based on search query and selected status tab
  const filteredEnrollments = enrollments.filter((e: any) => {
    const studentName = `${e.Student?.student_first_name || ''} ${e.Student?.student_last_name || ''}`.toLowerCase();
    const studentCode = (e.Student?.student_code || '').toLowerCase();
    const subjectName = (e.Course_Section?.Subject?.subject_name || '').toLowerCase();
    const subjectCode = (e.Course_Section?.Subject?.subject_code || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = 
      studentName.includes(query) ||
      studentCode.includes(query) ||
      subjectName.includes(query) ||
      subjectCode.includes(query);

    const matchesStatus =
      statusFilter === 'all' ||
      e.enrollment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Group filtered enrollments by Student
  const studentsMap: { [studentId: string]: { student: any; enrollments: any[] } } = {};
  filteredEnrollments.forEach((e: any) => {
    if (!studentsMap[e.student_id]) {
      studentsMap[e.student_id] = {
        student: e.Student,
        enrollments: []
      };
    }
    studentsMap[e.student_id].enrollments.push(e);
  });
  const groupedStudents = Object.values(studentsMap);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'approving':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'declining':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200 dark:border-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'approving': return 'Approved';
      case 'declining': return 'Declined';
      default: return status;
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto w-full">
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] tracking-[-0.8px] font-semibold text-foreground">
            Advisor Approvals
          </h1>
          <p className="text-muted-foreground mt-1 text-[14px]">
            Review advisees' registrations grouped by student. Approve all pending requests for a student at once, or decline individual courses with feedback.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </header>

      {actionMessage && (
        <div className={`mb-6 p-4 rounded-lg border flex items-center gap-3 text-[14px] ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50' 
            : 'bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
        }`}>
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Tabs and filters */}
      <div className="bg-card border border-border rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-secondary/20">
          <div className="flex items-center gap-1.5 p-1 bg-secondary border border-border rounded-lg max-w-fit">
            <button
              onClick={() => { setStatusFilter('pending'); setDeclineContext(null); }}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                statusFilter === 'pending'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pending ({enrollments.filter((e: any) => e.enrollment_status === 'pending').length})
            </button>
            <button
              onClick={() => { setStatusFilter('approving'); setDeclineContext(null); }}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                statusFilter === 'approving'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Approved ({enrollments.filter((e: any) => e.enrollment_status === 'approving').length})
            </button>
            <button
              onClick={() => { setStatusFilter('declining'); setDeclineContext(null); }}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                statusFilter === 'declining'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Declined ({enrollments.filter((e: any) => e.enrollment_status === 'declining').length})
            </button>
            <button
              onClick={() => { setStatusFilter('all'); setDeclineContext(null); }}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({enrollments.length})
            </button>
          </div>

          <div className="relative w-full sm:w-[320px]">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
            <Input
              type="text"
              placeholder="Search student or course..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-[13px] w-full"
            />
          </div>
        </div>
      </div>

      {/* Student List cards */}
      {isLoading ? (
        <div className="py-24 bg-card border border-border rounded-xl text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-muted-foreground/50" />
          <span>Loading advisee registration requests...</span>
        </div>
      ) : groupedStudents.length === 0 ? (
        <div className="py-24 bg-card border border-border rounded-xl text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <AlertCircle size={32} className="text-muted-foreground/30" />
          <span className="font-medium text-[15px]">No registration requests found</span>
          <p className="text-[13px] text-muted-foreground max-w-sm">
            {searchQuery 
              ? 'Try adjusting your search query or clear the filter.' 
              : 'There are no active requests in this tab status.'
            }
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groupedStudents.map(({ student, enrollments: studentEnrollments }) => {
            const studentName = `${student?.student_first_name || ''} ${student?.student_last_name || ''}`;
            const pendingList = studentEnrollments.filter(e => e.enrollment_status === 'pending');
            const totalCredits = studentEnrollments.reduce((acc, e) => acc + (e.Course_Section?.Subject?.credits || 0), 0);

            return (
              <div key={student.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Student header bar */}
                <div className="p-5 border-b border-border bg-secondary/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-[#5e6ad2]/10 text-[#5e6ad2] flex items-center justify-center">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-[16px] text-foreground flex items-center gap-2">
                        {studentName}
                        <span className="text-[12px] font-normal text-muted-foreground">({student?.student_code})</span>
                      </h3>
                      <p className="text-muted-foreground text-[12px] mt-0.5 font-mono">
                        {student?.email} | Total Registered: {totalCredits} Credits ({studentEnrollments.length} Course{studentEnrollments.length > 1 ? 's' : ''})
                      </p>
                    </div>
                  </div>

                  {statusFilter === 'pending' && pendingList.length > 0 && (
                    <Button
                      variant="primary"
                      onClick={() => handleApproveAllPending(student.id, studentName, studentEnrollments)}
                      disabled={updateStatusMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center gap-1.5 text-[13px] self-start md:self-auto"
                    >
                      <CheckSquare size={16} />
                      Approve All Pending ({pendingList.length})
                    </Button>
                  )}
                </div>

                {/* Enrollments table inside card */}
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-[13px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-medium bg-secondary/5">
                        <th className="py-2.5 px-6 font-semibold">Subject & Class Section</th>
                        <th className="py-2.5 px-6 font-semibold w-24">Credits</th>
                        <th className="py-2.5 px-6 font-semibold w-32">Status</th>
                        {statusFilter === 'pending' && <th className="py-2.5 px-6 text-right font-semibold w-40">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {studentEnrollments.map((e: any) => {
                        const isDeclineOpen = declineContext?.enrollmentId === e.id;
                        return (
                          <tr key={e.id} className="hover:bg-secondary/5 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground flex items-center gap-2">
                                  <BookOpen size={14} className="text-muted-foreground" />
                                  {e.Course_Section?.Subject?.subject_name}
                                </span>
                                <span className="text-muted-foreground text-[12px] mt-0.5">
                                  Code: {e.Course_Section?.Subject?.subject_code} | Class: {e.Course_Section?.section_number}
                                </span>
                                {e.comment && (
                                  <span className="mt-1.5 p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 text-[12px] rounded border border-rose-100 dark:border-rose-900/50 flex items-start gap-1.5">
                                    <MessageSquare size={14} className="mt-0.5 flex-shrink-0" />
                                    <span><strong>Feedback:</strong> "{e.comment}"</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6 font-medium text-foreground">
                              {e.Course_Section?.Subject?.credits || 0}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getStatusBadgeClass(e.enrollment_status)}`}>
                                {getStatusLabel(e.enrollment_status)}
                              </span>
                            </td>
                            {statusFilter === 'pending' && (
                              <td className="py-4 px-6 text-right">
                                {isDeclineOpen ? (
                                  <div className="flex flex-col gap-2 min-w-[220px] text-left">
                                    <Input
                                      type="text"
                                      placeholder="Specify what is wrong..."
                                      value={declineContext?.comment || ''}
                                      onChange={val => setDeclineContext(prev => prev ? { ...prev, comment: val.target.value } : null)}
                                      className="h-8 text-[12px]"
                                      autoFocus
                                    />
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <Button
                                        variant="secondary"
                                        onClick={() => setDeclineContext(null)}
                                        className="h-7 px-2.5 text-[11px]"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        variant="primary"
                                        onClick={() => handleDecline(e.id)}
                                        disabled={!declineContext?.comment?.trim() || updateStatusMutation.isPending}
                                        className="bg-rose-600 hover:bg-rose-700 text-white h-7 px-2.5 text-[11px] border-none"
                                      >
                                        Decline
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    variant="secondary"
                                    onClick={() => setDeclineContext({ enrollmentId: e.id, comment: '' })}
                                    disabled={updateStatusMutation.isPending}
                                    className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 h-8 text-[12px] px-3 py-1 flex items-center gap-1 ml-auto"
                                  >
                                    <X size={14} />
                                    Decline
                                  </Button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
