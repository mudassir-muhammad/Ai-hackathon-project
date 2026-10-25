import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardStats, Announcement } from '../types';
import { FaceRegistrationModal } from './FaceRegistrationModal';
import {
  Clock,
  CalendarCheck,
  CalendarDays,
  FileText,
  Sparkles,
  Camera,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  ArrowRight,
  RefreshCw,
  ScanFace,
} from 'lucide-react';

interface EmployeeDashboardProps {
  onOpenCameraModal: () => void;
  onOpenAIWithPrompt: (prompt: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  onOpenCameraModal,
  onOpenAIWithPrompt,
  onNavigateTab,
}) => {
  const { user, employee } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([api.getDashboardStats(), api.getAnnouncements()]);
      setStats(s);
      setAnnouncements(a);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleWebCheckIn = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const res = await api.checkIn({ source: 'web' });
      setMessage({ text: res.message, type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setChecking(false);
    }
  };

  const handleWebCheckOut = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const res = await api.checkOut();
      setMessage({ text: res.message, type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setChecking(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading self-service portal...
      </div>
    );
  }

  const ed = stats?.employeeDashboard;
  const isCheckedIn = !!ed?.todayCheckIn;
  const isCheckedOut = !!ed?.todayCheckOut;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 uppercase tracking-wider backdrop-blur-xs">
              Employee Self-Service
            </span>
            <h1 className="text-2xl font-black mt-2 tracking-tight">
              Welcome back, {employee?.name || user?.name}!
            </h1>
            <p className="text-xs text-emerald-100 mt-1">
              Code: <span className="font-mono font-bold">{employee?.employeeCode}</span> · {employee?.gender === 'female' ? 'She/Her' : 'He/Him'} · Status: Active
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenAIWithPrompt('How many sick leaves do I have left this year?')}
            className="px-4 py-2.5 rounded-xl bg-white text-emerald-800 text-xs font-bold shadow-md hover:bg-emerald-50 transition-all flex items-center gap-2 self-start"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" /> Ask AI My Leave Balance
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2 animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Face Registration Prompt if not yet enrolled */}
      {!employee?.facePhotoUrl && (
        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-xs shrink-0">
              <ScanFace className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Enroll Face for 1-Click Biometric Attendance & Login</span>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.2 rounded-full">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Register your face picture using your camera to log in and stamp your attendance with facial recognition.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFaceModal(true)}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-xs shrink-0 self-stretch sm:self-auto justify-center"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Register Face Photo</span>
          </button>
        </div>
      )}

      {/* Main Grid: Check-in widget, Hours this week, Late count, Last payslip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Check-In Widget */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Today's Check-In</span>
              <CalendarCheck className="w-4 h-4 text-emerald-500" />
            </div>

            <div className="text-lg font-black text-slate-900 dark:text-white">
              {isCheckedIn ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Checked In
                </span>
              ) : (
                <span className="text-slate-400 font-medium">Not Checked In</span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {ed?.todayCheckIn ? (
                <span>In: {new Date(ed.todayCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              ) : (
                <span>Office Start: 09:00 (Grace: 15m)</span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            {!isCheckedIn ? (
              <>
                <button
                  type="button"
                  onClick={handleWebCheckIn}
                  disabled={checking}
                  className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all disabled:opacity-50"
                  title="Standard Web 1-click Check-In"
                >
                  {checking ? '...' : 'Web'}
                </button>
                <button
                  type="button"
                  onClick={onOpenCameraModal}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  title="Mark attendance with Camera & GPS Geofencing (Section 5 Bonus)"
                >
                  <Camera className="w-3.5 h-3.5 text-teal-100" /> Camera Check-In
                </button>
              </>
            ) : !isCheckedOut ? (
              <button
                type="button"
                onClick={handleWebCheckOut}
                disabled={checking}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs disabled:opacity-50"
              >
                {checking ? 'Stamping...' : 'Check-Out for Today'}
              </button>
            ) : (
              <div className="w-full text-center py-1.5 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                Day Completed
              </div>
            )}
          </div>
        </div>

        {/* Hours This Week vs 40 h */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Hours This Week</span>
              <Clock className="w-4 h-4 text-teal-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {ed?.hoursThisWeek || 0} <span className="text-xs font-normal text-slate-400">/ 40 hrs</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-teal-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, ((ed?.hoursThisWeek || 0) / 40) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-1.5">
              Standard 40 hours per work week
            </div>
          </div>
        </div>

        {/* Late Count */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Late Count (Month)</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {ed?.lateCountMonth || 0}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            {ed?.lateCountMonth && ed.lateCountMonth >= 3
              ? 'Warning: 3 lates reached = 0.5 day deduction applied'
              : 'Punctuality status: Good'}
          </div>
        </div>

        {/* Last Payslip */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Last Payslip</span>
              <FileText className="w-4 h-4 text-blue-500" />
            </div>
            {ed?.lastPayslip ? (
              <div>
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  PKR {ed.lastPayslip.netSalary.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Month: {ed.lastPayslip.month}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">No finalized payslip yet</div>
            )}
          </div>

          <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigateTab('payroll')}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              View Payslips <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-500" />
            Your Annual Leave Quota Balances
          </h3>
          <button
            onClick={() => onNavigateTab('leaves')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Apply for leave &rarr;
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ed?.leaveBalances?.map((b, i) => (
            <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{b.name}</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {b.remaining}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Total Quota: {b.quota} days/yr
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Announcements */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-teal-500" />
          Company Announcements
        </h3>
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="text-xs text-slate-400">No announcements posted</div>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>{a.title}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{a.content}</p>
                <div className="text-[10px] text-slate-400 mt-1">Posted by {a.postedByName}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Face Registration Modal */}
      <FaceRegistrationModal
        isOpen={showFaceModal}
        onClose={() => setShowFaceModal(false)}
        targetEmployee={employee}
        onSuccess={() => {
          loadData();
          setMessage({ text: 'Face profile registered successfully in the database!', type: 'success' });
        }}
      />
    </div>
  );
};
