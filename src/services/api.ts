import {
  User,
  Employee,
  AttendanceRecord,
  AttendanceCorrection,
  LeaveRequest,
  LeaveBalance,
  PayrollRun,
  Payslip,
  DashboardStats,
  Announcement,
  Notification,
  AuditLog,
  Department,
  Designation,
  LeaveType,
  PublicHoliday,
  CompanySettings,
} from '../types';

const TOKEN_KEY = 'hcm_lite_jwt_token';

export const api = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data as T;
  },

  // Auth & System Status
  async getStatus(): Promise<{
    isConfigured: boolean;
    companyName: string;
    adminExists: boolean;
    totalEmployees: number;
  }> {
    return this.request('/api/status');
  },

  async setupSystem(payload: any): Promise<any> {
    const res = await this.request<any>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.token) this.setToken(res.token);
    return res;
  },

  async login(email: string, password: string): Promise<any> {
    const res = await this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) this.setToken(res.token);
    return res;
  },

  async faceLogin(
    payloadOrDescriptor:
      | number[]
      | {
          faceDescriptor: number[];
          latitude?: number;
          longitude?: number;
          accuracy?: number;
          faceCount?: number;
        }
  ): Promise<any> {
    const body = Array.isArray(payloadOrDescriptor)
      ? { faceDescriptor: payloadOrDescriptor }
      : payloadOrDescriptor;

    const res = await this.request<any>('/api/auth/face-login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.token) this.setToken(res.token);
    return res;
  },

  async verifyAndRegisterFace(
    email: string,
    password: string,
    facePhotoUrl: string,
    faceDescriptor: number[]
  ): Promise<any> {
    const res = await this.request<any>('/api/auth/verify-and-register-face', {
      method: 'POST',
      body: JSON.stringify({ email, password, facePhotoUrl, faceDescriptor }),
    });
    if (res.token) this.setToken(res.token);
    return res;
  },

  async registerEmployeeFace(
    employeeId: string,
    facePhotoUrl: string,
    faceDescriptor: number[]
  ): Promise<{ message: string; employee: Employee }> {
    return this.request<{ message: string; employee: Employee }>(
      `/api/employees/${employeeId}/register-face`,
      {
        method: 'POST',
        body: JSON.stringify({ facePhotoUrl, faceDescriptor }),
      }
    );
  },

  async removeEmployeeFace(employeeId: string): Promise<{ message: string; employee: Employee }> {
    return this.request<{ message: string; employee: Employee }>(
      `/api/employees/${employeeId}/register-face`,
      {
        method: 'DELETE',
      }
    );
  },

  async changePassword(payload: { currentPassword?: string; newPassword: string }): Promise<any> {
    const res = await this.request<any>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.token) this.setToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User; employee: Employee | null; settings: CompanySettings }> {
    return this.request('/api/auth/me');
  },

  // Organization Setup
  async getSettings(): Promise<CompanySettings> {
    return this.request('/api/org/settings');
  },

  async updateSettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    return this.request('/api/org/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async getDepartments(): Promise<Department[]> {
    return this.request('/api/org/departments');
  },

  async createDepartment(name: string, code: string): Promise<Department> {
    return this.request('/api/org/departments', {
      method: 'POST',
      body: JSON.stringify({ name, code }),
    });
  },

  async getDesignations(): Promise<Designation[]> {
    return this.request('/api/org/designations');
  },

  async createDesignation(title: string, departmentId: string): Promise<Designation> {
    return this.request('/api/org/designations', {
      method: 'POST',
      body: JSON.stringify({ title, departmentId }),
    });
  },

  async getLeaveTypes(): Promise<LeaveType[]> {
    return this.request('/api/org/leave-types');
  },

  async getHolidays(): Promise<PublicHoliday[]> {
    return this.request('/api/org/holidays');
  },

  async createHoliday(name: string, date: string): Promise<PublicHoliday> {
    return this.request('/api/org/holidays', {
      method: 'POST',
      body: JSON.stringify({ name, date }),
    });
  },

  async getUsers(): Promise<User[]> {
    return this.request('/api/org/users');
  },

  async createUser(payload: { name: string; email: string; password: string; role: string }): Promise<User> {
    return this.request('/api/org/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async toggleUserActive(userId: string): Promise<any> {
    return this.request(`/api/org/users/${userId}/toggle-active`, {
      method: 'PUT',
    });
  },

  async resetUserPassword(userId: string, newPassword?: string): Promise<any> {
    return this.request(`/api/org/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  // Employees
  async getEmployees(params: { search?: string; departmentId?: string; status?: string; page?: number } = {}): Promise<{
    data: Employee[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const q = new URLSearchParams();
    if (params.search) q.append('search', params.search);
    if (params.departmentId) q.append('departmentId', params.departmentId);
    if (params.status) q.append('status', params.status);
    if (params.page) q.append('page', String(params.page));
    return this.request(`/api/employees?${q.toString()}`);
  },

  async getEmployee360(id: string): Promise<{
    employee: Employee;
    department?: Department;
    designation?: Designation;
    userAccount?: any;
    attendance: AttendanceRecord[];
    leaves: LeaveRequest[];
    payslips: Payslip[];
    attritionRisk?: any;
  }> {
    return this.request(`/api/employees/${id}`);
  },

  async registerEmployee(payload: any): Promise<any> {
    return this.request('/api/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateEmployee(id: string, payload: any): Promise<any> {
    return this.request(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async dryRunCSV(rows: any[]): Promise<any> {
    return this.request('/api/employees/csv-dry-run', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    });
  },

  async importCSV(validRows: any[]): Promise<any> {
    return this.request('/api/employees/csv-import', {
      method: 'POST',
      body: JSON.stringify({ validRows }),
    });
  },

  // Attendance
  async getAttendance(params: { date?: string; startDate?: string; endDate?: string } = {}): Promise<AttendanceRecord[]> {
    const q = new URLSearchParams();
    if (params.date) q.append('date', params.date);
    if (params.startDate) q.append('startDate', params.startDate);
    if (params.endDate) q.append('endDate', params.endDate);
    return this.request(`/api/attendance?${q.toString()}`);
  },

  async checkIn(payload: {
    source: 'web' | 'camera';
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    faceDetected?: boolean;
  }): Promise<{ message: string; record: AttendanceRecord }> {
    return this.request('/api/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async checkOut(): Promise<{ message: string; record: AttendanceRecord }> {
    return this.request('/api/attendance/check-out', {
      method: 'POST',
    });
  },

  async getAttendanceCorrections(): Promise<AttendanceCorrection[]> {
    return this.request('/api/attendance/corrections');
  },

  async requestAttendanceCorrection(payload: {
    date: string;
    requestedCheckIn: string;
    requestedCheckOut?: string;
    reason: string;
  }): Promise<any> {
    return this.request('/api/attendance/corrections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async reviewAttendanceCorrection(id: string, status: 'approved' | 'rejected', hrComment?: string): Promise<any> {
    return this.request(`/api/attendance/corrections/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, hrComment }),
    });
  },

  // Leaves
  async getLeaves(): Promise<LeaveRequest[]> {
    return this.request('/api/leaves');
  },

  async getLeaveBalances(employeeId: string): Promise<LeaveBalance[]> {
    return this.request(`/api/leaves/balance/${employeeId}`);
  },

  async applyLeave(payload: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<any> {
    return this.request('/api/leaves/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async cancelLeave(id: string): Promise<any> {
    return this.request(`/api/leaves/${id}/cancel`, {
      method: 'POST',
    });
  },

  async decideLeave(id: string, status: 'approved' | 'rejected', hrComment?: string): Promise<any> {
    return this.request(`/api/leaves/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ status, hrComment }),
    });
  },

  // Payroll
  async getPayrollRuns(): Promise<PayrollRun[]> {
    return this.request('/api/payroll/runs');
  },

  async generatePayrollDraft(month: string): Promise<{ message: string; payrollRun: PayrollRun; payslips: Payslip[] }> {
    return this.request('/api/payroll/draft', {
      method: 'POST',
      body: JSON.stringify({ month }),
    });
  },

  async finalizePayroll(id: string): Promise<any> {
    return this.request(`/api/payroll/${id}/finalize`, {
      method: 'POST',
    });
  },

  async getPayslips(params: { month?: string; employeeId?: string } = {}): Promise<Payslip[]> {
    const q = new URLSearchParams();
    if (params.month) q.append('month', params.month);
    if (params.employeeId) q.append('employeeId', params.employeeId);
    return this.request(`/api/payroll/payslips?${q.toString()}`);
  },

  // Dashboards & Analytics
  async getDashboardStats(departmentId?: string): Promise<DashboardStats> {
    const q = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
    return this.request(`/api/dashboards/stats${q}`);
  },

  // AI Assistant
  async sendAIChat(message: string): Promise<{ text: string; toolUsed?: string; toolData?: any }> {
    return this.request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  async summarizeDashboard(kpis: any): Promise<{ bullets: string[] }> {
    return this.request('/api/ai/summarize-dashboard', {
      method: 'POST',
      body: JSON.stringify({ kpis }),
    });
  },

  async parseSmartLeave(prompt: string): Promise<{
    type: 'annual' | 'sick' | 'casual' | 'unpaid';
    start: string;
    end: string;
    reason: string;
  }> {
    return this.request('/api/ai/smart-leave', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  // Comms & Audit
  async getAnnouncements(): Promise<Announcement[]> {
    return this.request('/api/comms/announcements');
  },

  async createAnnouncement(title: string, content: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<Announcement> {
    return this.request('/api/comms/announcements', {
      method: 'POST',
      body: JSON.stringify({ title, content, priority }),
    });
  },

  async getNotifications(): Promise<Notification[]> {
    return this.request('/api/comms/notifications');
  },

  async markNotificationRead(id: string): Promise<any> {
    return this.request(`/api/comms/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    return this.request('/api/audit-logs');
  },

  // Hackathon Demo Actions
  async seedHackathonDemo(): Promise<any> {
    return this.request('/api/demo/seed-hackathon', {
      method: 'POST',
    });
  },

  async resetFresh(): Promise<any> {
    return this.request('/api/demo/reset-fresh', {
      method: 'POST',
    });
  },
};
