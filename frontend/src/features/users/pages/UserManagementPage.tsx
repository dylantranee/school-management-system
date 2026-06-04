import { useState } from 'react';
import { CreateUserForm } from '../components/CreateUserForm';
import {
  useUsersList,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  useUnlockUserMutation,
  useResendActivationMutation,
  useUpdateRoleMutation,
  useDeleteUserMutation
} from '../api/users.hooks';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ShieldAlert, Key, RefreshCw, Trash2, UserPlus, Users as UsersIcon } from 'lucide-react';

export const UserManagementPage = () => {
  const { user: currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [localSuccessMsg, setLocalSuccessMsg] = useState('');
  const [localErrorMsg, setLocalErrorMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState('');

  // Fetch users with debounce-like query params
  const { data: usersData, isLoading: isListLoading, refetch } = useUsersList({
    page,
    limit: 10,
    search,
    role: roleFilter,
    status: statusFilter
  });

  // Action mutations
  const deactivateMutation = useDeactivateUserMutation();
  const reactivateMutation = useReactivateUserMutation();
  const unlockMutation = useUnlockUserMutation();
  const resendActivationMutation = useResendActivationMutation();
  const updateRoleMutation = useUpdateRoleMutation();
  const deleteMutation = useDeleteUserMutation();

  const handleAction = async (actionFn: () => Promise<any>, successText: string) => {
    setLocalSuccessMsg('');
    setLocalErrorMsg('');
    setCopiedLink('');
    try {
      const res = await actionFn();
      setLocalSuccessMsg(successText);
      if (res?.activationToken) {
        setCopiedLink(`${window.location.origin}/activate?token=${res.activationToken}`);
      }
      refetch();
    } catch (err: any) {
      setLocalErrorMsg(err.response?.data?.message || 'Action failed.');
    }
  };

  const handleDeactivate = (userId: string) => {
    if (userId === currentUser?.id) {
      setLocalErrorMsg('Self-deactivation, self-demotion, or self-deletion is not permitted.');
      return;
    }
    handleAction(() => deactivateMutation.mutateAsync(userId), 'User account deactivated successfully.');
  };

  const handleReactivate = (userId: string) => {
    handleAction(() => reactivateMutation.mutateAsync(userId), 'User account reactivated successfully.');
  };

  const handleUnlock = (userId: string) => {
    handleAction(() => unlockMutation.mutateAsync(userId), 'User account unlocked successfully.');
  };

  const handleResendActivation = (userId: string) => {
    handleAction(() => resendActivationMutation.mutateAsync(userId), 'Activation link generated.');
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    if (userId === currentUser?.id) {
      setLocalErrorMsg('Self-deactivation, self-demotion, or self-deletion is not permitted.');
      return;
    }
    handleAction(() => updateRoleMutation.mutateAsync({ id: userId, role: newRole }), 'User role updated successfully.');
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser?.id) {
      setLocalErrorMsg('Self-deactivation, self-demotion, or self-deletion is not permitted.');
      return;
    }
    if (!confirm('Are you sure you want to permanently delete this user account? This cannot be undone.')) return;
    handleAction(() => deleteMutation.mutateAsync(userId), 'User permanently deleted.');
  };

  const users = usersData?.users || [];
  const pagination = usersData?.pagination || { totalPages: 1, totalCount: 0 };

  const getUserStatusLabel = (u: any) => {
    if (u.is_active) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-50 border border-green-200 text-green-600">
          Active
        </span>
      );
    }
    if (u.activation_token_hash) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 border border-blue-200 text-blue-600">
          Pending
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 border border-red-200 text-red-600">
        Inactive
      </span>
    );
  };

  return (
    <div className="p-12 max-w-[1280px] mx-auto w-full">
      <header className="mb-8">
        <h1 className="font-display text-[32px] tracking-[-0.8px] font-semibold text-foreground">
          User Account Directory
        </h1>
        <p className="font-sans text-[16px] text-muted-foreground mt-2">
          Monitor user registrations, suspend/reactivate accounts, update authorization roles, and audit access permissions.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border pb-4 mb-8">
        <button
          onClick={() => { setActiveTab('list'); setLocalSuccessMsg(''); setLocalErrorMsg(''); setCopiedLink(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-[14px] font-medium rounded-md transition-colors ${activeTab === 'list' ? 'bg-[#5e69d1]/10 text-[#5e69d1]' : 'text-muted-foreground hover:bg-secondary-foreground/5 hover:text-foreground'}`}
        >
          <UsersIcon size={16} />
          Directory Directory
        </button>
        <button
          onClick={() => { setActiveTab('create'); setLocalSuccessMsg(''); setLocalErrorMsg(''); setCopiedLink(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-[14px] font-medium rounded-md transition-colors ${activeTab === 'create' ? 'bg-[#5e69d1]/10 text-[#5e69d1]' : 'text-muted-foreground hover:bg-secondary-foreground/5 hover:text-foreground'}`}
        >
          <UserPlus size={16} />
          Create User Account
        </button>
      </div>

      {localSuccessMsg && (
        <div className="p-4 mb-6 rounded-md bg-[#5e69d1]/10 border border-[#5e69d1]/20 text-[#5e69d1] text-[14px] flex flex-col gap-2">
          <span>{localSuccessMsg}</span>
          {copiedLink && (
            <div className="mt-1 flex flex-col gap-1">
              <span className="text-[12px] font-semibold text-muted-foreground">Activation Onboarding Link:</span>
              <input 
                type="text" 
                readOnly 
                value={copiedLink}
                className="w-full bg-background border border-border rounded px-2 py-1 text-[12px] font-mono select-all text-foreground"
              />
            </div>
          )}
        </div>
      )}

      {localErrorMsg && (
        <div className="p-4 mb-6 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[14px] flex items-center gap-2">
          <ShieldAlert size={16} />
          <span>{localErrorMsg}</span>
        </div>
      )}

      {activeTab === 'list' ? (
        <div className="space-y-6">
          {/* Filters Pane */}
          <div className="bg-secondary border border-border rounded-[12px] p-5 shadow-sm flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Input
                label="Search Email"
                placeholder="Enter email to query..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="w-full md:w-[180px]">
              <Select
                label="Filter Role"
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                options={[
                  { value: '', label: 'All Roles' },
                  { value: 'Admin', label: 'Admin' },
                  { value: 'Staff', label: 'Staff' },
                  { value: 'Student', label: 'Student' }
                ]}
              />
            </div>
            <div className="w-full md:w-[180px]">
              <Select
                label="Filter Status"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                  { value: 'Pending', label: 'Pending' }
                ]}
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-secondary border border-border rounded-[12px] p-6 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[14px]">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-3 font-semibold">User Email</th>
                    <th className="pb-3 font-semibold">Role</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Lockout Info</th>
                    <th className="pb-3 text-right">Actions / Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {isListLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Loading directory directory...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No registered users match these filters.
                      </td>
                    </tr>
                  ) : (
                    users.map((u: any) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-background/40 transition-colors">
                        <td className="py-3.5 font-medium text-foreground truncate max-w-[200px]">{u.email}</td>
                        <td className="py-3.5">
                          {u.id === currentUser?.id ? (
                            <span className="font-semibold text-foreground text-[13px]">{u.role}</span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="bg-background border border-border rounded px-2 py-1 text-[13px] font-sans text-foreground focus:outline-none focus:border-[#5e6ad2]"
                            >
                              <option value="Admin">Admin</option>
                              <option value="Staff">Staff</option>
                              <option value="Student">Student</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3.5">{getUserStatusLabel(u)}</td>
                        <td className="py-3.5 text-xs font-mono text-muted-foreground">
                          {u.locked_until && new Date(u.locked_until) > new Date() ? (
                            <span className="text-destructive flex items-center gap-1">
                              <ShieldAlert size={12} /> Locked
                            </span>
                          ) : (
                            <span>Unlocked</span>
                          )}
                        </td>
                        <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {/* Unlock */}
                          {u.locked_until && new Date(u.locked_until) > new Date() && (
                            <button
                              onClick={() => handleUnlock(u.id)}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                              title="Unlock Account"
                            >
                              <Key size={15} />
                            </button>
                          )}

                          {/* Resend Activation */}
                          {!u.is_active && u.activation_token_hash && (
                            <button
                              onClick={() => handleResendActivation(u.id)}
                              className="p-1.5 text-[#5e6ad2] hover:bg-[#5e6ad2]/10 rounded transition-colors"
                              title="Resend Activation Link"
                            >
                              <RefreshCw size={15} />
                            </button>
                          )}

                          {/* Deactivate / Reactivate Toggle */}
                          {u.id !== currentUser?.id && (
                            u.is_active ? (
                              <button
                                onClick={() => handleDeactivate(u.id)}
                                className="px-2.5 py-1 text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                title="Deactivate/Suspend User"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(u.id)}
                                className="px-2.5 py-1 text-xs font-medium border border-green-300 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Reactivate User"
                              >
                                Activate
                              </button>
                            )
                          )}

                          {/* Delete Account */}
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                              title="Delete Account Permanently"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
                <span className="text-[12px] text-muted-foreground">
                  Showing page {page} of {pagination.totalPages} ({pagination.totalCount} total users)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-[420px] bg-secondary border border-border rounded-[16px] p-8 shadow-sm mx-auto">
          <CreateUserForm />
        </div>
      )}
    </div>
  );
};
