import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LeaveRequest, LeaveBalance, LeaveType } from '../types';
import {
  CalendarDays,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  XCircle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

export const LeaveModule: React.FC = () => {
  const { user, employee } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Apply form state
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Smart Leave state (M8 & Brief requirement!)
  const [smartPrompt, setSmartPrompt] = useState('');
  const [parsingSmart, setParsingSmart] = useState(false);

  // HR Review state
  const [reviewingLeave, setReviewingLeave] = useState<LeaveRequest | null>(null);
  const [hrComment, setHrComment] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [lList, lTypes] = await Promise.all([api.getLeaves(), api.getLeaveTypes()]);
      setLeaves(lList);
      setLeaveTypes(lTypes);
      if (lTypes.length > 0 && !selectedType) {
        setSelectedType(lTypes[0].id);
      }

      if (user?.employeeId) {
        const bal = await api.getLeaveBalances(user.employeeId);
        setBalances(bal);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await api.applyLeave({
        leaveTypeId: selectedType,
        startDate,
        endDate,
        reason,
      });
      setMessage({ text: `${res.message} (Calculated ${res.workingDays} working days, excluding weekends & public holidays).`, type: 'success' });
      setReason('');
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSmartLeaveParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartPrompt.trim()) return;

    setParsingSmart(true);
    setMessage(null);
    try {
      const parsed = await api.parseSmartLeave(smartPrompt);
      // Map parsed type to id
      const matched = leaveTypes.find((t) => t.code === parsed.type || t.name.toLowerCase().includes(parsed.type.toLowerCase()));
      if (matched) setSelectedType(matched.id);
      setStartDate(parsed.start);
      setEndDate(parsed.end);
      setReason(parsed.reason);
      setMessage({
        text: `Smart Leave parsed: ${parsed.type.toUpperCase()} from ${parsed.start} to ${parsed.end}. Review and click 'Confirm & Submit Application'.`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({ text: err.message || 'Could not parse smart leave input.', type: 'error' });
    } finally {
      setParsingSmart(false);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(true);
    try {
      await api.cancelLeave(id);
      setMessage({ text: 'Leave request cancelled.', type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecide = async (status: 'approved' | 'rejected') => {
    if (!reviewingLeave) return;
    setActionLoading(true);
    try {
      await api.decideLeave(reviewingLeave.id, status, hrComment);
      setReviewingLeave(null);
      setHrComment('');
      setMessage({ text: `Leave request ${status} successfully.`, type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Leave Management & Approvals (M5)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Working days only rule (skips Sat-Sun & holidays). Quotas: Annual (14), Sick (8), Casual (10), Unpaid (Unlimited).
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

      {/* Leave Balances Grid (Shown to Employee) */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {balances.map((b) => (
            <div
              key={b.leaveTypeId}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs"
            >
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{b.name}</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {b.remainingDays >= 999 ? 'Unlimited' : b.remainingDays}{' '}
                <span className="text-xs font-normal text-slate-400">left</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Used: {b.usedDays} · Quota: {b.quota >= 999 ? '∞' : `${b.quota}/yr`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Smart Leave & Application Form (For Employees) */}
      {user?.role === 'employee' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Smart Leave AI input */}
          <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Smart Leave (AI Assistant M8)</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Type your leave in natural language or Roman Urdu (e.g. "Need next Monday and Tuesday off for sister's wedding")
                </p>
              </div>
            </div>

            <form onSubmit={handleSmartLeaveParse} className="mt-4 space-y-3">
              <input
                type="text"
                value={smartPrompt}
                onChange={(e) => setSmartPrompt(e.target.value)}
                placeholder="e.g. Need next Monday and Tuesday off for sister's wedding"
                className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={parsingSmart}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
              >
                {parsingSmart ? 'Parsing dates & reason...' : 'Auto-Fill Application with AI'}
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Standard Form */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-500" />
              Apply for Leave
            </h3>

            <form onSubmit={handleApply} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Leave Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.yearlyQuota >= 999 ? 'Unlimited' : `${t.yearlyQuota} days`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Reason</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for taking leave"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Submitting...' : 'Confirm & Submit Application'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Leaves Table & Approval Inbox */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-500" />
            {user?.role === 'employee' ? 'My Leave Applications' : 'Leave Approvals Queue (All Staff)'}
          </h2>
          <span className="text-xs text-slate-400">{leaves.length} requests</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                <th className="px-6 py-3 font-semibold">Employee</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold">Dates</th>
                <th className="px-6 py-3 font-semibold text-center">Working Days</th>
                <th className="px-6 py-3 font-semibold">Reason & HR Comment</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">
                      {l.employeeName || 'Staff Member'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                      {l.leaveTypeName}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                      {l.startDate} to {l.endDate}
                    </td>
                    <td className="px-6 py-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                      {l.workingDays} d
                    </td>
                    <td className="px-6 py-3.5 max-w-xs">
                      <div className="truncate text-slate-700 dark:text-slate-300">"{l.reason}"</div>
                      {l.hrComment && (
                        <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-0.5">
                          HR: {l.hrComment}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          l.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : l.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : l.status === 'cancelled'
                            ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {user?.role !== 'employee' && l.status === 'pending' && (
                        <button
                          onClick={() => setReviewingLeave(l)}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
                        >
                          Review
                        </button>
                      )}

                      {user?.role === 'employee' && l.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(l.id)}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal for HR */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Review Leave Application</h3>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-4 text-xs space-y-1">
              <div>Employee: <strong>{reviewingLeave.employeeName}</strong></div>
              <div>Type: <strong>{reviewingLeave.leaveTypeName}</strong></div>
              <div>Duration: {reviewingLeave.startDate} to {reviewingLeave.endDate} ({reviewingLeave.workingDays} working days)</div>
              <div>Reason: "{reviewingLeave.reason}"</div>
            </div>

            <div className="mb-4 text-xs">
              <label className="block font-medium mb-1">HR Comment (Required for record)</label>
              <textarea
                rows={2}
                value={hrComment}
                onChange={(e) => setHrComment(e.target.value)}
                placeholder="e.g. Approved. Have a good break."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReviewingLeave(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDecide('rejected')}
                disabled={actionLoading}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => handleDecide('approved')}
                disabled={actionLoading}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Approve Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
