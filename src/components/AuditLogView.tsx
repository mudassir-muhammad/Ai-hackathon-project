import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { ShieldAlert, Search, RefreshCw, FileCode, CheckCircle2 } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filtered = logs.filter((l) => {
    const matchesSearch =
      l.actorEmail.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entity.toLowerCase().includes(search.toLowerCase());
    const matchesEntity = selectedEntity ? l.entity === selectedEntity : true;
    return matchesSearch && matchesEntity;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            Audit Trail & Compliance Log (M9)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Section 3 Rule: Immutable system log. Records actor, action, target entity, and before/after JSON diffs.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, action, or entity..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        <select
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
        >
          <option value="">All Entities</option>
          <option value="payroll">Payroll</option>
          <option value="leave">Leave</option>
          <option value="attendance">Attendance</option>
          <option value="employee">Employee</option>
          <option value="settings">Settings</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                <th className="px-6 py-3 font-semibold">Timestamp</th>
                <th className="px-6 py-3 font-semibold">Actor</th>
                <th className="px-6 py-3 font-semibold">Action</th>
                <th className="px-6 py-3 font-semibold">Entity</th>
                <th className="px-6 py-3 font-semibold text-right">State Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">{log.actorEmail}</div>
                      <span className="uppercase text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[11px]">
                      {log.entity}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {(log.beforeData || log.afterData) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <FileCode className="w-3.5 h-3.5" /> View JSON
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

      {/* JSON Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Audit Record State ({selectedLog.action} on {selectedLog.entity})
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-xs px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 font-mono text-xs">
              {selectedLog.beforeData && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-rose-500 mb-1">State Before:</div>
                  <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl overflow-x-auto text-[11px]">
                    {JSON.stringify(selectedLog.beforeData, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.afterData && (
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-500 mb-1">State After:</div>
                  <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl overflow-x-auto text-[11px]">
                    {JSON.stringify(selectedLog.afterData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
