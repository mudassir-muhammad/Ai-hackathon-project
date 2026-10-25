import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Employee, CompanySettings, Notification } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  settings: CompanySettings | null;
  isConfigured: boolean;
  isLoading: boolean;
  darkMode: boolean;
  notifications: Notification[];
  unreadCount: number;
  login: (email: string, pass: string) => Promise<void>;
  faceLogin: (
    payload:
      | number[]
      | {
          faceDescriptor: number[];
          latitude?: number;
          longitude?: number;
          accuracy?: number;
          faceCount?: number;
        }
  ) => Promise<any>;
  verifyAndRegisterFace: (email: string, pass: string, photo: string, descriptor: number[]) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  toggleDarkMode: () => void;
  switchDemoRole: (role: 'admin' | 'hr' | 'employee') => Promise<void>;
  seedDemoData: () => Promise<void>;
  resetToFresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('hcm_dark_mode') === 'true';
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('hcm_dark_mode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const checkInitialStatus = async () => {
    setIsLoading(true);
    try {
      const status = await api.getStatus();
      setIsConfigured(status.isConfigured);

      if (api.getToken()) {
        try {
          const me = await api.getMe();
          setUser(me.user);
          setEmployee(me.employee);
          setSettings(me.settings);
          await refreshNotifications();
        } catch {
          api.clearToken();
          setUser(null);
          setEmployee(null);
        }
      }
    } catch (e) {
      console.error('Failed to load initial system status:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshNotifications = async () => {
    if (!api.getToken()) return;
    try {
      const notifs = await api.getNotifications();
      setNotifications(notifs);
    } catch {
      // ignore
    }
  };

  const refreshUser = async () => {
    try {
      const me = await api.getMe();
      setUser(me.user);
      setEmployee(me.employee);
      setSettings(me.settings);
      setIsConfigured(true);
      await refreshNotifications();
    } catch (e) {
      console.error('Refresh user failed:', e);
    }
  };

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    setUser(res.user);
    setEmployee(res.employee || null);
    setIsConfigured(true);
    const me = await api.getMe();
    setSettings(me.settings);
    await refreshNotifications();
  };

  const faceLogin = async (
    payload:
      | number[]
      | {
          faceDescriptor: number[];
          latitude?: number;
          longitude?: number;
          accuracy?: number;
          faceCount?: number;
        }
  ) => {
    const res = await api.faceLogin(payload);
    setUser(res.user);
    setEmployee(res.employee || null);
    setIsConfigured(true);
    const me = await api.getMe();
    setSettings(me.settings);
    await refreshNotifications();
    return res;
  };

  const verifyAndRegisterFace = async (email: string, pass: string, photo: string, descriptor: number[]) => {
    const res = await api.verifyAndRegisterFace(email, pass, photo, descriptor);
    setUser(res.user);
    setEmployee(res.employee || null);
    setIsConfigured(true);
    const me = await api.getMe();
    setSettings(me.settings);
    await refreshNotifications();
    return res;
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
    setEmployee(null);
  };

  const switchDemoRole = async (targetRole: 'admin' | 'hr' | 'employee') => {
    try {
      // Try logging in with the standard demo credentials
      if (targetRole === 'admin') {
        await login('admin@saylani.com', 'Admin@123');
      } else if (targetRole === 'hr') {
        await login('ayesha.hr@saylani.com', 'Hr@123');
      } else {
        await login('bilal@saylani.com', 'Employee@123');
      }
    } catch (err: any) {
      console.warn(`Could not switch automatically to ${targetRole}:`, err);
      // If demo data not seeded yet, seed it and login
      await api.seedHackathonDemo();
      if (targetRole === 'admin') await login('admin@saylani.com', 'Admin@123');
      else if (targetRole === 'hr') await login('ayesha.hr@saylani.com', 'Hr@123');
      else await login('bilal@saylani.com', 'Employee@123');
    }
  };

  const seedDemoData = async () => {
    setIsLoading(true);
    try {
      await api.seedHackathonDemo();
      await login('admin@saylani.com', 'Admin@123');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToFresh = async () => {
    setIsLoading(true);
    try {
      await api.resetFresh();
      logout();
      setIsConfigured(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkInitialStatus();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        settings,
        isConfigured,
        isLoading,
        darkMode,
        notifications,
        unreadCount,
        login,
        faceLogin,
        verifyAndRegisterFace,
        logout,
        refreshUser,
        refreshNotifications,
        toggleDarkMode,
        switchDemoRole,
        seedDemoData,
        resetToFresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
