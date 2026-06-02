import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Wallet, Landmark, Plus, Receipt, CheckCircle, Clock } from 'lucide-react';
import {
  useFees,
  useSalaries,
  useStaff,
  useGenerateBillingMutation,
  useRecordPaymentMutation,
  useGeneratePayslipMutation
} from '../api/financials.hooks';

export const FinancialsManagementPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'fees' | 'payroll'>('fees');

  // Queries
  const { data: fees = [] } = useFees();
  const { data: salaries = [] } = useSalaries(user?.role);
  const { data: staff = [] } = useStaff(user?.role);

  // Mutations
  const generateBillingMutation = useGenerateBillingMutation();
  const recordPaymentMutation = useRecordPaymentMutation();
  const generatePayslipMutation = useGeneratePayslipMutation();

  // Form states
  const [billingForm, setBillingForm] = useState({
    cost_per_credit: 150,
    due_date: '2026-06-30T17:00:00.000Z'
  });

  const [paymentForm, setPaymentForm] = useState({
    fee_id: '',
    amount: 0
  });

  const [payslipForm, setPayslipForm] = useState({
    staff_id: '',
    base_salary: 3000,
    allowances: 200,
    deductions: 100,
    payment_month: 5,
    payment_year: 2026
  });

  // Status states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isLoading = generateBillingMutation.isPending || 
                    recordPaymentMutation.isPending || 
                    generatePayslipMutation.isPending;

  const handleGenerateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    generateBillingMutation.mutate({
      cost_per_credit: Number(billingForm.cost_per_credit),
      due_date: billingForm.due_date
    }, {
      onSuccess: (data) => {
        setSuccessMsg(`Billing run complete. Generated ${data.invoiceCount} invoices successfully!`);
      },
      onError: (err: any) => {
        setErrorMsg(err.response?.data?.message || 'Error executing billing run.');
      }
    });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    recordPaymentMutation.mutate({
      feeId: paymentForm.fee_id,
      amount: Number(paymentForm.amount)
    }, {
      onSuccess: () => {
        setSuccessMsg('Payment successfully recorded!');
        setPaymentForm({ fee_id: '', amount: 0 });
      },
      onError: (err: any) => {
        setErrorMsg(err.response?.data?.message || 'Error recording payment.');
      }
    });
  };

  const handleGeneratePayslip = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    generatePayslipMutation.mutate({
      ...payslipForm,
      base_salary: Number(payslipForm.base_salary),
      allowances: Number(payslipForm.allowances),
      deductions: Number(payslipForm.deductions),
      payment_month: Number(payslipForm.payment_month),
      payment_year: Number(payslipForm.payment_year)
    }, {
      onSuccess: () => {
        setSuccessMsg('Monthly payslip generated successfully!');
        setPayslipForm({
          staff_id: '',
          base_salary: 3000,
          allowances: 200,
          deductions: 100,
          payment_month: 5,
          payment_year: 2026
        });
      },
      onError: (err: any) => {
        setErrorMsg(err.response?.data?.message || 'Error generating payslip.');
      }
    });
  };

  return (
    <div className="p-12 max-w-[1280px] mx-auto w-full">
      <header className="mb-8">
        <h1 className="font-display text-[32px] tracking-[-0.8px] font-semibold text-foreground">
          Financial Management
        </h1>
        <p className="font-sans text-[16px] text-muted-foreground mt-2">
          {user?.role === 'Student' 
            ? 'View outstanding tuition fees, balances, and make payments.' 
            : user?.role === 'Staff' 
              ? 'View salary statements and monthly payslips.' 
              : 'Calculate staff payroll, trigger student tuition billing runs, and record payments.'
          }
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border pb-4 mb-8">
        {(user?.role === 'Admin' || user?.role === 'Student') && (
          <button
            onClick={() => { setActiveTab('fees'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-[14px] font-medium rounded-md transition-colors ${activeTab === 'fees' ? 'bg-[#5e69d1]/10 text-[#5e69d1]' : 'text-muted-foreground hover:bg-secondary-foreground/5 hover:text-foreground'}`}
          >
            <Landmark size={16} />
            Tuition Fees
          </button>
        )}
        {(user?.role === 'Admin' || user?.role === 'Staff') && (
          <button
            onClick={() => { setActiveTab('payroll'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-[14px] font-medium rounded-md transition-colors ${activeTab === 'payroll' ? 'bg-[#5e69d1]/10 text-[#5e69d1]' : 'text-muted-foreground hover:bg-secondary-foreground/5 hover:text-foreground'}`}
          >
            <Wallet size={16} />
            Payroll & Salaries
          </button>
        )}
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

      {/* Tuition Fees Section */}
      {activeTab === 'fees' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-secondary border border-border rounded-[12px] p-6 shadow-sm">
            <h3 className="font-display font-medium text-[18px] mb-4">Fee Statements</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    {user?.role === 'Admin' && <th className="pb-3 font-semibold">Student</th>}
                    <th className="pb-3 font-semibold">Amount Due</th>
                    <th className="pb-3 font-semibold">Amount Paid</th>
                    <th className="pb-3 font-semibold">Due Date</th>
                    <th className="pb-3 font-semibold">Status</th>
                    {user?.role === 'Admin' && <th className="pb-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {fees.map((f: any) => (
                    <tr key={f.id} className="border-b border-border/50 hover:bg-background/40 transition-colors">
                      {user?.role === 'Admin' && (
                        <td className="py-3 font-medium">
                          {f.Student?.student_first_name} {f.Student?.student_last_name} ({f.Student?.student_code})
                        </td>
                      )}
                      <td className="py-3 font-mono font-semibold">${Number(f.amount_due).toFixed(2)}</td>
                      <td className="py-3 font-mono text-muted-foreground">${Number(f.amount_paid || 0).toFixed(2)}</td>
                      <td className="py-3 font-mono">{new Date(f.due_date).toLocaleDateString()}</td>
                      <td className="py-3">
                        {f.payment_status === 'paid' && (
                          <span className="flex items-center gap-1 w-fit px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-600 text-[11px] font-semibold">
                            <CheckCircle size={10} /> Paid
                          </span>
                        )}
                        {f.payment_status === 'unpaid' && (
                          <span className="flex items-center gap-1 w-fit px-2 py-0.5 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-600 text-[11px] font-semibold">
                            <Clock size={10} /> Unpaid
                          </span>
                        )}
                        {f.payment_status === 'overdue' && (
                          <span className="flex items-center gap-1 w-fit px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-[11px] font-semibold">
                            <Clock size={10} /> Overdue
                          </span>
                        )}
                      </td>
                      {user?.role === 'Admin' && (
                        <td className="py-3 text-right">
                          {f.payment_status !== 'paid' && (
                            <button
                              onClick={() => setPaymentForm({ fee_id: f.id, amount: Number(f.amount_due) - Number(f.amount_paid || 0) })}
                              className="text-[12px] text-[#5e6ad2] hover:text-[#828fff] font-medium"
                            >
                              Record Payment
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {fees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">No invoices generated.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Invoice Generation Form */}
          {user?.role === 'Admin' && (
            <div className="space-y-6">
              <div className="bg-secondary border border-border rounded-[12px] p-6 shadow-sm">
                <h3 className="font-display font-medium text-[18px] mb-4 flex items-center gap-2">
                  <Receipt size={18} className="text-[#5e6ad2]" />
                  Billing Run
                </h3>
                <form onSubmit={handleGenerateBilling} className="flex flex-col gap-4">
                  <Input
                    label="Cost per Credit ($)"
                    type="number"
                    value={billingForm.cost_per_credit}
                    onChange={e => setBillingForm({ ...billingForm, cost_per_credit: Number(e.target.value) })}
                    required
                  />
                  <Input
                    label="Due Date"
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={billingForm.due_date.substr(0, 10)}
                    onChange={e => setBillingForm({ ...billingForm, due_date: new Date(e.target.value).toISOString() })}
                    required
                  />
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Processing...' : 'Run Billing Script'}
                  </Button>
                </form>
              </div>

              {/* Record Payment Form */}
              {paymentForm.fee_id && (
                <div className="bg-secondary border border-border rounded-[12px] p-6 shadow-sm">
                  <h3 className="font-display font-medium text-[18px] mb-4">Record Payment</h3>
                  <form onSubmit={handleRecordPayment} className="flex flex-col gap-4">
                    <Input
                      label="Payment Amount ($)"
                      type="number"
                      value={paymentForm.amount}
                      onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                      required
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isLoading} className="flex-1">
                        Save
                      </Button>
                      <Button variant="secondary" onClick={() => setPaymentForm({ fee_id: '', amount: 0 })}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payroll Section */}
      {activeTab === 'payroll' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-secondary border border-border rounded-[12px] p-6 shadow-sm">
            <h3 className="font-display font-medium text-[18px] mb-4">Payslip Statements</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    {user?.role === 'Admin' && <th className="pb-3 font-semibold">Employee</th>}
                    <th className="pb-3 font-semibold">Month / Year</th>
                    <th className="pb-3 font-semibold">Base Salary</th>
                    <th className="pb-3 font-semibold">Allowances (+)</th>
                    <th className="pb-3 font-semibold">Deductions (-)</th>
                    <th className="pb-3 font-semibold">Net Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((s: any) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-background/40 transition-colors">
                      {user?.role === 'Admin' && (
                        <td className="py-3 font-medium">
                          {s.Staff?.staff_first_name} {s.Staff?.staff_last_name} ({s.Staff?.employee_code})
                        </td>
                      )}
                      <td className="py-3 font-mono">{s.payment_month}/{s.payment_year}</td>
                      <td className="py-3 font-mono">${Number(s.base_salary).toFixed(2)}</td>
                      <td className="py-3 font-mono text-green-600">+${Number(s.allowances || 0).toFixed(2)}</td>
                      <td className="py-3 font-mono text-red-500">-${Number(s.deductions || 0).toFixed(2)}</td>
                      <td className="py-3 font-mono font-bold text-[#5e6ad2]">${Number(s.net_salary).toFixed(2)}</td>
                    </tr>
                  ))}
                  {salaries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">No payroll slips available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Payslip Generation Form */}
          {user?.role === 'Admin' && (
            <div className="bg-secondary border border-border rounded-[12px] p-6 shadow-sm h-fit">
              <h3 className="font-display font-medium text-[18px] mb-4 flex items-center gap-2">
                <Plus size={18} className="text-[#5e6ad2]" />
                Generate Payslip
              </h3>
              <form onSubmit={handleGeneratePayslip} className="flex flex-col gap-4">
                <Select
                  label="Employee (Staff)"
                  value={payslipForm.staff_id}
                  onChange={e => setPayslipForm({ ...payslipForm, staff_id: e.target.value })}
                  options={[
                    { value: '', label: 'Select Employee' },
                    ...staff.map((s: any) => ({ value: s.id, label: `${s.staff_first_name} ${s.staff_last_name} (${s.employee_code})` }))
                  ]}
                  required
                />
                <Input
                  label="Base Salary ($)"
                  type="number"
                  value={payslipForm.base_salary}
                  onChange={e => setPayslipForm({ ...payslipForm, base_salary: Number(e.target.value) })}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Allowances ($)"
                    type="number"
                    value={payslipForm.allowances}
                    onChange={e => setPayslipForm({ ...payslipForm, allowances: Number(e.target.value) })}
                  />
                  <Input
                    label="Deductions ($)"
                    type="number"
                    value={payslipForm.deductions}
                    onChange={e => setPayslipForm({ ...payslipForm, deductions: Number(e.target.value) })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Month"
                    value={String(payslipForm.payment_month)}
                    onChange={e => setPayslipForm({ ...payslipForm, payment_month: Number(e.target.value) })}
                    options={[
                      { value: '1', label: 'January' },
                      { value: '2', label: 'February' },
                      { value: '3', label: 'March' },
                      { value: '4', label: 'April' },
                      { value: '5', label: 'May' },
                      { value: '6', label: 'June' },
                      { value: '7', label: 'July' },
                      { value: '8', label: 'August' },
                      { value: '9', label: 'September' },
                      { value: '10', label: 'October' },
                      { value: '11', label: 'November' },
                      { value: '12', label: 'December' }
                    ]}
                  />
                  <Input
                    label="Year"
                    type="number"
                    value={payslipForm.payment_year}
                    onChange={e => setPayslipForm({ ...payslipForm, payment_year: Number(e.target.value) })}
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="mt-2">
                  {isLoading ? 'Creating...' : 'Issue Payslip'}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
