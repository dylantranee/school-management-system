import { useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';

export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await api.post('/auth/forgot-password', data);
      return response.data;
    }
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const response = await api.post('/auth/reset-password', data);
      return response.data;
    }
  });
};

export const useActivateAccountMutation = () => {
  return useMutation({
    mutationFn: async (data: { token: string; password: string }) => {
      const response = await api.post('/auth/activate', data);
      return response.data;
    }
  });
};
