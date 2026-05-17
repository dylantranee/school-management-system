import { CreateUserForm } from '../components/CreateUserForm';

export const UserManagementPage = () => {
  return (
    <div className="w-full h-full p-12 flex items-start justify-center">
      <div className="w-full max-w-[420px] bg-secondary rounded-[16px] p-8 shadow-gray-200/50 shadow-2xl relative z-10 border border-border mt-12">
        <CreateUserForm />
      </div>
    </div>
  );
};
