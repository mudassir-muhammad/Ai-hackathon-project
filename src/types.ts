export interface CompanySettings {
  companyName: string;
  officeStart: string;
  graceMinutes: number;
  halfDayHours: number;
  weekendDays: number[];
  officeLat: number;
  officeLng: number;
  officeRadiusMeters: number;
  latePenaltyEnabled: boolean;
  isConfigured: boolean;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'hr' | 'employee';
  name: string;
  employeeId?: string;
  mustChangePassword?: boolean;
  isActive: boolean;
  createdAt?: string;
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
  yearlyQuota: number;
}

export interface PublicHoliday {
  id: string;
  name: string;
  date: string;
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
  joinDate: string;
  exitDate?: string;
  status: 'active' | 'probation' | 'resigned' | 'terminated';
  gender: 'male' | 'female' | 'other';
  basicSalary: number;
  allowanceHra: number;
  allowanceMedical: number;
  grossSalary: number;
  userId?: string;
  facePhotoUrl?: string; // Base64 data URL or photo asset
  faceDescriptor?: number[]; // Normalized facial feature vector
  faceRegisteredAt?: string;
  faceRegisteredByName?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
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
  employeeName?: string;
  employeeCode?: string;
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
  employeeName?: string;
  employeeCode?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  hrComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface LeaveBalance {
  leaveTypeId: string;
  name: string;
  code: string;
  quota: number;
  usedDays: number;
  remainingDays: number;
}

export interface PayrollRun {
  id: string;
  month: string;
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
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  designationTitle?: string;
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
  action: string;
  entity: string;
  entityId?: string;
  beforeData?: any;
  afterData?: any;
  timestamp: string;
}

export interface DashboardStats {
  kpis: {
    headcount: number;
    attritionRate: number;
    attendanceRate: number;
    presentToday: number;
    lateToday: number;
    halfDayToday: number;
    onLeaveToday: number;
    pendingLeaves: number;
    payrollCost: number;
    avgSalary: number;
  };
  headcountByDept: Array<{ name: string; count: number; payrollCost: number }>;
  absenteeismByDept: Array<{
    departmentId: string;
    name: string;
    totalEmployees: number;
    absentCount: number;
    absentRatePercent: number;
  }>;
  leaveUtilization: Array<{
    name: string;
    code: string;
    approvedDays: number;
    quotaPerEmployee: number;
    utilizationRatePercent: number;
  }>;
  topLateComers: Array<{
    id: string;
    name: string;
    department: string;
    lateCount: number;
  }>;
  recentAuditFeed: AuditLog[];
  employeeDashboard?: {
    todayCheckIn: string | null;
    todayCheckOut: string | null;
    todayStatus: string;
    hoursThisWeek: number;
    targetHours: number;
    lateCountMonth: number;
    leaveBalances: Array<{ name: string; code: string; quota: any; remaining: any }>;
    lastPayslip: Payslip | null;
  } | null;
}
