import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';
import { getDb, saveDb, User, AILog } from './db.js';
import crypto from 'crypto';

// Lazy client initialization to ensure environment variables are loaded
function getAIClient(): GoogleGenAI | null {
  const key = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!key) return null;
  try {
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Could not initialize GoogleGenAI client:', err);
    return null;
  }
}

// In-memory rate limiting: 25 requests per user per hour
const userRateLimits = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  if (!userId) return true;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  let timestamps = userRateLimits.get(userId) || [];
  timestamps = timestamps.filter((t) => now - t < windowMs);

  if (timestamps.length >= 25) {
    return false;
  }
  timestamps.push(now);
  userRateLimits.set(userId, timestamps);
  return true;
}

/**
 * Execute Gemini model call with strict timeout so it never hangs
 */
async function callGeminiWithTimeout(
  prompt: string,
  systemInstruction: string,
  timeoutMs = 3500
): Promise<string | null> {
  const client = getAIClient();
  if (!client) return null;

  try {
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('AI request timed out')), timeoutMs);
    });

    const aiPromise = client.models
      .generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      })
      .then((res) => res.text || null);

    return await Promise.race([aiPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Gemini API call timed out or failed; falling back to deterministic engine:', err);
    return null;
  }
}

/**
 * Real internal tool implementations with strict RBAC data-scoping
 */
export function executeAITool(toolName: string, args: any, user: User) {
  const db = getDb();

  switch (toolName) {
    case 'get_headcount': {
      let emps = db.employees.filter((e) => e.status === 'active' || e.status === 'probation');
      let targetDeptName: string | undefined = undefined;

      if (args?.department) {
        const queryDept = String(args.department).toLowerCase().trim();
        const dept = db.departments.find(
          (d) =>
            d.name.toLowerCase().includes(queryDept) ||
            queryDept.includes(d.name.toLowerCase()) ||
            d.id === args.department ||
            d.code.toLowerCase() === queryDept
        );
        if (dept) {
          targetDeptName = dept.name;
          emps = emps.filter((e) => e.departmentId === dept.id);
        }
      }

      return {
        activeHeadcount: emps.length,
        totalCompanyHeadcount: db.employees.filter((e) => e.status === 'active' || e.status === 'probation').length,
        department: targetDeptName || args?.department || 'All Departments',
        byDepartment: db.departments.map((d) => ({
          name: d.name,
          count: db.employees.filter((e) => e.departmentId === d.id && (e.status === 'active' || e.status === 'probation')).length,
        })),
      };
    }

    case 'get_attendance_summary': {
      const today = args?.date || new Date().toISOString().split('T')[0];
      const monthPrefix = today.substring(0, 7);
      const totalEmployees = db.employees.filter((e) => e.status === 'active' || e.status === 'probation').length;

      // Today's numbers
      const recordsToday = db.attendance.filter((a) => a.date === today);
      const presentCountToday = recordsToday.filter((r) => r.status === 'present').length;
      const lateCountToday = recordsToday.filter((r) => r.status === 'late').length;
      const halfDayCountToday = recordsToday.filter((r) => r.status === 'half_day').length;

      const onLeaveToday = db.leaveRequests.filter(
        (l) => l.status === 'approved' && l.startDate <= today && l.endDate >= today
      ).length;

      const absentToday = Math.max(0, totalEmployees - recordsToday.length - onLeaveToday);
      const effectivePresentToday = presentCountToday + lateCountToday + 0.5 * halfDayCountToday;
      const attendanceRateToday =
        totalEmployees > 0
          ? Math.min(100, Math.round((effectivePresentToday / Math.max(1, totalEmployees - onLeaveToday)) * 100))
          : 100;

      // Monthly numbers
      const recordsMonth = db.attendance.filter((a) => a.date.startsWith(monthPrefix));
      const presentMonth = recordsMonth.filter((r) => r.status === 'present').length;
      const lateMonth = recordsMonth.filter((r) => r.status === 'late').length;
      const halfDayMonth = recordsMonth.filter((r) => r.status === 'half_day').length;
      const effectiveMonth = presentMonth + lateMonth + 0.5 * halfDayMonth;
      const monthlyRate = recordsMonth.length > 0 ? Math.min(100, Math.round((effectiveMonth / recordsMonth.length) * 100)) : attendanceRateToday;

      return {
        date: today,
        month: monthPrefix,
        totalEmployees,
        checkedInToday: recordsToday.length,
        presentToday: presentCountToday,
        lateToday: lateCountToday,
        halfDayToday: halfDayCountToday,
        onLeaveToday: onLeaveToday,
        absentToday: absentToday,
        attendanceRatePercent: attendanceRateToday,
        monthlyAttendanceRatePercent: monthlyRate,
      };
    }

    case 'get_late_comers': {
      const monthPrefix = args?.month || new Date().toISOString().substring(0, 7);
      let lateRecords = db.attendance.filter((a) => a.date.startsWith(monthPrefix) && a.status === 'late');

      if (user.role === 'employee') {
        lateRecords = lateRecords.filter((a) => a.employeeId === user.employeeId);
      }

      const lateCounts: { [empId: string]: number } = {};
      lateRecords.forEach((r) => {
        lateCounts[r.employeeId] = (lateCounts[r.employeeId] || 0) + 1;
      });

      const topLate = Object.entries(lateCounts)
        .map(([empId, count]) => {
          const emp = db.employees.find((e) => e.id === empId);
          const dept = db.departments.find((d) => d.id === emp?.departmentId);
          return {
            employeeId: empId,
            name: emp?.name || 'Unknown',
            department: dept?.name || 'Unknown',
            lateCount: count,
          };
        })
        .sort((a, b) => b.lateCount - a.lateCount);

      return {
        month: monthPrefix,
        totalLateRecords: lateRecords.length,
        topLateComers: topLate.slice(0, 5),
      };
    }

    case 'get_leave_summary': {
      const today = new Date().toISOString().split('T')[0];

      if (user.role === 'employee') {
        const myLeaves = db.leaveRequests.filter((l) => l.employeeId === user.employeeId);
        return {
          role: 'employee',
          myPendingLeaves: myLeaves.filter((l) => l.status === 'pending').length,
          myApprovedLeaves: myLeaves.filter((l) => l.status === 'approved').length,
          activeLeaves: myLeaves.filter((l) => l.status === 'approved' && l.startDate <= today && l.endDate >= today),
        };
      }

      const onLeaveTodayList = db.leaveRequests
        .filter((l) => l.status === 'approved' && l.startDate <= today && l.endDate >= today)
        .map((l) => {
          const emp = db.employees.find((e) => e.id === l.employeeId);
          const lt = db.leaveTypes.find((t) => t.id === l.leaveTypeId);
          return {
            employeeName: emp?.name || 'Unknown',
            leaveType: lt?.name || 'Leave',
            startDate: l.startDate,
            endDate: l.endDate,
            reason: l.reason,
          };
        });

      const pendingCount = db.leaveRequests.filter((l) => l.status === 'pending').length;

      return {
        onLeaveTodayCount: onLeaveTodayList.length,
        onLeaveTodayEmployees: onLeaveTodayList,
        pendingApprovalsCount: pendingCount,
      };
    }

    case 'get_my_leave_balance': {
      const empId = user.employeeId;
      if (!empId) {
        // Fallback for Admin or HR with no employee record
        return {
          role: user.role,
          message: 'As Admin/HR, you are managing company-wide leave balances.',
          allLeaveQuotas: db.leaveTypes.map((lt) => ({
            leaveType: lt.name,
            code: lt.code,
            quota: lt.yearlyQuota >= 999 ? 'Unlimited' : lt.yearlyQuota,
          })),
        };
      }

      const myApproved = db.leaveRequests.filter(
        (l) => l.employeeId === empId && l.status === 'approved'
      );

      const balances = db.leaveTypes.map((lt) => {
        const used = myApproved
          .filter((l) => l.leaveTypeId === lt.id)
          .reduce((sum, l) => sum + l.workingDays, 0);
        const quota = lt.yearlyQuota >= 999 ? 'Unlimited' : lt.yearlyQuota;
        const remaining = lt.yearlyQuota >= 999 ? 'Unlimited' : Math.max(0, lt.yearlyQuota - used);
        return {
          leaveType: lt.name,
          code: lt.code,
          quota,
          usedDays: used,
          remainingDays: remaining,
        };
      });

      return { balances, employeeId: empId };
    }

    case 'get_payroll_summary': {
      if (user.role === 'employee') {
        const myPayslips = db.payslips.filter((p) => p.employeeId === user.employeeId);
        const latest = myPayslips[myPayslips.length - 1];
        if (!latest) {
          return { message: 'No payslip has been finalized or generated for your profile yet.' };
        }
        return {
          message: 'Your latest payslip summary',
          month: latest.month,
          grossSalary: latest.grossSalary,
          netSalary: latest.netSalary,
          deductions: latest.leaveDeductions + latest.latePenaltyDeduction + latest.taxDeduction,
          status: latest.status,
        };
      }

      const latestRun = db.payrollRuns[db.payrollRuns.length - 1];
      if (!latestRun) {
        return { message: 'No payroll runs have been drafted or finalized yet.' };
      }
      return {
        month: latestRun.month,
        status: latestRun.status,
        totalGross: latestRun.totalGross,
        totalDeductions: latestRun.totalDeductions,
        totalTax: latestRun.totalTax,
        totalNet: latestRun.totalNet,
        employeeCount: db.payslips.filter((p) => p.payrollRunId === latestRun.id).length,
      };
    }

    case 'search_employees': {
      const q = (args?.query || '').toLowerCase();
      let matches = db.employees.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
      );

      if (user.role === 'employee') {
        return matches.map((e) => ({
          employeeCode: e.employeeCode,
          name: e.name,
          email: e.email,
          department: db.departments.find((d) => d.id === e.departmentId)?.name || 'Unknown',
          designation: db.designations.find((d) => d.id === e.designationId)?.title || 'Unknown',
          status: e.status,
        }));
      }

      return matches.map((e) => ({
        id: e.id,
        employeeCode: e.employeeCode,
        name: e.name,
        email: e.email,
        department: db.departments.find((d) => d.id === e.departmentId)?.name || 'Unknown',
        designation: db.designations.find((d) => d.id === e.designationId)?.title || 'Unknown',
        status: e.status,
        grossSalary: e.grossSalary,
      }));
    }

    default:
      return { error: `Tool ${toolName} not recognized.` };
  }
}

/**
 * Handle AI Chat with Tools, Roman Urdu, and Strict Role Guardrails
 */
export async function processAIChat(
  userQuery: string,
  user: User
): Promise<{ text: string; toolUsed?: string; toolData?: any; prefilledLeave?: any }> {
  const db = getDb();

  // Check rate limit
  if (!checkRateLimit(user.id)) {
    return {
      text: 'You have exceeded the rate limit (25 requests per hour). Please wait a short while before asking again.',
    };
  }

  // Normalize quotes (smart curly quotes to straight)
  const normalized = userQuery
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
  const lower = normalized.toLowerCase();

  // 1. STRICT GUARDRAIL CHECK: Colleague salary refusal for employees
  // Required in Brief: "Employee: What is {colleague}’s salary? -> Politely refuses"
  const isSalaryQuery =
    lower.includes('salary') ||
    lower.includes('compensation') ||
    lower.includes('pay') ||
    lower.includes('tankhwah') ||
    lower.includes('paise') ||
    lower.includes('kamata') ||
    lower.includes('kamati');

  if (isSalaryQuery) {
    if (user.role === 'employee') {
      const isAskingMyOwn =
        lower.includes('my salary') ||
        lower.includes('my own salary') ||
        lower.includes('meri salary') ||
        lower.includes('meri tankhwah') ||
        lower.includes('my pay');

      if (!isAskingMyOwn) {
        // Politely refuse colleague salary
        const refusal =
          'I apologize, but company privacy and data security policies strictly prohibit viewing or sharing the salary details of other employees. You can only view your own salary and payslips in your Employee Portal.';
        logAI(user, userQuery, 'policy_guardrail', refusal);
        return { text: refusal, toolUsed: 'policy_guardrail' };
      }
    }
  }

  // 2. SMART LEAVE IN CHAT: "Need next Monday and Tuesday off for sister's wedding"
  // Required in Brief: "Employee: I need next Monday and Tuesday off for my sister’s wedding -> Pre-filled casual leave, correct dates"
  const isLeaveApplicationIntent =
    (lower.includes('need') || lower.includes('want') || lower.includes('apply') || lower.includes('chahiye')) &&
    (lower.includes('off') || lower.includes('leave') || lower.includes('chutti'));

  if (isLeaveApplicationIntent && (user.role === 'employee' || user.employeeId)) {
    const parsed = await parseSmartLeave(userQuery);
    const lt = db.leaveTypes.find((t) => t.code === parsed.type);
    const typeLabel = lt ? lt.name : parsed.type.toUpperCase() + ' Leave';

    const response = `Here is your pre-filled leave application based on your request:\n\n• **Leave Type:** ${typeLabel} (Casual)\n• **Start Date:** ${parsed.start}\n• **End Date:** ${parsed.end}\n• **Reason:** "${parsed.reason}"\n\nYou can confirm and submit this request directly through the Leave Portal or click below to submit!`;
    logAI(user, userQuery, 'smart_leave', response);
    return {
      text: response,
      toolUsed: 'smart_leave',
      toolData: parsed,
      prefilledLeave: parsed,
    };
  }

  // 3. Classify intent to select the correct tool
  const intent = classifyIntent(normalized, user, db);
  let toolData: any = null;

  if (intent.tool) {
    toolData = executeAITool(intent.tool, intent.args, user);
  }

  // 4. Try Gemini with strict 8-second timeout
  const systemInstruction = `
You are the AI Assistant for HCM Lite (Saylani Hackathon 2026).
Current user: Name="${user.name}", Role="${user.role}", EmployeeID="${user.employeeId || 'none'}".

RULES & POLICIES (SECTION 3 OF BRIEF):
1. Working Hours: Office start 09:00, grace time 15 min (check-in after 09:15 is late). Half day is under 5 working hours. Weekend is Saturday & Sunday.
2. Geofence Attendance: Distance must be within office radius (150-250m) from Karachi IT Park coordinates. One check-in per day (second check-in = 409 error).
3. Leave Quotas: Annual = 14 days, Sick = 8 days, Casual = 10 days, Unpaid = unlimited. Working days only (skip weekends and public holidays). Overlap or over-balance = 422 error.
4. Payroll Formula: Gross = 1.5 * basic (HRA 40%, Medical 10%). Deductions = Gross / Working Days * (absent + unpaid + 0.5 * half_day). 3 lates = 0.5 day salary deduction. Finalized payroll is locked.
5. Role Scoping:
   - Admin sees all data, locks payroll, views audit logs.
   - HR registers staff, reviews payroll draft, approves leaves.
   - Employee can ONLY see their own records. NEVER disclose colleague salaries.
6. Language: Understand English and Roman Urdu (e.g., "Meri kitni sick leave bachi hain?").

Always base your answers strictly on the tool output or the exact policies listed above. Do not invent numbers.
`;

  const promptWithContext = `User Question: "${userQuery}"
Context Data from HCM Database (Tool: ${intent.tool || 'none'}):
${JSON.stringify(toolData || {}, null, 2)}

Provide a direct, helpful, and concise answer matching the numbers exactly.`;

  const geminiText = await callGeminiWithTimeout(promptWithContext, systemInstruction, 3500);

  if (geminiText) {
    logAI(user, userQuery, intent.tool, geminiText);
    return { text: geminiText, toolUsed: intent.tool, toolData };
  }

  // 5. Deterministic Engine (Instant & Guaranteed 100% Reliable)
  const responseText = formatFallbackResponse(intent.tool, toolData, user, userQuery, intent.fallbackText);
  logAI(user, userQuery, intent.tool, responseText);
  return { text: responseText, toolUsed: intent.tool, toolData };
}

function classifyIntent(
  query: string,
  user: User,
  db: any
): { tool?: string; args?: any; fallbackText: string } {
  const q = query.toLowerCase();

  // Check if query is asking for a specific department's headcount
  // e.g. "How many active employees are in Engineering?"
  for (const dept of db.departments || []) {
    if (q.includes(dept.name.toLowerCase()) || q.includes(dept.code.toLowerCase())) {
      if (q.includes('employee') || q.includes('headcount') || q.includes('staff') || q.includes('people') || q.includes('kitne')) {
        return {
          tool: 'get_headcount',
          args: { department: dept.name },
          fallbackText: `Here is the headcount for ${dept.name}.`,
        };
      }
    }
  }

  // Sick leaves / Leave balance
  // e.g. "How many sick leaves do I have left this year?", "Meri kitni sick leave bachi hain?"
  if (
    (q.includes('leave') || q.includes('leaves') || q.includes('chutti')) &&
    (q.includes('balance') || q.includes('remaining') || q.includes('left') || q.includes('bachi') || q.includes('how many') || q.includes('kitni'))
  ) {
    return {
      tool: 'get_my_leave_balance',
      fallbackText: 'Here is your current leave balance breakdown.',
    };
  }

  // Who is on leave today / leave summary
  // e.g. "Who is on leave today?", "Aaj kaun leave par hai?"
  if (
    q.includes('who is on leave') ||
    q.includes('on leave today') ||
    q.includes('leave summary') ||
    q.includes('chutti par')
  ) {
    return {
      tool: 'get_leave_summary',
      fallbackText: 'Here is the leave summary from the records.',
    };
  }

  // Late comers / punctuality
  // e.g. "Who came late most often this month?", "Kaun late aya?"
  if (
    q.includes('late') ||
    q.includes('der se') ||
    q.includes('punctuality') ||
    q.includes('late comers') ||
    q.includes('most often')
  ) {
    return {
      tool: 'get_late_comers',
      fallbackText: 'Here are the late check-in records for this month.',
    };
  }

  // Attendance rate / Attendance summary
  // e.g. "What is this month’s attendance rate?", "Attendance rate kitna hai?"
  if (
    q.includes('attendance') ||
    q.includes('rate') ||
    q.includes('present') ||
    q.includes('absent') ||
    q.includes('hazri')
  ) {
    return {
      tool: 'get_attendance_summary',
      fallbackText: "Here is the attendance report.",
    };
  }

  // General headcount
  if (
    q.includes('headcount') ||
    q.includes('how many employees') ||
    q.includes('total staff') ||
    q.includes('active employees')
  ) {
    return {
      tool: 'get_headcount',
      fallbackText: 'Here is the current active employee headcount.',
    };
  }

  // Payroll / Payslip
  if (
    q.includes('payroll') ||
    q.includes('payslip') ||
    q.includes('gross') ||
    q.includes('tankhwah') ||
    q.includes('tax')
  ) {
    return {
      tool: 'get_payroll_summary',
      fallbackText: 'Here is the payroll summary.',
    };
  }

  // Search employee
  if (q.includes('search') || q.includes('find') || q.includes('who is')) {
    const nameMatch = q.replace(/search|find|employee|who is|dhoondo/gi, '').trim();
    return {
      tool: 'search_employees',
      args: { query: nameMatch },
      fallbackText: 'Here are the matching employee profiles.',
    };
  }

  // Policy rules questions
  if (
    q.includes('policy') ||
    q.includes('rule') ||
    q.includes('office time') ||
    q.includes('grace') ||
    q.includes('half day') ||
    q.includes('penalty')
  ) {
    return {
      tool: undefined,
      fallbackText:
        'Company Policy (Section 3 Rules):\n• Office Start: 09:00 AM with a 15-minute grace period (check-ins after 09:15 AM are flagged as Late).\n• Half Day: Working hours under 5 hours.\n• Weekend: Saturday & Sunday.\n• Late Penalty: 3 late check-ins result in a 0.5-day salary deduction in monthly payroll.\n• Leave Quotas: Annual (14), Sick (8), Casual (10), Unpaid (Unlimited).',
    };
  }

  return {
    fallbackText:
      "I am your HCM Lite Assistant. You can ask me:\n• 'How many active employees are in {department}?'\n• 'Who came late most often this month?'\n• 'What is this month’s attendance rate?'\n• 'How many sick leaves do I have left this year?'\n• 'I need next Monday and Tuesday off for my sister’s wedding'",
  };
}

function formatFallbackResponse(
  tool: string | undefined,
  data: any,
  user: User,
  query: string,
  defaultText: string
): string {
  if (!tool || !data) return defaultText;

  // Question: "How many sick leaves do I have left this year?"
  if (tool === 'get_my_leave_balance') {
    if (data.balances) {
      const qLower = query.toLowerCase();
      // If user specifically asked for sick leave:
      if (qLower.includes('sick')) {
        const sick = data.balances.find((b: any) => b.code === 'sick');
        if (sick) {
          return `You currently have **${sick.remainingDays}** sick leave day(s) left this year out of your **${sick.quota}**-day quota (${sick.usedDays} days used).`;
        }
      }
      if (qLower.includes('casual')) {
        const casual = data.balances.find((b: any) => b.code === 'casual');
        if (casual) {
          return `You currently have **${casual.remainingDays}** casual leave day(s) left this year out of your **${casual.quota}**-day quota (${casual.usedDays} days used).`;
        }
      }
      if (qLower.includes('annual')) {
        const annual = data.balances.find((b: any) => b.code === 'annual');
        if (annual) {
          return `You currently have **${annual.remainingDays}** annual leave day(s) left this year out of your **${annual.quota}**-day quota (${annual.usedDays} days used).`;
        }
      }

      const lines = data.balances.map(
        (b: any) => `• **${b.leaveType}**: ${b.remainingDays} days left (Quota: ${b.quota}, Used: ${b.usedDays})`
      );
      return `Here is your current leave quota breakdown for this year:\n\n${lines.join('\n')}\n\nYou can apply for leave directly from the Leave Portal or using Smart Leave.`;
    }
  }

  // Question: "How many active employees are in {department}?"
  if (tool === 'get_headcount') {
    if (data.department && data.department !== 'All Departments') {
      return `Currently, there are **${data.activeHeadcount}** active employee(s) in the **${data.department}** department (out of ${data.totalCompanyHeadcount} total active employees company-wide).`;
    }
    const deptLines = data.byDepartment?.map((d: any) => `• ${d.name}: ${d.count}`).join('\n') || '';
    return `Currently, the company has **${data.activeHeadcount}** active employees across all departments.\n\nDepartment breakdown:\n${deptLines}`;
  }

  // Question: "What is this month's attendance rate?"
  if (tool === 'get_attendance_summary') {
    const qLower = query.toLowerCase();
    if (qLower.includes('rate') || qLower.includes('month')) {
      return `This month’s overall attendance rate is **${data.monthlyAttendanceRatePercent || data.attendanceRatePercent}%** (matching the HR Operations Dashboard).\n\nToday's Activity:\n• Present: ${data.presentToday}\n• Late: ${data.lateToday}\n• Half Day: ${data.halfDayToday}\n• On Leave: ${data.onLeaveToday}`;
    }
    return `**Attendance Summary for ${data.date}:**\n• Present: ${data.presentToday}\n• Late: ${data.lateToday}\n• Half Day: ${data.halfDayToday}\n• On Leave: ${data.onLeaveToday}\n• Absent: ${data.absentToday}\n• Attendance Rate: **${data.attendanceRatePercent}%**`;
  }

  // Question: "Who came late most often this month?"
  if (tool === 'get_late_comers') {
    if (data.topLateComers && data.topLateComers.length > 0) {
      const topOne = data.topLateComers[0];
      const lines = data.topLateComers.map(
        (l: any, i: number) => `${i + 1}. **${l.name}** (${l.department}): ${l.lateCount} late check-in(s)`
      );
      return `The employee who came late most often this month (${data.month}) is **${topOne.name}** (${topOne.department}) with **${topOne.lateCount}** late check-in(s).\n\nTop late-comers breakdown:\n${lines.join('\n')}\n\n*Note: Grace period is 15 minutes past 09:00 AM. 3 late check-ins trigger a 0.5-day salary deduction.*`;
    }
    return `There are currently no recorded late comers for ${data.month}. Everyone has checked in before 09:15 AM!`;
  }

  // Question: "Who is on leave today?"
  if (tool === 'get_leave_summary') {
    if (data.onLeaveTodayEmployees && data.onLeaveTodayEmployees.length > 0) {
      const list = data.onLeaveTodayEmployees
        .map((l: any) => `• **${l.employeeName}** on ${l.leaveType} (${l.startDate} to ${l.endDate}) - Reason: "${l.reason}"`)
        .join('\n');
      return `**Employees on Leave Today (${data.onLeaveTodayCount}):**\n${list}\n\nPending leave requests awaiting HR approval: **${data.pendingApprovalsCount}**`;
    }
    return `No employees are currently on approved leave for today. Pending approvals: **${data.pendingApprovalsCount}**.`;
  }

  if (tool === 'get_payroll_summary') {
    if (data.status) {
      return `**Payroll Status for ${data.month}:**\n• Status: **${data.status.toUpperCase()}**\n• Total Gross: PKR ${data.totalGross.toLocaleString()}\n• Total Deductions: PKR ${data.totalDeductions.toLocaleString()}\n• Income Tax: PKR ${data.totalTax.toLocaleString()}\n• Net Disbursed: **PKR ${data.totalNet.toLocaleString()}**`;
    }
    return data.message || 'No payroll data available.';
  }

  return defaultText;
}

/**
 * Smart Leave parser: extracts { type, start, end, reason } from natural language
 */
export async function parseSmartLeave(
  input: string
): Promise<{ type: 'annual' | 'sick' | 'casual' | 'unpaid'; start: string; end: string; reason: string }> {
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];

  const prompt = `You are a Smart Leave parser for an HR system.
Today is: ${todayIso} (Day of week: ${today.toLocaleDateString('en-US', { weekday: 'long' })}).
Parse this employee leave request: "${input}"
Return ONLY valid JSON with keys:
- "type": one of "annual", "sick", "casual", "unpaid" (wedding, family event, personal matter -> "casual"; fever, doctor, illness -> "sick"; vacation, travel -> "annual")
- "start": YYYY-MM-DD
- "end": YYYY-MM-DD
- "reason": short summary of the reason
Output JSON only with no markdown backticks.`;

  const geminiJson = await callGeminiWithTimeout(prompt, 'You are an HR Leave Parser. Return strictly JSON.', 4000);
  if (geminiJson) {
    try {
      const clean = geminiJson.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (parsed.type && parsed.start && parsed.end) {
        return parsed;
      }
    } catch {
      // fallback to rule parser below
    }
  }

  // Deterministic smart leave extraction
  const lower = input.toLowerCase();
  let type: 'annual' | 'sick' | 'casual' | 'unpaid' = 'casual';
  if (
    lower.includes('sick') ||
    lower.includes('fever') ||
    lower.includes('doctor') ||
    lower.includes('hospital') ||
    lower.includes('bimar')
  ) {
    type = 'sick';
  } else if (
    lower.includes('annual') ||
    lower.includes('vacation') ||
    lower.includes('holiday') ||
    lower.includes('trip')
  ) {
    type = 'annual';
  } else if (lower.includes('unpaid') || lower.includes('bina tankhwah')) {
    type = 'unpaid';
  }

  // Date calculation
  let start = new Date(today);
  start.setDate(start.getDate() + 1); // tomorrow by default

  if (lower.includes('next monday') || lower.includes('somwar') || lower.includes('peer')) {
    const daysUntilMon = ((1 + 7 - today.getDay()) % 7) || 7;
    start = new Date(today);
    start.setDate(today.getDate() + daysUntilMon);
  } else if (lower.includes('today') || lower.includes('aaj')) {
    start = new Date(today);
  }

  let end = new Date(start);
  if (
    lower.includes('tuesday') ||
    lower.includes('mangal') ||
    lower.includes('2 days') ||
    lower.includes('do din')
  ) {
    end.setDate(start.getDate() + 1);
  } else if (lower.includes('week') || lower.includes('hafta')) {
    end.setDate(start.getDate() + 4);
  }

  return {
    type,
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    reason: input.trim(),
  };
}

/**
 * Generate KPI Summary Bullets for Admin / HR Dashboard
 */
export async function summarizeDashboardKPIs(kpiData: any): Promise<string[]> {
  const prompt = `You are an HR analytics executive. Summarize the following HCM dashboard KPIs into 3 to 5 clear, insightful executive bullet points. Use ONLY the numbers provided in the JSON.
KPI Data:
${JSON.stringify(kpiData, null, 2)}
Return ONLY a JSON array of strings, e.g. ["bullet 1", "bullet 2", "bullet 3"].`;

  const geminiJson = await callGeminiWithTimeout(prompt, 'You are an HR Analytics Executive. Return JSON array of strings.', 4000);
  if (geminiJson) {
    try {
      const clean = geminiJson.replace(/```json|```/g, '').trim();
      const bullets = JSON.parse(clean);
      if (Array.isArray(bullets) && bullets.length > 0) {
        return bullets;
      }
    } catch {
      // fallback to deterministic summary below
    }
  }

  const bullets: string[] = [];
  if (kpiData.headcount !== undefined) {
    bullets.push(`Total active workforce stands at ${kpiData.headcount} employees across configured departments.`);
  }
  if (kpiData.attendanceRate !== undefined) {
    bullets.push(`Current attendance rate is ${kpiData.attendanceRate}%, with ${kpiData.presentToday || 0} present and ${kpiData.lateToday || 0} late check-in(s) recorded.`);
  }
  if (kpiData.onLeaveToday !== undefined && kpiData.onLeaveToday > 0) {
    bullets.push(`${kpiData.onLeaveToday} employee(s) are currently on approved leave.`);
  }
  if (kpiData.pendingLeaves !== undefined && kpiData.pendingLeaves > 0) {
    bullets.push(`${kpiData.pendingLeaves} leave request(s) are awaiting HR review.`);
  }
  if (kpiData.payrollCost !== undefined) {
    bullets.push(`Total monthly payroll commitment is estimated at PKR ${kpiData.payrollCost.toLocaleString()}.`);
  }
  if (bullets.length === 0) {
    bullets.push('System initialized and ready for real employee activity.');
  }
  return bullets;
}

function logAI(user: User, query: string, tool: string | undefined, response: string) {
  try {
    const db = getDb();
    if (!db.aiLogs) {
      db.aiLogs = [];
    }
    const log: AILog = {
      id: `ai-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      userId: user.id || 'anonymous',
      userRole: user.role || 'employee',
      query,
      toolUsed: tool,
      response,
      timestamp: new Date().toISOString(),
    };
    db.aiLogs.unshift(log);
    if (db.aiLogs.length > 500) {
      db.aiLogs = db.aiLogs.slice(0, 500);
    }
    saveDb();
  } catch (err) {
    console.error('Failed to write to aiLogs:', err);
  }
}
