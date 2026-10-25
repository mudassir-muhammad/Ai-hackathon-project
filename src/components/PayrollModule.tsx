import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { PayrollRun, Payslip } from '../types';
import jsPDF from 'jspdf';
import {
  Receipt,
  Lock,
  Download,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
  RefreshCw,
  Printer,
} from 'lucide-react';

export const PayrollModule: React.FC = () => {
  const { user } = useAuth();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [activePayslip, setActivePayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rList, sList] = await Promise.all([
        api.getPayrollRuns(),
        api.getPayslips({ month: selectedMonth }),
      ]);
      setRuns(rList);
      setPayslips(sList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const handleGenerateDraft = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.generatePayrollDraft(selectedMonth);
      setMessage({
        text: `Draft generated for ${selectedMonth}: Total Gross PKR ${res.payrollRun.totalGross.toLocaleString()}, Net PKR ${res.payrollRun.totalNet.toLocaleString()}`,
        type: 'success',
      });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async (runId: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.finalizePayroll(runId);
      setMessage({ text: res.message, type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const currentRun = runs.find((r) => r.month === selectedMonth);
  const isFinalized = currentRun?.status === 'finalized';

  const downloadPayslipPDF = (slip: Payslip) => {
    const doc = new jsPDF();

    // Company Header
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 0, 210, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SAYLANI IT PARK - HCM LITE', 20, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL EMPLOYEE SALARY SLIP', 20, 25);

    // Body Info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Employee: ${slip.employeeName || 'Staff Member'}`, 20, 45);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Employee Code: ${slip.employeeCode || 'N/A'}`, 20, 52);
    doc.text(`Department: ${slip.departmentName || 'N/A'}`, 20, 59);
    doc.text(`Designation: ${slip.designationTitle || 'N/A'}`, 20, 66);
    doc.text(`Pay Month: ${slip.month}`, 140, 52);
    doc.text(`Working Days in Month: ${slip.workingDays}`, 140, 59);
    doc.text(`Status: ${slip.status.toUpperCase()}`, 140, 66);

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(20, 75, 170, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('EARNINGS & ALLOWANCES', 25, 80);
    doc.text('AMOUNT (PKR)', 150, 80);

    doc.setFont('helvetica', 'normal');
    doc.text('Basic Salary', 25, 90);
    doc.text(`PKR ${slip.basicSalary.toLocaleString()}`, 150, 90);

    doc.text('House Rent Allowance (HRA 40%)', 25, 98);
    doc.text(`PKR ${slip.hra.toLocaleString()}`, 150, 98);

    doc.text('Medical Allowance (10%)', 25, 106);
    doc.text(`PKR ${slip.medical.toLocaleString()}`, 150, 106);

    doc.setFont('helvetica', 'bold');
    doc.text('Total Gross Salary (1.5x Basic)', 25, 116);
    doc.text(`PKR ${slip.grossSalary.toLocaleString()}`, 150, 116);

    // Deductions Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(20, 126, 170, 8, 'F');
    doc.text('DEDUCTIONS & TAXATION', 25, 131);
    doc.text('AMOUNT (PKR)', 150, 131);

    doc.setFont('helvetica', 'normal');
    doc.text(`Leave & Absence Deductions (${slip.absentDays} abs, ${slip.unpaidLeaveDays} unpaid)`, 25, 141);
    doc.text(`PKR ${slip.leaveDeductions.toLocaleString()}`, 150, 141);

    doc.text(`Late Penalty Rule (${slip.lateDays} lates)`, 25, 149);
    doc.text(`PKR ${slip.latePenaltyDeduction.toLocaleString()}`, 150, 149);

    doc.text('Federal Income Tax (Annual Bracket / 12)', 25, 157);
    doc.text(`PKR ${slip.taxDeduction.toLocaleString()}`, 150, 157);

    // Net Salary Box
    doc.setFillColor(236, 253, 245);
    doc.rect(20, 170, 170, 18, 'F');
    doc.setTextColor(6, 95, 70);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('NET DISBURSED AMOUNT:', 25, 182);
    doc.text(`PKR ${slip.netSalary.toLocaleString()}`, 140, 182);

    // Footer
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('This is an authorized system-generated payslip from Saylani HCM Lite Platform.', 20, 270);
    doc.text(`Generated on ${new Date().toLocaleString()} · Security Token Verified`, 20, 275);

    doc.save(`payslip-${slip.employeeCode || 'emp'}-${slip.month}.pdf`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Payroll Lite (M6)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gross = 1.5x basic (HRA 40%, Medical 10%). Tax slab bracket calculation. Finalized payroll is locked by Admin.
          </p>
        </div>

        {/* Month Selector & Action Controls */}
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
          />

          {user?.role === 'hr' && (
            <button
              onClick={handleGenerateDraft}
              disabled={actionLoading || isFinalized}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
            >
              {actionLoading ? 'Calculating...' : isFinalized ? 'Month Locked' : 'Prepare / Update Draft'}
            </button>
          )}

          {user?.role === 'admin' && currentRun && !isFinalized && (
            <button
              onClick={() => handleFinalize(currentRun.id)}
              disabled={actionLoading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Admin only: permanently locks the month"
            >
              <Lock className="w-3.5 h-3.5" /> Finalize & Lock Month
            </button>
          )}
        </div>
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

      {/* Current Month Overview Card */}
      {currentRun && (
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                Payroll Cycle: {currentRun.month}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                  isFinalized
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {isFinalized && <Lock className="w-3 h-3" />}
                {currentRun.status}
              </span>
            </div>

            <div className="text-xs text-slate-400">
              Working Days in Month: <span className="font-bold text-slate-700 dark:text-slate-300">{currentRun.totalWorkingDays}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Gross</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                PKR {currentRun.totalGross.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Deductions & Penalties</div>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                PKR {currentRun.totalDeductions.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Tax Withheld</div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                PKR {currentRun.totalTax.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Net Disbursed</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                PKR {currentRun.totalNet.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payslips Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-500" />
            {user?.role === 'employee' ? 'My Official Payslips' : `Staff Payslips (${selectedMonth})`}
          </h2>
          <span className="text-xs text-slate-400">{payslips.length} payslips</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                <th className="px-6 py-3 font-semibold">Employee</th>
                <th className="px-6 py-3 font-semibold">Gross Salary</th>
                <th className="px-6 py-3 font-semibold">Attendance & Absences</th>
                <th className="px-6 py-3 font-semibold">Late Penalty</th>
                <th className="px-6 py-3 font-semibold">Income Tax</th>
                <th className="px-6 py-3 font-semibold font-bold">Net Pay</th>
                <th className="px-6 py-3 font-semibold text-right">Payslip PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payslips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No payslips found for {selectedMonth}. HR must click 'Prepare / Update Draft' to calculate.
                  </td>
                </tr>
              ) : (
                payslips.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">{s.employeeName}</div>
                      <div className="text-[10px] text-slate-400">{s.employeeCode} · {s.departmentName}</div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                      PKR {s.grossSalary.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">
                      {s.presentDays} pres · {s.absentDays} abs ({s.leaveDeductions > 0 ? `-PKR ${s.leaveDeductions.toLocaleString()}` : '0'})
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400">
                      {s.lateDays} lates ({s.latePenaltyDeduction > 0 ? `-PKR ${s.latePenaltyDeduction.toLocaleString()}` : 'None'})
                    </td>
                    <td className="px-6 py-3.5 font-mono text-amber-600 dark:text-amber-400">
                      PKR {s.taxDeduction.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      PKR {s.netSalary.toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => downloadPayslipPDF(s)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                        title="Download official PDF salary slip"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
