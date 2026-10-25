import React from 'react';
import { X, CheckCircle2, Award, Sparkles, BookOpen, Clock, ShieldCheck, UserCheck, User } from 'lucide-react';

export const DemoGuideModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const demoSteps = [
    {
      minute: 'Min 0:00 - 1:00',
      title: 'First-Run Setup & HR Account',
      role: 'Admin',
      description: 'Start with fresh install or pre-configured system. Admin configures Company name, office hours (09:00), grace period (15m), and office coordinates. Then Admin creates an HR login in Org Setup.',
      credentials: 'admin@saylani.com / Admin@123',
    },
    {
      minute: 'Min 1:00 - 2:00',
      title: 'Employee Registration & First Sign-In',
      role: 'HR & Employee',
      description: 'Switch to HR to register employees (auto salary 1.5x basic). Then switch to Employee: system prompts to change temporary password on first login! Employee marks check-in via Web or Camera (Face Detection + GPS Geofence with Judge Test Scenarios for 0 faces, 2+ faces, or outside radius).',
      credentials: 'ayesha.hr@saylani.com / Hr@123 -> bilal@saylani.com',
    },
    {
      minute: 'Min 2:00 - 3:00',
      title: 'Smart Leave (AI) & HR Approval',
      role: 'Employee & HR',
      description: 'Employee uses Smart Leave by typing in plain words: "Need next Monday and Tuesday off for sister\'s wedding". AI extracts dates and casual type. Employee confirms. Switch to HR who approves with a comment.',
      credentials: 'Smart Leave auto-parses natural language',
    },
    {
      minute: 'Min 3:00 - 4:00',
      title: 'HR Dashboard Summary & Monthly Payroll Run',
      role: 'HR & Admin',
      description: 'HR opens dashboard, clicks "AI Operational Summary", then asks AI "Who is on leave today?". HR prepares monthly payroll draft (auto tax & deduction calculations). Switch to Admin who finalizes & locks the month.',
      credentials: 'Draft prepared by HR, permanently locked by Admin',
    },
    {
      minute: 'Min 4:00 - 5:00',
      title: 'Payslip PDF & Security Privacy Guardrails',
      role: 'Employee & Admin',
      description: 'Employee downloads official payslip PDF. Employee tests AI privacy by asking "What is colleague\'s salary?" -> AI politely refuses! Switch to Admin to display immutable Audit Log.',
      credentials: 'Colleague salary strictly blocked by server guardrails',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-xs">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black">5-Minute Judge Demo Script</h2>
              <p className="text-xs text-emerald-100">
                Saylani Hackathon 2026 Official Evaluation Checklist (100 pts + 10 bonus)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Scoring Matrix */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="font-bold text-slate-900 dark:text-white text-sm mb-2 flex items-center justify-between">
              <span>Judge Scoring Rubric</span>
              <span className="text-emerald-600 font-extrabold">Total: 110 Points</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg">
                <span className="font-bold text-emerald-600">Core HR Flows: 25 pts</span>
                <div className="text-[10px] text-slate-400">Login, check-in, leave, payroll</div>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg">
                <span className="font-bold text-emerald-600">Analytics: 20 pts</span>
                <div className="text-[10px] text-slate-400">Real data aggregations</div>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg">
                <span className="font-bold text-emerald-600">AI Features: 15 pts</span>
                <div className="text-[10px] text-slate-400">Tools, Smart leave, Summaries</div>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-lg">
                <span className="font-bold text-emerald-600">Security & RBAC: 10 pts</span>
                <div className="text-[10px] text-slate-400">Scope checks, audit log</div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-500" />
              Live Walkthrough Story (Step-by-Step):
            </h3>

            {demoSteps.map((step, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs flex gap-3.5"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-xs">
                  {i + 1}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {step.title}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      {step.minute}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Active Persona: <strong>{step.role}</strong>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                    {step.description}
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono pt-1">
                    Demo credentials: {step.credentials}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bonus Features Checklist */}
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-600" /> Bonus (+10 Points) Features Included in this Build:
            </span>
            <ul className="space-y-1 text-slate-700 dark:text-slate-300 text-xs">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Camera attendance with Face Detection + GPS Haversine location geofencing
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Employee Attrition Risk score algorithm
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Absence anomaly flags and Departmental absenteeism analysis
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Late penalty rule: 3 lates = 0.5 day deduction in payroll
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> AI Assistant understands Roman Urdu ("Meri kitni sick leave bachi hain?")
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Seamless Dark Mode toggle and full responsive mobile UI
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
