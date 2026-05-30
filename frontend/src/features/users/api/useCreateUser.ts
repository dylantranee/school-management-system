import { useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';

export const useCreateUser = () => {
  return useMutation({
    mutationFn: async (userData: any) => {
      const response = await api.post('/users', userData);
      return response.data;
    }
  });
};
