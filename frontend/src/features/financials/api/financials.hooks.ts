import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// Queries
export const useFees = (params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['fees', params],
    queryFn: async () => {
      const response = await api.get('/fees', { params });
      return response.data;
    }
  });
};

export const useSalaries = (role?: string, params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['salaries', role, params],
    queryFn: async () => {
      const response = await api.get('/salaries', { params });
      return response.data;
    },
    enabled: role !== 'Student'
  });
};

export const useStaff = (role?: string) => {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await api.get('/staff');
      return response.data;
    },
    enabled: role === 'Admin'
  });
};

// Mutations
export const useGenerateBillingMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { cost_per_credit: number; due_date: string }) => {
      const response = await api.post('/fees/generate', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
    }
  });
};

export const useRecordPaymentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ feeId, amount }: { feeId: string; amount: number }) => {
      const response = await api.post(`/fees/${feeId}/pay`, { amount });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
    }
  });
};

export const useGeneratePayslipMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/salaries', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
    }
  });
};
