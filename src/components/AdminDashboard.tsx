import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import {
  Users,
  TrendingDown,
  DollarSign,
  Briefcase,
  Sparkles,
  ShieldAlert,
  PieChart,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

export const AdminDashboard: React.FC<{ onOpenAIWithQuery: (q: string) => void }> = ({ onOpenAIWithQuery }) => {
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
    } catch (err: any) {
      console.error(err);
    } finally {
      setSummarizing(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading company dashboard...
      </div>
    );
  }

  const k = stats?.kpis;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & AI Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Company Executive Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time workforce health, payroll commitments, and governance metrics.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSummarize}
          disabled={summarizing}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md flex items-center gap-2 self-start transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          {summarizing ? 'Analyzing with AI...' : 'AI Executive Summary'}
        </button>
      </div>

      {/* AI Summary Card (if generated) */}
      {aiSummary && (
        <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Dashboard Insights
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">
              AI-generated
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {aiSummary.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Headcount</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {k?.headcount || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Confirmed active staff</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Attrition Rate YTD</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {k?.attritionRate || 0}%
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">Within optimal target</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Payroll Cost</span>
            <DollarSign className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            PKR {k?.payrollCost ? (k.payrollCost / 1000).toFixed(0) + 'k' : '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Gross salary commitment</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Gross Salary</span>
            <Briefcase className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            PKR {k?.avgSalary ? k.avgSalary.toLocaleString() : '0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Per active employee</div>
        </div>
      </div>

      {/* Grid: Department Breakdown & Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Distribution (2 cols) */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              Workforce & Payroll Allocation by Department
            </h3>
            <span className="text-[11px] text-slate-400">Database Aggregation</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Department</th>
                  <th className="pb-3 font-semibold text-center">Headcount</th>
                  <th className="pb-3 font-semibold text-right">Monthly Payroll (PKR)</th>
                  <th className="pb-3 font-semibold text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats?.headcountByDept.map((dept, i) => {
                  const share = k?.payrollCost && k.payrollCost > 0 ? ((dept.payrollCost / k.payrollCost) * 100).toFixed(0) : '0';
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-medium text-slate-900 dark:text-white">{dept.name}</td>
                      <td className="py-3 text-center text-slate-600 dark:text-slate-300 font-bold">
                        {dept.count}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        PKR {dept.payrollCost.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          {share}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Feed Preview (Admin Only) */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Live Governance Audit
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 font-bold">
              Immutable
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80 pr-1">
            {stats?.recentAuditFeed.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8">No audit entries yet</div>
            ) : (
              stats?.recentAuditFeed.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-900 dark:text-white capitalize">
                      {log.action.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Actor: <span className="text-slate-700 dark:text-slate-300 font-medium">{log.actorEmail}</span> ({log.actorRole})
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 uppercase font-bold tracking-wider">
                    Target: {log.entity}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
