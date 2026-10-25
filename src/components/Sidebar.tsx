import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  Receipt,
  Settings,
  ShieldAlert,
  Megaphone,
  UserCircle,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAI: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenAI }) => {
  const { user } = useAuth();
  const role = user?.role || 'employee';

  const adminMenu = [
    { id: 'dashboard', label: 'Company Dashboard', icon: LayoutDashboard },
    { id: 'org_setup', label: 'Organization Setup', icon: Settings },
    { id: 'employees', label: 'Employee Directory', icon: Users },
    { id: 'attendance', label: 'Attendance Board', icon: CalendarCheck },
    { id: 'leaves', label: 'Leave Management', icon: CalendarDays },
    { id: 'payroll', label: 'Payroll & Locking', icon: Receipt },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'audit_log', label: 'Audit Trail', icon: ShieldAlert },
  ];

  const hrMenu = [
    { id: 'dashboard', label: 'HR Operations', icon: LayoutDashboard },
    { id: 'employees', label: 'Employees & CSV', icon: Users },
    { id: 'attendance', label: 'Daily Attendance', icon: CalendarCheck },
    { id: 'leaves', label: 'Leave Approvals', icon: CalendarDays },
    { id: 'payroll', label: 'Monthly Payroll Draft', icon: Receipt },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ];

  const employeeMenu = [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Check-In & Attendance', icon: CalendarCheck },
    { id: 'leaves', label: 'Leave Requests', icon: CalendarDays },
    { id: 'payroll', label: 'My Payslips', icon: Receipt },
    { id: 'profile', label: 'My Profile (360)', icon: UserCircle },
    { id: 'directory', label: 'Staff Directory', icon: Users },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ];

  const menu = role === 'admin' ? adminMenu : role === 'hr' ? hrMenu : employeeMenu;

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 select-none transition-colors">
      <div className="p-4 flex-1 overflow-y-auto space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {role === 'admin' ? 'Administration' : role === 'hr' ? 'HR Operations' : 'Self-Service Portal'}
        </div>

        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* AI Assistant Quick Trigger at bottom of sidebar */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onOpenAI}
          className="w-full p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Sparkles className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <div className="text-xs font-bold leading-tight">AI Assistant</div>
              <div className="text-[10px] text-emerald-100 leading-tight">M8 Tool Calling</div>
            </div>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white">
            Ask
          </span>
        </button>
      </div>
    </aside>
  );
};
