import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { api, setFallbackToken, clearFallbackToken } from '../api/client';

interface User {
  id: number;
  username: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const authCheckVersion = useRef(0);

  useEffect(() => {
    const version = ++authCheckVersion.current;

    api
      .get<User>('/auth/me')
      .then((currentUser) => {
        if (authCheckVersion.current === version) {
          setUser(currentUser);
        }
      })
      .catch((err) => {
        if (authCheckVersion.current === version) {
          // Check if this is likely a cookie issue on iOS
          if (err?.message === 'Network Error' || err instanceof TypeError) {
            console.error(
              'Auth check failed - this may be due to cross-site cookie restrictions on iOS. ' +
                'Try refreshing or check browser settings.',
            );
          }
          setUser(null);
        }
      })
      .finally(() => {
        if (authCheckVersion.current === version) {
          setLoading(false);
        }
      });

    // Fetch and apply theme
    api
      .get<{ theme: string; refreshInterval: number }>('/settings')
      .then((data) => {
        document.documentElement.setAttribute('data-theme', data.theme);
      })
      .catch(() => {
        document.documentElement.setAttribute('data-theme', 'terminal');
      });
  }, []);

  const login = async (username: string, password: string) => {
    // Invalidate any in-flight /auth/me result from initial app bootstrap.
    authCheckVersion.current += 1;
    const response = await api.post<{
      id: number;
      username: string;
      role: string;
      token: string;
    }>('/auth/login', { username, password });
    // Store token in localStorage as fallback for iOS cross-site cookie issues
    setFallbackToken(response.token);
    setUser(response);
    setLoading(false);
  };

  const register = async (username: string, password: string) => {
    await api.post('/auth/register', { username, password });
  };

  const logout = async () => {
    await api.post('/auth/logout');
    clearFallbackToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
