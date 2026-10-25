import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Building2,
  Bell,
  Sun,
  Moon,
  LogOut,
  Sparkles,
  BookOpen,
  CloudUpload,
  User,
  Shield,
  Briefcase,
  Check,
  Camera,
} from 'lucide-react';

interface NavbarProps {
  onShowDemoGuide: () => void;
  onShowDeploymentGuide: () => void;
  onOpenCameraModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onShowDemoGuide,
  onShowDeploymentGuide,
  onOpenCameraModal,
}) => {
  const {
    user,
    employee,
    settings,
    logout,
    darkMode,
    toggleDarkMode,
    switchDemoRole,
    notifications,
    unreadCount,
    refreshNotifications,
  } = useAuth();

  const [showNotifs, setShowNotifs] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleRoleSwitch = async (role: 'admin' | 'hr' | 'employee') => {
    if (user?.role === role) return;
    setSwitching(true);
    try {
      await switchDemoRole(role);
    } finally {
      setSwitching(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id);
    await refreshNotifications();
  };

  const roleBadgeColor =
    user?.role === 'admin'
      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
      : user?.role === 'hr'
      ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800';

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 dark:text-white tracking-tight text-base sm:text-lg">
              HCM Lite
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              Saylani
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate max-w-xs">
            {settings?.companyName || 'Saylani IT Park'}
          </p>
        </div>
      </div>

      {/* Center: Live Role Switcher (Judge Favorite Feature!) */}
      <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <span className="px-2 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-500" /> Switch Role:
        </span>
        <button
          onClick={() => handleRoleSwitch('admin')}
          disabled={switching}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            user?.role === 'admin'
              ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Admin
        </button>
        <button
          onClick={() => handleRoleSwitch('hr')}
          disabled={switching}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            user?.role === 'hr'
              ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" /> HR
        </button>
        <button
          onClick={() => handleRoleSwitch('employee')}
          disabled={switching}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            user?.role === 'employee'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" /> Employee
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Camera Check-In Button (Section 5 Bonus) */}
        <button
          type="button"
          onClick={onOpenCameraModal}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-300 dark:border-teal-700/70 transition-all flex items-center gap-1.5 shadow-xs"
          title="Mark attendance with Camera & GPS Geofence (Section 5 Bonus)"
        >
          <Camera className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span className="inline">Camera Check-In</span>
        </button>

        {/* 5-Min Judge Demo Guide */}
        <button
          type="button"
          onClick={onShowDemoGuide}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/80 transition-colors flex items-center gap-1.5"
          title="Step-by-step 5-minute hackathon demo script"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Demo Guide</span>
        </button>

        {/* Deployment & Code Guide */}
        <button
          type="button"
          onClick={onShowDeploymentGuide}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
          title="How to run, deploy, and submit this project"
        >
          <CloudUpload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Deployment</span>
        </button>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle dark theme"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-3 z-50">
              <div className="px-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Notifications</span>
                <span className="text-[10px] text-slate-400">{unreadCount} unread</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className={`p-3 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        !n.isRead ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                        <span>{n.title}</span>
                        {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User badge & logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {user?.name}
            </div>
            <span
              className={`inline-block text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-md border mt-0.5 ${roleBadgeColor}`}
            >
              {user?.role}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
