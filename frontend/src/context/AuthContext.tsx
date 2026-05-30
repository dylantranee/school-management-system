import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import api from '@/lib/axios';

interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUserWithStorage = (newUser: User | null) => {
    if (newUser) {
      localStorage.setItem('isAuthenticated', 'true');
    } else {
      localStorage.removeItem('isAuthenticated');
    }
    setUser(newUser);
  };

  useEffect(() => {
    const recoverSession = async () => {
      const hasSession = localStorage.getItem('isAuthenticated') === 'true';
      if (!hasSession) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUserWithStorage(response.data);
      } catch (error) {
        setUserWithStorage(null);
      } finally {
        setLoading(false);
      }
    };
    recoverSession();
  }, []);

  useEffect(() => {
    // Interceptor to handle global 401s (Scenario 2 of SMS-22)
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setUserWithStorage(null);
          // Only redirect if not already on login
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?expired=true';
          }
        }
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptor);
  }, []);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Frontend-first logout fail-safe (Scenario 3 of SMS-22)
      setUserWithStorage(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser: setUserWithStorage, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
