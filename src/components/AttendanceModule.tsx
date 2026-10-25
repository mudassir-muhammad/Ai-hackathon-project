import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AttendanceRecord, AttendanceCorrection } from '../types';
import {
  CalendarCheck,
  Clock,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Plus,
  RefreshCw,
  Search,
  MapPin,
} from 'lucide-react';

export const AttendanceModule: React.FC<{ onOpenCameraModal: () => void }> = ({ onOpenCameraModal }) => {
  const { user, employee, settings } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Correction form state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionDate, setCorrectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [correctionCheckIn, setCorrectionCheckIn] = useState('09:00');
  const [correctionCheckOut, setCorrectionCheckOut] = useState('17:30');
  const [correctionReason, setCorrectionReason] = useState('');

  // HR Review modal state
  const [reviewingCorrection, setReviewingCorrection] = useState<AttendanceCorrection | null>(null);
  const [hrComment, setHrComment] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [att, cor] = await Promise.all([
        api.getAttendance({ date: user?.role === 'employee' ? undefined : selectedDate }),
        api.getAttendanceCorrections(),
      ]);
      setRecords(att);
      setCorrections(cor);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleWebCheckIn = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.checkIn({ source: 'web' });
      setMessage({ text: res.message, type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleWebCheckOut = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.checkOut();
      setMessage({ text: res.message, type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.requestAttendanceCorrection({
        date: correctionDate,
        requestedCheckIn: `${correctionDate}T${correctionCheckIn}:00Z`,
        requestedCheckOut: correctionCheckOut ? `${correctionDate}T${correctionCheckOut}:00Z` : undefined,
        reason: correctionReason,
      });
      setShowCorrectionModal(false);
      setCorrectionReason('');
      setMessage({ text: 'Attendance correction request submitted to HR.', type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewCorrection = async (status: 'approved' | 'rejected') => {
    if (!reviewingCorrection) return;
    setActionLoading(true);
    try {
      await api.reviewAttendanceCorrection(reviewingCorrection.id, status, hrComment);
      setReviewingCorrection(null);
      setHrComment('');
      setMessage({ text: `Correction request marked as ${status}.`, type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const myTodayRecord = records.find((r) => r.employeeId === user?.employeeId && r.date === today);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Attendance & Time Tracking (M4)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Office Start: {settings?.officeStart || '09:00'} (Grace: {settings?.graceMinutes || 15}m) · Half Day &lt; {settings?.halfDayHours || 5}h
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === 'employee' && (
            <>
              {!myTodayRecord ? (
                <>
                  <button
                    onClick={handleWebCheckIn}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    Web Check-In
                  </button>
                  <button
                    onClick={onOpenCameraModal}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" /> Camera Check-In
                  </button>
                </>
              ) : !myTodayRecord.checkOutTime ? (
                <button
                  onClick={handleWebCheckOut}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  Check-Out Now
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Today Completed
                </span>
              )}

              <button
                onClick={() => setShowCorrectionModal(true)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Request Correction
              </button>
            </>
          )}

          {user?.role !== 'employee' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
            />
          )}
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Attendance Board Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
            {user?.role === 'employee' ? 'My Attendance History' : `Daily Board (${selectedDate})`}
          </h2>
          <span className="text-xs text-slate-400">{records.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                <th className="px-6 py-3 font-semibold">Date</th>
                {user?.role !== 'employee' && <th className="px-6 py-3 font-semibold">Employee</th>}
                <th className="px-6 py-3 font-semibold">Check-In</th>
                <th className="px-6 py-3 font-semibold">Check-Out</th>
                <th className="px-6 py-3 font-semibold text-center">Hours</th>
                <th className="px-6 py-3 font-semibold">Source</th>
                <th className="px-6 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No attendance records found for this period.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const statusBadge =
                    r.status === 'present'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : r.status === 'late'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-3.5 font-mono font-medium text-slate-900 dark:text-white">
                        {r.date}
                      </td>
                      {user?.role !== 'employee' && (
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">{r.employeeName}</div>
                          <div className="text-[10px] text-slate-400">{r.employeeCode} · {r.departmentName}</div>
                        </td>
                      )}
                      <td className="px-6 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                        {new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                        {r.checkOutTime ? (
                          new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="text-slate-400 italic">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                        {r.workingHours ? `${r.workingHours}h` : '-'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 capitalize">
                          {r.source === 'camera' && <Camera className="w-3 h-3 text-emerald-500" />}
                          {r.source}
                          {r.distanceMeters !== undefined && ` (${r.distanceMeters}m)`}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${statusBadge}`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Corrections Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-teal-500" />
              Attendance Corrections Queue
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {user?.role === 'employee' ? 'Track your requested corrections' : 'Review employee correction requests'}
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {corrections.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-6">No correction requests recorded.</div>
          ) : (
            corrections.map((c) => (
              <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{c.employeeName || 'Employee'}</span>
                    <span className="font-mono text-slate-400">({c.date})</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Requested: In {c.requestedCheckIn.substring(11, 16)} · Out {c.requestedCheckOut ? c.requestedCheckOut.substring(11, 16) : 'N/A'}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 italic mt-0.5">Reason: "{c.reason}"</div>
                  {c.hrComment && (
                    <div className="text-teal-600 dark:text-teal-400 text-[11px] mt-0.5">
                      HR Note: {c.hrComment} (by {c.reviewedBy})
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      c.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : c.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {c.status}
                  </span>

                  {user?.role !== 'employee' && c.status === 'pending' && (
                    <button
                      onClick={() => setReviewingCorrection(c)}
                      className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: Request Correction (Employee) */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Request Attendance Correction</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Forgot to check in/out? Submit corrected hours for HR approval.
            </p>

            <form onSubmit={handleSubmitCorrection} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={correctionDate}
                  onChange={(e) => setCorrectionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Actual Check-In Time</label>
                  <input
                    type="time"
                    required
                    value={correctionCheckIn}
                    onChange={(e) => setCorrectionCheckIn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Actual Check-Out Time</label>
                  <input
                    type="time"
                    value={correctionCheckOut}
                    onChange={(e) => setCorrectionCheckOut(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Reason for Missed Stamping</label>
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. System network glitch / attended client meeting outside premises"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: HR Review Correction */}
      {reviewingCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Review Attendance Correction</h3>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-4 text-xs space-y-1">
              <div>Employee: <strong>{reviewingCorrection.employeeName}</strong></div>
              <div>Date: {reviewingCorrection.date}</div>
              <div>Reason: "{reviewingCorrection.reason}"</div>
            </div>

            <div className="mb-4 text-xs">
              <label className="block font-medium mb-1">HR Decision Comment (Optional)</label>
              <textarea
                rows={2}
                value={hrComment}
                onChange={(e) => setHrComment(e.target.value)}
                placeholder="e.g. Verified with manager, approved."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReviewingCorrection(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleReviewCorrection('rejected')}
                disabled={actionLoading}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => handleReviewCorrection('approved')}
                disabled={actionLoading}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Approve & Stamp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
