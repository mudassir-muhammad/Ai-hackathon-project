import fs from 'fs';
import path from 'path';

export interface CompanySettings {
  companyName: string;
  officeStart: string; // "09:00"
  graceMinutes: number; // 15
  halfDayHours: number; // 5
  weekendDays: number[]; // [0, 6] (Sun=0, Sat=6)
  officeLat: number; // e.g. 24.8607
  officeLng: number; // e.g. 67.0011 (Karachi coordinates for Saylani Hackathon)
  officeRadiusMeters: number; // e.g. 150
  latePenaltyEnabled: boolean; // 3 lates = 0.5 day deduction
  isConfigured: boolean;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'hr' | 'employee';
  name: string;
  employeeId?: string;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Designation {
  id: string;
  title: string;
  departmentId: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code: 'annual' | 'sick' | 'casual' | 'unpaid';
  yearlyQuota: number; // annual: 14, sick: 8, casual: 10, unpaid: 9999
}

export interface PublicHoliday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  departmentId: string;
  designationId: string;
  joinDate: string; // YYYY-MM-DD
  exitDate?: string;
  status: 'active' | 'probation' | 'resigned' | 'terminated';
  gender: 'male' | 'female' | 'other';
  basicSalary: number; // Basic
  allowanceHra: number; // 40% of basic
  allowanceMedical: number; // 10% of basic
  grossSalary: number; // 1.5 * basic
  userId?: string;
  facePhotoUrl?: string; // Base64 data URL or photo asset
  faceDescriptor?: number[]; // Normalized facial feature vector
  faceRegisteredAt?: string;
  faceRegisteredByName?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO string
  checkOutTime?: string; // ISO string
  source: 'web' | 'camera' | 'face_recognition';
  status: 'present' | 'late' | 'half_day' | 'missing_checkout';
  workingHours?: number;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  faceDetected?: boolean;
  faceSimilarity?: number;
}

export interface AttendanceCorrection {
  id: string;
  employeeId: string;
  date: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  hrComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  workingDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  hrComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface PayrollRun {
  id: string;
  month: string; // YYYY-MM
  status: 'draft' | 'finalized';
  totalWorkingDays: number;
  totalGross: number;
  totalDeductions: number;
  totalTax: number;
  totalNet: number;
  finalizedBy?: string;
  finalizedAt?: string;
  createdAt: string;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  month: string;
  basicSalary: number;
  hra: number;
  medical: number;
  grossSalary: number;
  workingDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  lateDays: number;
  latePenaltyDeduction: number;
  leaveDeductions: number;
  taxDeduction: number;
  netSalary: number;
  isProrated: boolean;
  status: 'draft' | 'finalized';
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high';
  postedBy: string;
  postedByName: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'leave' | 'attendance' | 'payroll' | 'announcement';
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string; // 'create' | 'update' | 'approve' | 'finalize' | 'login'
  entity: string; // 'employee' | 'payroll' | 'leave' | 'attendance' | 'settings'
  entityId?: string;
  beforeData?: any;
  afterData?: any;
  timestamp: string;
}

export interface AILog {
  id: string;
  userId: string;
  userRole: string;
  query: string;
  toolUsed?: string;
  response: string;
  timestamp: string;
}

export interface DatabaseSchema {
  settings: CompanySettings;
  users: User[];
  departments: Department[];
  designations: Designation[];
  leaveTypes: LeaveType[];
  holidays: PublicHoliday[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  attendanceCorrections: AttendanceCorrection[];
  leaveRequests: LeaveRequest[];
  payrollRuns: PayrollRun[];
  payslips: Payslip[];
  announcements: Announcement[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  aiLogs: AILog[];
}

const DB_FILE = path.resolve(process.cwd(), 'data', 'database.json');

const defaultSettings: CompanySettings = {
  companyName: 'Saylani Tech HCM',
  officeStart: '09:00',
  graceMinutes: 15,
  halfDayHours: 5,
  weekendDays: [0, 6], // Saturday & Sunday
  officeLat: 24.8607, // Karachi Zaitoon Ashraf IT Park
  officeLng: 67.0011,
  officeRadiusMeters: 200,
  latePenaltyEnabled: true,
  isConfigured: false,
};

let dbCache: DatabaseSchema | null = null;

export function getDb(): DatabaseSchema {
  if (dbCache) return dbCache;

  const dataDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(data);
      return dbCache!;
    } catch (err) {
      console.error('Failed to parse database file, reinitializing', err);
    }
  }

  // Initialize fresh empty schema
  dbCache = {
    settings: { ...defaultSettings },
    users: [],
    departments: [
      { id: 'dept-1', name: 'Engineering', code: 'ENG' },
      { id: 'dept-2', name: 'Human Resources', code: 'HR' },
      { id: 'dept-3', name: 'Product & Design', code: 'PRD' },
      { id: 'dept-4', name: 'Sales & Marketing', code: 'MKT' },
    ],
    designations: [
      { id: 'desig-1', title: 'Senior Software Engineer', departmentId: 'dept-1' },
      { id: 'desig-2', title: 'Full Stack Developer', departmentId: 'dept-1' },
      { id: 'desig-3', title: 'HR Operations Manager', departmentId: 'dept-2' },
      { id: 'desig-4', title: 'HR Generalist', departmentId: 'dept-2' },
      { id: 'desig-5', title: 'UI/UX Designer', departmentId: 'dept-3' },
    ],
    leaveTypes: [
      { id: 'lt-annual', name: 'Annual Leave', code: 'annual', yearlyQuota: 14 },
      { id: 'lt-sick', name: 'Sick Leave', code: 'sick', yearlyQuota: 8 },
      { id: 'lt-casual', name: 'Casual Leave', code: 'casual', yearlyQuota: 10 },
      { id: 'lt-unpaid', name: 'Unpaid Leave', code: 'unpaid', yearlyQuota: 9999 },
    ],
    holidays: [
      { id: 'hol-1', name: 'Pakistan Day', date: '2026-03-23' },
      { id: 'hol-2', name: 'Labor Day', date: '2026-05-01' },
      { id: 'hol-3', name: 'Independence Day', date: '2026-08-14' },
      { id: 'hol-4', name: 'Iqbal Day', date: '2026-11-09' },
      { id: 'hol-5', name: 'Quaid-e-Azam Day', date: '2026-12-25' },
    ],
    employees: [],
    attendance: [],
    attendanceCorrections: [],
    leaveRequests: [],
    payrollRuns: [],
    payslips: [],
    announcements: [
      {
        id: 'ann-1',
        title: 'Welcome to HCM Lite',
        content: 'Saylani Hackathon HCM Lite platform is live! Log your daily check-in, check leave balance, and explore AI tools.',
        priority: 'normal',
        postedBy: 'system',
        postedByName: 'Admin',
        createdAt: new Date().toISOString(),
      },
    ],
    notifications: [],
    auditLogs: [],
    aiLogs: [],
  };

  saveDb();
  return dbCache;
}

export function saveDb(): void {
  if (!dbCache) return;
  const dataDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
}

export function resetDatabase(isFresh = true): DatabaseSchema {
  const dataDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  dbCache = {
    settings: { ...defaultSettings, isConfigured: !isFresh },
    users: [],
    departments: [
      { id: 'dept-1', name: 'Engineering', code: 'ENG' },
      { id: 'dept-2', name: 'Human Resources', code: 'HR' },
      { id: 'dept-3', name: 'Product & Design', code: 'PRD' },
      { id: 'dept-4', name: 'Sales & Marketing', code: 'MKT' },
    ],
    designations: [
      { id: 'desig-1', title: 'Senior Software Engineer', departmentId: 'dept-1' },
      { id: 'desig-2', title: 'Full Stack Developer', departmentId: 'dept-1' },
      { id: 'desig-3', title: 'HR Operations Manager', departmentId: 'dept-2' },
      { id: 'desig-4', title: 'HR Generalist', departmentId: 'dept-2' },
      { id: 'desig-5', title: 'UI/UX Designer', departmentId: 'dept-3' },
    ],
    leaveTypes: [
      { id: 'lt-annual', name: 'Annual Leave', code: 'annual', yearlyQuota: 14 },
      { id: 'lt-sick', name: 'Sick Leave', code: 'sick', yearlyQuota: 8 },
      { id: 'lt-casual', name: 'Casual Leave', code: 'casual', yearlyQuota: 10 },
      { id: 'lt-unpaid', name: 'Unpaid Leave', code: 'unpaid', yearlyQuota: 9999 },
    ],
    holidays: [
      { id: 'hol-1', name: 'Pakistan Day', date: '2026-03-23' },
      { id: 'hol-2', name: 'Labor Day', date: '2026-05-01' },
      { id: 'hol-3', name: 'Independence Day', date: '2026-08-14' },
      { id: 'hol-4', name: 'Iqbal Day', date: '2026-11-09' },
      { id: 'hol-5', name: 'Quaid-e-Azam Day', date: '2026-12-25' },
    ],
    employees: [],
    attendance: [],
    attendanceCorrections: [],
    leaveRequests: [],
    payrollRuns: [],
    payslips: [],
    announcements: [
      {
        id: 'ann-1',
        title: 'Welcome to HCM Lite',
        content: 'Saylani Hackathon HCM Lite platform is ready for judging and employee operations.',
        priority: 'normal',
        postedBy: 'system',
        postedByName: 'Admin',
        createdAt: new Date().toISOString(),
      },
    ],
    notifications: [],
    auditLogs: [],
    aiLogs: [],
  };

  saveDb();
  return dbCache;
}
