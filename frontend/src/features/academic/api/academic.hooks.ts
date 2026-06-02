import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

// Queries
export const useCourseSections = () => {
  return useQuery({
    queryKey: ['course-sections'],
    queryFn: async () => {
      const response = await api.get('/course-sections');
      return response.data;
    }
  });
};

export const useSchedules = () => {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const response = await api.get('/schedules');
      return response.data;
    }
  });
};

export const useRooms = () => {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await api.get('/rooms');
      return response.data;
    }
  });
};

export const useSubjects = () => {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await api.get('/subjects');
      return response.data;
    }
  });
};

export const useStaff = () => {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await api.get('/staff');
      return response.data;
    }
  });
};

export const useMyEnrollments = () => {
  return useQuery({
    queryKey: ['enrollments'],
    queryFn: async () => {
      const response = await api.get('/enrollments');
      return response.data;
    }
  });
};

export const useSystemSettings = () => {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await api.get('/system-settings');
      return response.data;
    }
  });
};

// Mutations
export const useCreateSectionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/course-sections', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-sections'] });
    }
  });
};

export const useDeleteSectionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/course-sections/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-sections'] });
    }
  });
};

export const useCreateScheduleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/schedules', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });
};

export const useDeleteScheduleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/schedules/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });
};

export const useEnrollStudentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { course_section_id: string }) => {
      const response = await api.post('/enrollments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['course-sections'] });
    }
  });
};

export const useImportCsvMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ target, csvData }: { target: 'staff' | 'students'; csvData: string }) => {
      const endpoint = target === 'staff' ? '/staff/import' : '/students/import';
      const response = await api.post(endpoint, { csvData });
      return response.data;
    },
    onSuccess: (_, variables) => {
      if (variables.target === 'staff') {
        queryClient.invalidateQueries({ queryKey: ['staff'] });
      }
      queryClient.invalidateQueries({ queryKey: ['course-sections'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });
};
