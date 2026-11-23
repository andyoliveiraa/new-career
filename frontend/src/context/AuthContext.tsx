import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { api } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setCompletedOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('new_career_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    const savedToken = localStorage.getItem('new_career_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me);
      setToken(savedToken);
    } catch (err) {
      console.warn('Sessão expirada:', err);
      localStorage.removeItem('new_career_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('new_career_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const register = async (fullName: string, email: string, password: string): Promise<User> => {
    const res = await api.register(fullName, email, password);
    localStorage.setItem('new_career_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('new_career_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const me = await api.getMe();
      setUser(me);
    } catch (err) {
      console.error('Erro ao atualizar dados do utilizador:', err);
    }
  };

  const setCompletedOnboarding = () => {
    if (user) {
      setUser({ ...user, has_completed_onboarding: true });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        setCompletedOnboarding
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider');
  }
  return context;
};
