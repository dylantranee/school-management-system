import { useMutation } from '@tanstack/react-query';
import api from '../../../lib/axios';

interface LoginResponse {
  message: string;
  user: any; // Ideally typed with the User model
  token: string;
}

export const useLogin = () => {
  return useMutation({
    mutationFn: async (credentials: any) => {
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      return response.data;
    }
  });
};
