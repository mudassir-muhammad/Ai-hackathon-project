import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import {
  Users,
  CheckCircle2,
  Clock,
  CalendarDays,
  AlertCircle,
  Sparkles,
  BarChart2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

export const HRDashboard: React.FC<{ onNavigateTab: (tab: string) => void }> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string[] | null>(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSummarize = async () => {
    if (!stats) return;
    setSummarizing(true);
    try {
      const res = await api.summarizeDashboard(stats.kpis);
      setAiSummary(res.bullets);
    } catch (e) {
      console.error(e);
    } finally {
      setSummarizing(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading HR metrics...
      </div>
    );
  }

  const k = stats?.kpis;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            HR People Operations Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time daily attendance, leave approvals queue, and punctuality monitoring.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSummarize}
          disabled={summarizing}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold shadow-md flex items-center gap-2 self-start transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-teal-200" />
          {summarizing ? 'Analyzing with AI...' : 'AI Operational Summary'}
        </button>
      </div>

      {/* AI Summary Banner */}
      {aiSummary && (
        <div className="p-5 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30 border border-teal-200 dark:border-teal-800/80 rounded-2xl shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> HR Intelligence Insights
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-200/60 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200">
              AI-generated
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {aiSummary.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI Cards: Headcount, Present, On leave, Late today, Pending approvals */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Headcount</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{k?.headcount || 0}</div>
          <div className="text-[10px] text-slate-400 mt-1">Total workforce</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Present Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {k?.presentToday || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">On-time check-ins</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">On Leave</span>
            <CalendarDays className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400">
            {k?.onLeaveToday || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Approved leaves</div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Late Today</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {k?.lateToday || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Checked in &gt; 09:15</div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Approvals Queue</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {k?.pendingLeaves || 0}
          </div>
          <button
            onClick={() => onNavigateTab('leaves')}
            className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline mt-1 block"
          >
            Review inbox &rarr;
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Rate & Department Absenteeism (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Attendance Rate: {k?.attendanceRate || 0}%
              </h3>
              <span className="text-[11px] text-slate-400">Section 7 Aggregation Formula</span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden mb-6">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${k?.attendanceRate || 0}%` }}
              />
            </div>

            <h4 className="font-semibold text-xs text-slate-700 dark:text-slate-300 mb-3">
              Absenteeism by Department (Today)
            </h4>
            <div className="space-y-3">
              {stats?.absenteeismByDept.map((dept) => (
                <div key={dept.departmentId} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 w-36 truncate">{dept.name}</span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, dept.absentRatePercent)}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-12 text-right">
                    {dept.absentCount} abs
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Leave Utilization by Type */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-teal-500" />
              Yearly Leave Quota Utilization
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats?.leaveUtilization.map((lt, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                    {lt.name}
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {lt.approvedDays} <span className="text-xs font-normal text-slate-400">days</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Quota: {lt.quotaPerEmployee >= 999 ? 'Unlimited' : `${lt.quotaPerEmployee}/yr`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top 5 Late-Comers this month (Brief Requirement!) */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Top 5 Late-Comers
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
              Grace: 15m
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
            Under company rules, 3 late check-ins trigger a 0.5-day salary deduction in payroll.
          </p>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {stats?.topLateComers.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-10">
                No late check-ins recorded this month!
              </div>
            ) : (
              stats?.topLateComers.map((emp, i) => (
                <div
                  key={emp.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center text-[10px]">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                      <div className="text-[10px] text-slate-400">{emp.department}</div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {emp.lateCount} lates
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
