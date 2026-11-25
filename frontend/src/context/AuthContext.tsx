import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { api } from '../api';
import { useLanguage } from './LanguageContext';
import { DEFAULT_LANGUAGE, isSupportedLanguage, type LanguageCode } from '../i18n';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, preferredLanguage: LanguageCode) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setCompletedOnboarding: () => void;
  updatePreferredLanguage: (lang: LanguageCode) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setLanguage } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('new_career_token'));
  const [loading, setLoading] = useState(true);

  const applyUserLanguage = useCallback(
    (u: User | null) => {
      if (u && isSupportedLanguage(u.preferred_language)) {
        setLanguage(u.preferred_language);
      } else {
        setLanguage(DEFAULT_LANGUAGE);
      }
    },
    [setLanguage]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('new_career_token');
    setToken(null);
    setUser(null);
    setLanguage(DEFAULT_LANGUAGE);
  }, [setLanguage]);

  const initAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('new_career_token');
    if (!savedToken) {
      setLanguage(DEFAULT_LANGUAGE);
      setLoading(false);
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me);
      setToken(savedToken);
      applyUserLanguage(me);
    } catch (err) {
      console.warn('Session expired:', err);
      logout();
    } finally {
      setLoading(false);
    }
  }, [applyUserLanguage, logout, setLanguage]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener('new-career:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('new-career:unauthorized', handleUnauthorized);
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('new_career_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    applyUserLanguage(res.user);
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    preferredLanguage: LanguageCode
  ): Promise<User> => {
    const res = await api.register(fullName, email, password, preferredLanguage);
    localStorage.setItem('new_career_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    applyUserLanguage(res.user);
    return res.user;
  };

  const refreshUser = async () => {
    try {
      const me = await api.getMe();
      setUser(me);
      applyUserLanguage(me);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const setCompletedOnboarding = () => {
    if (user) {
      setUser({ ...user, has_completed_onboarding: true });
    }
  };

  const updatePreferredLanguage = async (lang: LanguageCode) => {
    setLanguage(lang);
    if (!user) return;
    const updated = await api.updatePreferredLanguage(lang);
    setUser(updated);
    applyUserLanguage(updated);
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
        setCompletedOnboarding,
        updatePreferredLanguage,
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
