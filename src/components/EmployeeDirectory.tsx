import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Employee, Department, Designation } from '../types';
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  X,
  FileSpreadsheet,
  TrendingDown,
  ShieldAlert,
} from 'lucide-react';

export const EmployeeDirectory: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Registration Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    departmentId: '',
    designationId: '',
    joinDate: new Date().toISOString().split('T')[0],
    gender: 'male',
    basicSalary: 80000,
    temporaryPassword: 'Welcome@123',
  });

  // Employee 360 Drawer
  const [active360, setActive360] = useState<any | null>(null);

  // CSV Dry-Run Modal
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [dryRunReport, setDryRunReport] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, depts, desigs] = await Promise.all([
        api.getEmployees({ search, departmentId, status, page }),
        api.getDepartments(),
        api.getDesignations(),
      ]);
      setEmployees(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setDepartments(depts);
      setDesignations(desigs);

      if (depts.length > 0 && !regForm.departmentId) {
        setRegForm((prev) => ({ ...prev, departmentId: depts[0].id }));
      }
      if (desigs.length > 0 && !regForm.designationId) {
        setRegForm((prev) => ({ ...prev, designationId: desigs[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, departmentId, status, page]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.registerEmployee(regForm);
      setShowRegisterModal(false);
      setMessage({
        text: `Employee ${res.employee.name} (${res.employee.employeeCode}) registered! Temporary password: ${res.credentials.temporaryPassword}`,
        type: 'success',
      });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpen360 = async (id: string) => {
    try {
      const data = await api.getEmployee360(id);
      setActive360(data);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  const handleCSVParse = () => {
    // Parse CSV lines
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      setMessage({ text: 'CSV must contain at least a header row and one data row.', type: 'error' });
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      if (parts.length === 0 || !parts[0]) continue;
      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = parts[idx] || '';
      });
      rows.push(rowObj);
    }

    handleDryRun(rows);
  };

  const handleDryRun = async (rows: any[]) => {
    setActionLoading(true);
    try {
      const report = await api.dryRunCSV(rows);
      setDryRunReport(report);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCommitCSV = async () => {
    if (!dryRunReport || !dryRunReport.validRows) return;
    setActionLoading(true);
    try {
      const res = await api.importCSV(dryRunReport.validRows);
      setShowCSVModal(false);
      setDryRunReport(null);
      setCsvText('');
      setMessage({ text: res.message, type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.location.href = '/api/employees/export-csv';
  };

  const sampleCSV = `name,email,department,joinDate,basicSalary,phone
Ali Raza,ali.raza@saylani.com,Engineering,2026-02-01,90000,+92 300 1112233
Sara Ahmed,sara.ahmed@saylani.com,Product & Design,2026-03-01,110000,+92 301 2223344`;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Employee Directory & 360 (M3)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Workforce catalog with salary structuring, CSV dry-run validation, and full profile drawer.
          </p>
        </div>

        {user?.role !== 'employee' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCsvText(sampleCSV);
                setShowCSVModal(true);
              }}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> CSV Import
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> CSV Export
            </button>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Register Employee
            </button>
          </div>
        )}
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

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, or email..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="probation">Probation</option>
          <option value="resigned">Resigned</option>
        </select>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                <th className="px-6 py-3 font-semibold">Employee</th>
                <th className="px-6 py-3 font-semibold">Department</th>
                <th className="px-6 py-3 font-semibold">Join Date</th>
                {user?.role !== 'employee' && <th className="px-6 py-3 font-semibold">Basic / Gross Salary</th>}
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">360 View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No employees found matching criteria.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const dept = departments.find((d) => d.id === emp.departmentId);
                  const isMe = user?.employeeId === emp.id;
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {emp.name}
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{emp.employeeCode} · {emp.email}</div>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                        {dept?.name || 'Department'}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-600 dark:text-slate-400">
                        {emp.joinDate}
                      </td>
                      {user?.role !== 'employee' && (
                        <td className="px-6 py-3.5">
                          <div className="font-bold font-mono text-slate-900 dark:text-white">
                            PKR {emp.grossSalary.toLocaleString()} (Gross)
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Basic: PKR {emp.basicSalary.toLocaleString()} · HRA: {emp.allowanceHra.toLocaleString()}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {(user?.role !== 'employee' || isMe) && (
                          <button
                            onClick={() => handleOpen360(emp.id)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Open Employee 360 profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register Employee */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">Register New Employee (HR M3)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Registers job details, computes salary formula (1.5x basic), and auto-generates employee login.
            </p>

            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regForm.name}
                    onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    placeholder="e.g. Tariq Mehmood"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    placeholder="tariq@saylani.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Department</label>
                  <select
                    value={regForm.departmentId}
                    onChange={(e) => setRegForm({ ...regForm, departmentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Designation</label>
                  <select
                    value={regForm.designationId}
                    onChange={(e) => setRegForm({ ...regForm, designationId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Basic Salary (PKR)</label>
                  <input
                    type="number"
                    required
                    value={regForm.basicSalary}
                    onChange={(e) => setRegForm({ ...regForm, basicSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Join Date</label>
                  <input
                    type="date"
                    required
                    value={regForm.joinDate}
                    onChange={(e) => setRegForm({ ...regForm, joinDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                <div className="font-bold text-slate-900 dark:text-white">Auto-Calculated Salary Breakdown:</div>
                <div>• HRA (40%): PKR {(regForm.basicSalary * 0.4).toLocaleString()}</div>
                <div>• Medical (10%): PKR {(regForm.basicSalary * 0.1).toLocaleString()}</div>
                <div>• Total Gross (1.5x Basic): <strong>PKR {(regForm.basicSalary * 1.5).toLocaleString()}</strong></div>
              </div>

              <div>
                <label className="block font-medium mb-1">Temporary Sign-In Password</label>
                <input
                  type="text"
                  required
                  value={regForm.temporaryPassword}
                  onChange={(e) => setRegForm({ ...regForm, temporaryPassword: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <span className="text-[10px] text-slate-400">Employee must change this password on first login.</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md disabled:opacity-50"
                >
                  {actionLoading ? 'Registering...' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: CSV Import & Dry-Run Report */}
      {showCSVModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              CSV Bulk Import with Dry-Run Validation (Brief M3)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Dry run checks: required fields, unique email/code, known department, valid date, and positive salary.
            </p>

            {!dryRunReport ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium mb-1">Paste CSV Data (comma separated)</label>
                  <textarea
                    rows={8}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCSVModal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCSVParse}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md disabled:opacity-50"
                  >
                    {actionLoading ? 'Validating dry run...' : 'Run CSV Dry-Run Validation'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-white text-sm mb-2">
                    Dry Run Report Summary:
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Total Rows</span>
                      <div className="text-lg font-black text-slate-900 dark:text-white">{dryRunReport.totalRows}</div>
                    </div>
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg">
                      <span className="text-[10px] text-emerald-700 uppercase font-bold">Valid Rows</span>
                      <div className="text-lg font-black text-emerald-600">{dryRunReport.validCount}</div>
                    </div>
                    <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-lg">
                      <span className="text-[10px] text-rose-700 uppercase font-bold">Errors</span>
                      <div className="text-lg font-black text-rose-600">{dryRunReport.errorCount}</div>
                    </div>
                  </div>
                </div>

                {dryRunReport.errors.length > 0 && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 max-h-40 overflow-y-auto">
                    <div className="font-bold text-rose-700 dark:text-rose-400 mb-1">
                      Validation Errors Detected (Row + Field + Reason):
                    </div>
                    {dryRunReport.errors.map((err: any, i: number) => (
                      <div key={i} className="text-rose-600 dark:text-rose-300 text-[11px]">
                        • Row {err.row} [{err.field}]: {err.reason}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDryRunReport(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                  >
                    &larr; Back to Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitCSV}
                    disabled={dryRunReport.validCount === 0 || actionLoading}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md disabled:opacity-50"
                  >
                    {actionLoading ? 'Importing...' : `Commit Import (${dryRunReport.validCount} Employees)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawer: Employee 360 Profile */}
      {active360 && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl p-6 overflow-y-auto border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="font-black text-lg text-slate-900 dark:text-white">
                  Employee 360 Profile
                </h3>
                <button
                  onClick={() => setActive360(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Bio & Job */}
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                  <div className="text-base font-black text-slate-900 dark:text-white">
                    {active360.employee.name}
                  </div>
                  <div className="text-slate-500 font-mono mt-0.5">
                    {active360.employee.employeeCode} · {active360.designation?.title}
                  </div>
                  <div className="text-emerald-600 font-semibold mt-1">
                    {active360.department?.name}
                  </div>
                  <div className="mt-2 text-slate-600 dark:text-slate-400">
                    Email: {active360.employee.email}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    Phone: {active360.employee.phone || 'Not provided'}
                  </div>
                </div>

                {/* Salary Info (Only HR / Admin or Own) */}
                {active360.employee.grossSalary && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-1">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-[10px]">
                      Compensation Structure
                    </span>
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      PKR {active360.employee.grossSalary.toLocaleString()} (Gross)
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      Basic: PKR {active360.employee.basicSalary.toLocaleString()} · HRA: {active360.employee.allowanceHra.toLocaleString()} · Medical: {active360.employee.allowanceMedical.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Attrition Risk (Bonus) */}
                {active360.attritionRisk && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">Attrition Risk Score</span>
                      <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {active360.attritionRisk.level} ({active360.attritionRisk.score}/100)
                      </span>
                    </div>
                    {active360.attritionRisk.factors.length > 0 && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        Factors: {active360.attritionRisk.factors.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setActive360(null)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 font-bold rounded-xl text-xs"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
