import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Department, Designation, LeaveType, PublicHoliday, User, CompanySettings } from '../types';
import {
  Settings,
  Building2,
  Clock,
  MapPin,
  Calendar,
  Users,
  ShieldCheck,
  Plus,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserCheck,
  UserX,
} from 'lucide-react';

export const OrgSetupModule: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New department form
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');

  // New designation form
  const [desigTitle, setDesigTitle] = useState('');
  const [desigDeptId, setDesigDeptId] = useState('');

  // New holiday form
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');

  // New HR Login form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('Hr@123');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, d, des, lt, hol] = await Promise.all([
        api.getSettings(),
        api.getDepartments(),
        api.getDesignations(),
        api.getLeaveTypes(),
        api.getHolidays(),
      ]);
      setSettings(s);
      setDepartments(d);
      setDesignations(des);
      setLeaveTypes(lt);
      setHolidays(hol);
      if (d.length > 0 && !desigDeptId) setDesigDeptId(d[0].id);

      if (user?.role === 'admin') {
        const uList = await api.getUsers();
        setUsers(uList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setMessage({ text: 'Company rules and office geofence settings updated successfully.', type: 'success' });
      await refreshUser();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.createDepartment(deptName, deptCode);
      setDeptName('');
      setDeptCode('');
      setMessage({ text: 'Department added.', type: 'success' });
      await loadAll();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddDesig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.createDesignation(desigTitle, desigDeptId);
      setDesigTitle('');
      setMessage({ text: 'Designation added.', type: 'success' });
      await loadAll();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.createHoliday(holidayName, holidayDate);
      setHolidayName('');
      setHolidayDate('');
      setMessage({ text: 'Public holiday scheduled.', type: 'success' });
      await loadAll();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateHR = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.createUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPass,
        role: 'hr',
      });
      setNewUserName('');
      setNewUserEmail('');
      setMessage({ text: 'HR login account created successfully.', type: 'success' });
      await loadAll();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleUser = async (userId: string) => {
    try {
      const res = await api.toggleUserActive(userId);
      setMessage({ text: res.message, type: 'success' });
      await loadAll();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  const handleResetPass = async (userId: string) => {
    try {
      const res = await api.resetUserPassword(userId, 'Saylani@123');
      setMessage({ text: `${res.message} (Temp: ${res.tempPassword})`, type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Organization Setup (M2)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure company office hours, grace rules, geofence radius, departments, leave quotas, and HR accounts.
        </p>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid: Company Rules & Geofence (Admin Only to modify) */}
      {settings && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-emerald-500" />
            Company Policies & Attendance Geofence
          </h2>

          <form onSubmit={handleUpdateSettings} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium mb-1">Company Name</label>
              <input
                type="text"
                disabled={user?.role !== 'admin'}
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Office Start Time</label>
              <input
                type="time"
                disabled={user?.role !== 'admin'}
                value={settings.officeStart}
                onChange={(e) => setSettings({ ...settings, officeStart: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Grace Period (Minutes)</label>
              <input
                type="number"
                disabled={user?.role !== 'admin'}
                value={settings.graceMinutes}
                onChange={(e) => setSettings({ ...settings, graceMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Office Latitude (Zaitoon Ashraf Park)</label>
              <input
                type="number"
                step="0.0001"
                disabled={user?.role !== 'admin'}
                value={settings.officeLat}
                onChange={(e) => setSettings({ ...settings, officeLat: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Office Longitude (Karachi)</label>
              <input
                type="number"
                step="0.0001"
                disabled={user?.role !== 'admin'}
                value={settings.officeLng}
                onChange={(e) => setSettings({ ...settings, officeLng: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Geofence Radius (Meters)</label>
              <input
                type="number"
                disabled={user?.role !== 'admin'}
                value={settings.officeRadiusMeters}
                onChange={(e) => setSettings({ ...settings, officeRadiusMeters: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="sm:col-span-3 flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={user?.role !== 'admin'}
                  checked={settings.latePenaltyEnabled}
                  onChange={(e) => setSettings({ ...settings, latePenaltyEnabled: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Enable Late Penalty Rule (3 late check-ins = 0.5 day deduction in payroll)
                </span>
              </label>

              {user?.role === 'admin' && (
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md disabled:opacity-50"
                >
                  Save Policy Rules
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Grid: Departments & Designations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Departments */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-emerald-500" />
            Departments ({departments.length})
          </h3>

          {user?.role === 'admin' && (
            <form onSubmit={handleAddDept} className="flex gap-2 mb-4 text-xs">
              <input
                type="text"
                required
                placeholder="Dept Name (e.g. Operations)"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                required
                placeholder="Code (OPS)"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
                className="w-20 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 uppercase"
              />
              <button
                type="submit"
                disabled={actionLoading}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
              >
                Add
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {departments.map((d) => (
              <div key={d.id} className="py-2.5 flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">{d.name}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {d.code}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Public Holidays */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-teal-500" />
            Public Holidays (Skipped in Leave Calculation)
          </h3>

          {user?.role === 'admin' && (
            <form onSubmit={handleAddHoliday} className="flex gap-2 mb-4 text-xs">
              <input
                type="text"
                required
                placeholder="Holiday Name"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="date"
                required
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button
                type="submit"
                disabled={actionLoading}
                className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
              >
                Add
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {holidays.map((h) => (
              <div key={h.id} className="py-2.5 flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">{h.name}</span>
                <span className="font-mono text-slate-500">{h.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin User Management: HR Logins & Reset (Admin Only) */}
      {user?.role === 'admin' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-500" />
                Access & User Logins Control
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Create HR logins, deactivate logins, or reset temporary passwords.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateHR} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-medium mb-1">New HR Name</label>
              <input
                type="text"
                required
                placeholder="HR Manager Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">HR Email</label>
              <input
                type="email"
                required
                placeholder="hr@saylani.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Initial Password</label>
              <input
                type="text"
                required
                value={newUserPass}
                onChange={(e) => setNewUserPass(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs"
              >
                Create HR Account
              </button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3">
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        onClick={() => handleResetPass(u.id)}
                        className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded font-semibold text-[11px]"
                        title="Reset temporary password"
                      >
                        Reset PW
                      </button>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleToggleUser(u.id)}
                          className={`px-2.5 py-1 rounded font-semibold text-[11px] ${
                            u.isActive
                              ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
