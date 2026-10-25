import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  getDb,
  saveDb,
  resetDatabase,
  User,
  Employee,
  AttendanceRecord,
  LeaveRequest,
  PayrollRun,
  Payslip,
  AuditLog,
  Announcement,
} from './server/db.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  authenticateToken,
  requireRole,
  audit,
  AuthenticatedRequest,
} from './server/auth.js';
import {
  calculateHaversineDistance,
  countWorkingDays,
  getWorkingDaysInMonth,
  evaluateCheckInStatus,
  evaluateWorkingHours,
  computeEmployeeMonthlyPayroll,
  calculateAttritionRisk,
} from './server/rules.js';
import {
  processAIChat,
  parseSmartLeave,
  summarizeDashboardKPIs,
} from './server/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure database is initialized
const db = getDb();

// ----------------------------------------------------
// M1: AUTHENTICATION & SETUP ROUTES
// ----------------------------------------------------

/**
 * System status: returns whether the system is freshly installed or configured
 */
app.get('/api/status', (req: Request, res: Response) => {
  const currentDb = getDb();
  const hasAdmin = currentDb.users.some((u) => u.role === 'admin' && u.isActive);
  res.json({
    isConfigured: currentDb.settings.isConfigured && hasAdmin,
    companyName: currentDb.settings.companyName,
    adminExists: hasAdmin,
    totalEmployees: currentDb.employees.length,
  });
});

/**
 * First-run setup: asks for company name and Admin account
 */
app.post('/api/auth/setup', (req: Request, res: Response) => {
  const currentDb = getDb();
  const { companyName, adminName, adminEmail, adminPassword, officeStart, officeRadiusMeters } = req.body;

  if (!adminEmail || !adminPassword || !adminName) {
    res.status(400).json({ error: 'Company Name, Admin Name, Email, and Password are required.' });
    return;
  }

  // Update settings
  currentDb.settings.companyName = companyName || 'Saylani HCM Lite';
  currentDb.settings.isConfigured = true;
  if (officeStart) currentDb.settings.officeStart = officeStart;
  if (officeRadiusMeters) currentDb.settings.officeRadiusMeters = Number(officeRadiusMeters);

  // Check if admin already exists
  let admin = currentDb.users.find((u) => u.email.toLowerCase() === adminEmail.toLowerCase());
  if (admin) {
    admin.name = adminName;
    admin.passwordHash = hashPassword(adminPassword);
    admin.role = 'admin';
    admin.isActive = true;
    admin.mustChangePassword = false;
  } else {
    admin = {
      id: `usr-admin-${Date.now()}`,
      name: adminName,
      email: adminEmail.toLowerCase(),
      passwordHash: hashPassword(adminPassword),
      role: 'admin',
      mustChangePassword: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    currentDb.users.push(admin);
  }

  saveDb();
  audit(admin, 'setup', 'system', undefined, null, { companyName: currentDb.settings.companyName });

  const token = generateToken(admin);
  res.json({
    message: 'System successfully initialized!',
    token,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      mustChangePassword: admin.mustChangePassword,
    },
    settings: currentDb.settings,
  });
});

/**
 * Login endpoint
 */
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const currentDb = getDb();
  const user = currentDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const valid = comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = generateToken(user);
  audit(user, 'login', 'auth', user.id);

  // Find linked employee record if any
  let employee = null;
  if (user.employeeId) {
    employee = currentDb.employees.find((e) => e.id === user.employeeId);
  }

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      mustChangePassword: user.mustChangePassword,
    },
    employee,
  });
});

/**
 * Change password (used when temporary password must be changed on first login)
 */
app.post('/api/auth/change-password', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  const user = req.user!;
  if (!user.mustChangePassword) {
    if (!currentPassword || !comparePassword(currentPassword, user.passwordHash)) {
      res.status(400).json({ error: 'Current password does not match.' });
      return;
    }
  }

  user.passwordHash = hashPassword(newPassword);
  user.mustChangePassword = false;
  saveDb();
  audit(user, 'change_password', 'user', user.id);

  const token = generateToken(user);
  res.json({ message: 'Password updated successfully!', token });
});

/**
 * Current user info
 */
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const employee = user.employeeId ? currentDb.employees.find((e) => e.id === user.employeeId) : null;
  res.json({ user, employee, settings: currentDb.settings });
});

/**
 * Cosine similarity helper for comparing 128-d face descriptors
 */
function compareFaceEmbeddings(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, (similarity + 1) / 2));
}

/**
 * Face Login & Attendance Verification Endpoint
 * - Compares candidate face descriptor against all enrolled employees.
 * - If match found (similarity >= 0.76):
 *   1. Issues JWT auth token for linked user account.
 *   2. Automatically records today's check-in with source: 'face_recognition'.
 *   3. Returns matched employee & user info.
 * - If no match found:
 *   Returns 401 with matched: false and canRegister: true.
 */
app.post('/api/auth/face-login', (req: Request, res: Response) => {
  const { faceDescriptor, latitude, longitude, accuracy, faceCount } = req.body;
  if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
    res.status(400).json({ error: 'Valid facial feature descriptor is required for face recognition.' });
    return;
  }

  // Section 5 Rule: exactly one face in the frame
  if (faceCount !== undefined) {
    const fCount = Number(faceCount);
    if (fCount === 0) {
      res.status(422).json({
        matched: false,
        error: 'Face verification failed: No face detected in frame. Exactly one face must be in frame.',
        code: 'FACE_NOT_FOUND',
      });
      return;
    }
    if (fCount > 1) {
      res.status(422).json({
        matched: false,
        error: `Face verification failed: Multiple faces detected (${fCount} faces). Exactly one face is accepted per check-in.`,
        code: 'MULTIPLE_FACES',
      });
      return;
    }
  }

  const currentDb = getDb();

  // Section 5 Rule: GPS location geofencing check
  let distanceMeters: number | undefined;
  if (latitude !== undefined && longitude !== undefined) {
    if (accuracy !== undefined && Number(accuracy) > 100) {
      res.status(422).json({
        matched: false,
        error: `GPS verification failed: Signal accuracy is too weak (±${accuracy}m). Accuracy must be 100m or better.`,
        code: 'GPS_WEAK_ACCURACY',
      });
      return;
    }

    distanceMeters = calculateHaversineDistance(
      Number(latitude),
      Number(longitude),
      currentDb.settings.officeLat,
      currentDb.settings.officeLng
    );

    if (distanceMeters > currentDb.settings.officeRadiusMeters) {
      res.status(422).json({
        matched: false,
        error: `Geofence check failed: You are ${distanceMeters}m away from the office location. Maximum allowed radius is ${currentDb.settings.officeRadiusMeters}m.`,
        distanceMeters,
        code: 'OUTSIDE_GEOFENCE',
      });
      return;
    }
  }

  const enrolledEmployees = currentDb.employees.filter(
    (e) => e.faceDescriptor && Array.isArray(e.faceDescriptor) && e.faceDescriptor.length > 0 && e.status === 'active'
  );

  if (enrolledEmployees.length === 0) {
    res.status(401).json({
      matched: false,
      error: 'Your face does not match any registered employee in the system (no face profiles registered yet).',
      canRegister: true,
      bestMatchScore: 0,
    });
    return;
  }

  let bestMatch: Employee | null = null;
  let highestScore = 0;

  for (const emp of enrolledEmployees) {
    const score = compareFaceEmbeddings(faceDescriptor, emp.faceDescriptor!);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = emp;
    }
  }

  const MATCH_THRESHOLD = 0.76;

  if (!bestMatch || highestScore < MATCH_THRESHOLD) {
    res.status(401).json({
      matched: false,
      error: 'Your face does not match any registered employee. Please register your face or verify your credentials.',
      canRegister: true,
      bestMatchScore: Math.round(highestScore * 100) / 100,
    });
    return;
  }

  // Found matching employee!
  const user = currentDb.users.find((u) => u.employeeId === bestMatch!.id);
  if (!user || !user.isActive) {
    res.status(401).json({
      matched: false,
      error: `Face matched ${bestMatch.name}, but user login account is inactive or not found.`,
      canRegister: false,
    });
    return;
  }

  const token = generateToken(user);
  audit(user, 'face_login', 'auth', user.id, null, {
    employeeName: bestMatch.name,
    similarity: highestScore,
    distanceMeters,
  });

  // Mark attendance for today if not already marked
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const existingAtt = currentDb.attendance.find((a) => a.employeeId === bestMatch!.id && a.date === today);
  let attendanceMarked = false;

  if (!existingAtt) {
    const status = evaluateCheckInStatus(now, currentDb.settings.officeStart, currentDb.settings.graceMinutes);
    const newAtt: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: bestMatch.id,
      date: today,
      checkInTime: now.toISOString(),
      source: 'face_recognition',
      status,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      distanceMeters,
      faceDetected: true,
      faceSimilarity: Math.round(highestScore * 100) / 100,
    };
    currentDb.attendance.push(newAtt);
    saveDb();
    attendanceMarked = true;
  }

  res.json({
    matched: true,
    message: `Face recognized! Welcome back, ${bestMatch.name}.`,
    similarity: Math.round(highestScore * 100) / 100,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      mustChangePassword: user.mustChangePassword,
    },
    employee: bestMatch,
    attendanceMarked,
    alreadyCheckedInToday: !!existingAtt,
    distanceMeters,
  });
});

/**
 * Verify Login Credentials & Register Face in one step
 * (Used when a face does not match and user enters login details to register)
 */
app.post('/api/auth/verify-and-register-face', (req: Request, res: Response) => {
  const { email, password, facePhotoUrl, faceDescriptor } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required to verify your identity.' });
    return;
  }
  if (!facePhotoUrl || !faceDescriptor || !Array.isArray(faceDescriptor)) {
    res.status(400).json({ error: 'Valid face photo and descriptor are required to register your face.' });
    return;
  }

  const currentDb = getDb();
  const user = currentDb.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user || !user.isActive || !comparePassword(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid email or password. Identity could not be verified.' });
    return;
  }

  if (!user.employeeId) {
    const emp = currentDb.employees[0];
    if (emp) user.employeeId = emp.id;
  }

  const employee = currentDb.employees.find((e) => e.id === user.employeeId);
  if (!employee) {
    res.status(400).json({ error: 'No employee profile linked to this user account.' });
    return;
  }

  // Update employee face registration
  employee.facePhotoUrl = facePhotoUrl;
  employee.faceDescriptor = faceDescriptor;
  employee.faceRegisteredAt = new Date().toISOString();
  employee.faceRegisteredByName = user.name;

  // Mark attendance for today if not already marked
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const existingAtt = currentDb.attendance.find((a) => a.employeeId === employee.id && a.date === today);
  let attendanceMarked = false;

  if (!existingAtt) {
    const status = evaluateCheckInStatus(now, currentDb.settings.officeStart, currentDb.settings.graceMinutes);
    const newAtt: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: employee.id,
      date: today,
      checkInTime: now.toISOString(),
      source: 'face_recognition',
      status,
      faceDetected: true,
      faceSimilarity: 1.0,
    };
    currentDb.attendance.push(newAtt);
    attendanceMarked = true;
  }

  saveDb();
  audit(user, 'register_face', 'employee', employee.id, null, {
    name: employee.name,
    registeredVia: 'login_verification',
  });

  const token = generateToken(user);
  res.json({
    success: true,
    message: `Face successfully registered for ${employee.name}!`,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      mustChangePassword: user.mustChangePassword,
    },
    employee,
    attendanceMarked,
  });
});

/**
 * Register or update face photo for an employee (from portal profile or admin directory)
 */
app.post('/api/employees/:id/register-face', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { facePhotoUrl, faceDescriptor } = req.body;
  const currentDb = getDb();
  const user = req.user!;
  const empId = req.params.id;

  if (user.role === 'employee' && user.employeeId !== empId) {
    res.status(403).json({ error: 'You can only register your own face profile.' });
    return;
  }

  const employee = currentDb.employees.find((e) => e.id === empId);
  if (!employee) {
    res.status(404).json({ error: 'Employee not found.' });
    return;
  }

  if (!facePhotoUrl || !faceDescriptor || !Array.isArray(faceDescriptor)) {
    res.status(400).json({ error: 'Both facePhotoUrl and faceDescriptor are required.' });
    return;
  }

  employee.facePhotoUrl = facePhotoUrl;
  employee.faceDescriptor = faceDescriptor;
  employee.faceRegisteredAt = new Date().toISOString();
  employee.faceRegisteredByName = user.name;

  saveDb();
  audit(user, 'register_face', 'employee', employee.id, null, {
    name: employee.name,
    enrolledBy: user.name,
  });

  res.json({
    message: `Face registered successfully for ${employee.name}!`,
    employee,
  });
});

/**
 * Remove registered face profile
 */
app.delete('/api/employees/:id/register-face', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const empId = req.params.id;

  if (user.role === 'employee' && user.employeeId !== empId) {
    res.status(403).json({ error: 'You can only remove your own face profile.' });
    return;
  }

  const employee = currentDb.employees.find((e) => e.id === empId);
  if (!employee) {
    res.status(404).json({ error: 'Employee not found.' });
    return;
  }

  employee.facePhotoUrl = undefined;
  employee.faceDescriptor = undefined;
  employee.faceRegisteredAt = undefined;
  employee.faceRegisteredByName = undefined;

  saveDb();
  audit(user, 'delete_face', 'employee', employee.id);

  res.json({
    message: `Face profile removed for ${employee.name}.`,
    employee,
  });
});

// ----------------------------------------------------
// M2: ORGANIZATION SETUP ROUTES
// ----------------------------------------------------

app.get('/api/org/settings', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  res.json(currentDb.settings);
});

app.put('/api/org/settings', authenticateToken, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const before = { ...currentDb.settings };
  Object.assign(currentDb.settings, req.body);
  saveDb();
  audit(req.user!, 'update', 'settings', undefined, before, currentDb.settings);
  res.json(currentDb.settings);
});

app.get('/api/org/departments', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  res.json(currentDb.departments);
});

app.post('/api/org/departments', authenticateToken, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  const { name, code } = req.body;
  if (!name || !code) {
    res.status(400).json({ error: 'Name and Code are required.' });
    return;
  }
  const currentDb = getDb();
  const newDept = { id: `dept-${Date.now()}`, name, code: code.toUpperCase() };
  currentDb.departments.push(newDept);
  saveDb();
  audit(req.user!, 'create', 'department', newDept.id, null, newDept);
  res.json(newDept);
});

app.get('/api/org/designations', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  res.json(currentDb.designations);
});

app.post('/api/org/designations', authenticateToken, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  const { title, departmentId } = req.body;
  if (!title || !departmentId) {
    res.status(400).json({ error: 'Title and departmentId are required.' });
    return;
  }
  const currentDb = getDb();
  const newDesig = { id: `desig-${Date.now()}`, title, departmentId };
  currentDb.designations.push(newDesig);
  saveDb();
  audit(req.user!, 'create', 'designation', newDesig.id, null, newDesig);
  res.json(newDesig);
});

app.get('/api/org/leave-types', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  res.json(currentDb.leaveTypes);
});

app.get('/api/org/holidays', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  res.json(currentDb.holidays);
});

app.post('/api/org/holidays', authenticateToken, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  const { name, date } = req.body;
  if (!name || !date) {
    res.status(400).json({ error: 'Name and Date are required.' });
    return;
  }
  const currentDb = getDb();
  const holiday = { id: `hol-${Date.now()}`, name, date };
  currentDb.holidays.push(holiday);
  saveDb();
  audit(req.user!, 'create', 'holiday', holiday.id, null, holiday);
  res.json(holiday);
});

// Admin creates HR login, deactivates, or resets passwords
app.get('/api/org/users', authenticateToken, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const sanitized = currentDb.users.map(({ passwordHash, ...rest }) => rest);
  res.json(sanitized);
});

app.post('/api/org/users', authenticateToken, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'Name, email, password, and role are required.' });
    return;
  }

  const currentDb = getDb();
  if (currentDb.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    res.status(400).json({ error: 'A user with this email already exists.' });
    return;
  }

  const newUser: User = {
    id: `usr-${Date.now()}`,
    name,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    role,
    mustChangePassword: role === 'employee',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  currentDb.users.push(newUser);
  saveDb();
  audit(req.user!, 'create', 'user', newUser.id, null, { email, role, name });
  const { passwordHash, ...sanitized } = newUser;
  res.json(sanitized);
});

app.put('/api/org/users/:id/toggle-active', authenticateToken, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const target = currentDb.users.find((u) => u.id === req.params.id);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  if (target.id === req.user!.id) {
    res.status(400).json({ error: 'Cannot deactivate your own account.' });
    return;
  }
  target.isActive = !target.isActive;
  saveDb();
  audit(req.user!, 'update', 'user', target.id, null, { isActive: target.isActive });
  res.json({ message: `User ${target.isActive ? 'activated' : 'deactivated'} successfully.`, isActive: target.isActive });
});

app.post('/api/org/users/:id/reset-password', authenticateToken, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const target = currentDb.users.find((u) => u.id === req.params.id);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  const tempPassword = req.body.newPassword || 'Saylani@123';
  target.passwordHash = hashPassword(tempPassword);
  target.mustChangePassword = true;
  saveDb();
  audit(req.user!, 'reset_password', 'user', target.id);
  res.json({ message: 'Password reset successfully. User must change it on next login.', tempPassword });
});

// ----------------------------------------------------
// M3: EMPLOYEES & DIRECTORY ROUTES
// ----------------------------------------------------

/**
 * Employee directory with server-side search, filtering, and paging
 */
app.get('/api/employees', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  let list = [...currentDb.employees];

  // If role is employee, employee only sees directory with public details, or their own profile
  const { search, departmentId, status, page = 1, limit = 20 } = req.query;

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
    );
  }

  if (departmentId) {
    list = list.filter((e) => e.departmentId === String(departmentId));
  }

  if (status) {
    list = list.filter((e) => e.status === String(status));
  }

  const total = list.length;
  const p = Math.max(1, Number(page));
  const l = Math.max(1, Number(limit));
  const paged = list.slice((p - 1) * l, p * l);

  // Mask salaries if logged-in user is employee and record is not their own!
  const sanitized = paged.map((emp) => {
    if (user.role === 'employee' && emp.id !== user.employeeId) {
      const { basicSalary, allowanceHra, allowanceMedical, grossSalary, phone, address, ...rest } = emp;
      return rest;
    }
    return emp;
  });

  res.json({
    data: sanitized,
    total,
    page: p,
    totalPages: Math.ceil(total / l),
  });
});

/**
 * Employee 360 profile
 */
app.get('/api/employees/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const empId = req.params.id;

  if (user.role === 'employee' && user.employeeId !== empId) {
    res.status(403).json({ error: 'Access denied. You can only view your own Employee 360 profile.' });
    return;
  }

  const emp = currentDb.employees.find((e) => e.id === empId);
  if (!emp) {
    res.status(404).json({ error: 'Employee not found.' });
    return;
  }

  const dept = currentDb.departments.find((d) => d.id === emp.departmentId);
  const desig = currentDb.designations.find((d) => d.id === emp.designationId);
  const userAccount = currentDb.users.find((u) => u.employeeId === emp.id);

  // Attendance history (recent 30 days)
  const attendance = currentDb.attendance
    .filter((a) => a.employeeId === emp.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  // Leaves
  const leaves = currentDb.leaveRequests
    .filter((l) => l.employeeId === emp.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Payslips (only if HR, Admin, or own)
  const payslips = currentDb.payslips
    .filter((p) => p.employeeId === emp.id)
    .sort((a, b) => b.month.localeCompare(a.month));

  // Attrition risk score
  const absentCount = attendance.filter((a) => a.status === 'half_day' || a.status === 'missing_checkout').length;
  const lateCount = attendance.filter((a) => a.status === 'late').length;
  const approvedLeaveDays = leaves
    .filter((l) => l.status === 'approved')
    .reduce((sum, l) => sum + l.workingDays, 0);
  const risk = calculateAttritionRisk(emp, absentCount, lateCount, approvedLeaveDays);

  res.json({
    employee: emp,
    department: dept,
    designation: desig,
    userAccount: userAccount ? { email: userAccount.email, isActive: userAccount.isActive, mustChangePassword: userAccount.mustChangePassword } : null,
    attendance,
    leaves,
    payslips,
    attritionRisk: user.role !== 'employee' ? risk : null,
  });
});

/**
 * HR registers an employee:
 * - Creates employee record
 * - Creates employee login with temporary password (change on first sign-in)
 * - Sets salary structure: Basic, HRA (40%), Medical (10%), Gross = 1.5 * Basic
 */
app.post('/api/employees', authenticateToken, requireRole('hr', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const {
    name,
    email,
    phone,
    address,
    departmentId,
    designationId,
    joinDate,
    gender,
    basicSalary,
    temporaryPassword = 'ChangeMe@123',
  } = req.body;

  if (!name || !email || !departmentId || !designationId || !joinDate || !basicSalary) {
    res.status(400).json({ error: 'Name, email, department, designation, join date, and basic salary are required.' });
    return;
  }

  // Check unique email
  if (currentDb.employees.some((e) => e.email.toLowerCase() === email.toLowerCase())) {
    res.status(400).json({ error: 'An employee with this email already exists.' });
    return;
  }

  const basic = Number(basicSalary);
  if (basic <= 0) {
    res.status(400).json({ error: 'Basic salary must be greater than zero.' });
    return;
  }

  const hra = Math.round(basic * 0.4);
  const medical = Math.round(basic * 0.1);
  const gross = Math.round(basic * 1.5);

  const empId = `emp-${Date.now()}`;
  const codeSeq = currentDb.employees.length + 1;
  const employeeCode = `EMP-${String(codeSeq).padStart(3, '0')}`;

  // Create User Login with mustChangePassword = true
  const userId = `usr-${Date.now()}`;
  const newUser: User = {
    id: userId,
    email: email.toLowerCase(),
    passwordHash: hashPassword(temporaryPassword),
    name,
    role: 'employee',
    employeeId: empId,
    mustChangePassword: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  currentDb.users.push(newUser);

  const newEmp: Employee = {
    id: empId,
    employeeCode,
    name,
    email: email.toLowerCase(),
    phone: phone || '',
    address: address || '',
    departmentId,
    designationId,
    joinDate,
    gender: gender || 'other',
    status: 'active',
    basicSalary: basic,
    allowanceHra: hra,
    allowanceMedical: medical,
    grossSalary: gross,
    userId,
  };

  currentDb.employees.push(newEmp);
  saveDb();

  audit(req.user!, 'create', 'employee', newEmp.id, null, newEmp);
  res.json({
    message: 'Employee registered successfully!',
    employee: newEmp,
    credentials: {
      email: newEmp.email,
      temporaryPassword,
      note: 'Employee must change this password on first sign-in.',
    },
  });
});

/**
 * Edit employee:
 * - HR/Admin can edit job details, department, salary
 * - Employee can ONLY edit their own phone and address
 */
app.put('/api/employees/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const emp = currentDb.employees.find((e) => e.id === req.params.id);

  if (!emp) {
    res.status(404).json({ error: 'Employee not found.' });
    return;
  }

  const before = { ...emp };

  if (user.role === 'employee') {
    if (user.employeeId !== emp.id) {
      res.status(403).json({ error: 'Cannot edit other employees.' });
      return;
    }
    // Only phone & address allowed
    if (req.body.phone !== undefined) emp.phone = req.body.phone;
    if (req.body.address !== undefined) emp.address = req.body.address;
  } else {
    // HR / Admin
    const { name, phone, address, departmentId, designationId, status, basicSalary, joinDate, exitDate } = req.body;
    if (name) emp.name = name;
    if (phone !== undefined) emp.phone = phone;
    if (address !== undefined) emp.address = address;
    if (departmentId) emp.departmentId = departmentId;
    if (designationId) emp.designationId = designationId;
    if (status) emp.status = status;
    if (joinDate) emp.joinDate = joinDate;
    if (exitDate !== undefined) emp.exitDate = exitDate;

    if (basicSalary) {
      const basic = Number(basicSalary);
      emp.basicSalary = basic;
      emp.allowanceHra = Math.round(basic * 0.4);
      emp.allowanceMedical = Math.round(basic * 0.1);
      emp.grossSalary = Math.round(basic * 1.5);
    }
  }

  saveDb();
  audit(user, 'update', 'employee', emp.id, before, emp);
  res.json({ message: 'Employee updated successfully.', employee: emp });
});

/**
 * CSV Dry-Run Import & Validation
 * Brief Rule: Dry run returning row + field + reason; checks required fields, unique code/email, valid email, known dept, ISO date, salary > 0.
 */
app.post('/api/employees/csv-dry-run', authenticateToken, requireRole('hr', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const { rows } = req.body; // array of objects parsed from CSV
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: 'No rows provided for CSV dry run.' });
    return;
  }

  const currentDb = getDb();
  const errors: Array<{ row: number; field: string; reason: string }> = [];
  const validRows: any[] = [];

  const seenEmails = new Set(currentDb.employees.map((e) => e.email.toLowerCase()));
  const seenCodes = new Set(currentDb.employees.map((e) => e.employeeCode.toUpperCase()));

  rows.forEach((r, idx) => {
    const rowNum = idx + 1;
    let hasErr = false;

    // Required fields check
    if (!r.name) {
      errors.push({ row: rowNum, field: 'name', reason: 'Employee name is required.' });
      hasErr = true;
    }

    if (!r.email) {
      errors.push({ row: rowNum, field: 'email', reason: 'Email is required.' });
      hasErr = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(r.email)) {
        errors.push({ row: rowNum, field: 'email', reason: 'Invalid email address format.' });
        hasErr = true;
      } else if (seenEmails.has(r.email.toLowerCase())) {
        errors.push({ row: rowNum, field: 'email', reason: 'Email already exists in system or batch.' });
        hasErr = true;
      }
    }

    if (r.employeeCode && seenCodes.has(r.employeeCode.toUpperCase())) {
      errors.push({ row: rowNum, field: 'employeeCode', reason: 'Employee code already exists.' });
      hasErr = true;
    }

    // Known dept
    const dept = currentDb.departments.find(
      (d) => d.id === r.departmentId || d.name.toLowerCase() === (r.department || '').toLowerCase()
    );
    if (!dept) {
      errors.push({ row: rowNum, field: 'department', reason: `Unknown department '${r.department || r.departmentId}'.` });
      hasErr = true;
    }

    // ISO date
    if (!r.joinDate || isNaN(Date.parse(r.joinDate))) {
      errors.push({ row: rowNum, field: 'joinDate', reason: 'Invalid or missing join date (must be YYYY-MM-DD).' });
      hasErr = true;
    }

    // Salary > 0
    const salary = Number(r.basicSalary);
    if (isNaN(salary) || salary <= 0) {
      errors.push({ row: rowNum, field: 'basicSalary', reason: 'Basic salary must be a positive number.' });
      hasErr = true;
    }

    if (!hasErr) {
      seenEmails.add(r.email.toLowerCase());
      if (r.employeeCode) seenCodes.add(r.employeeCode.toUpperCase());
      validRows.push({
        ...r,
        departmentId: dept!.id,
        basicSalary: salary,
      });
    }
  });

  res.json({
    totalRows: rows.length,
    validCount: validRows.length,
    errorCount: errors.length,
    errors,
    isValid: errors.length === 0,
    validRows,
  });
});

/**
 * CSV Import Commit
 */
app.post('/api/employees/csv-import', authenticateToken, requireRole('hr', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const { validRows } = req.body;
  if (!Array.isArray(validRows) || validRows.length === 0) {
    res.status(400).json({ error: 'No validated rows provided for import.' });
    return;
  }

  const currentDb = getDb();
  const created: Employee[] = [];

  for (const r of validRows) {
    const basic = Number(r.basicSalary);
    const empId = `emp-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const code = r.employeeCode || `EMP-${String(currentDb.employees.length + 1).padStart(3, '0')}`;
    const userId = `usr-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;

    const newUser: User = {
      id: userId,
      email: r.email.toLowerCase(),
      passwordHash: hashPassword('Welcome@123'),
      name: r.name,
      role: 'employee',
      employeeId: empId,
      mustChangePassword: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    currentDb.users.push(newUser);

    const emp: Employee = {
      id: empId,
      employeeCode: code,
      name: r.name,
      email: r.email.toLowerCase(),
      phone: r.phone || '',
      address: r.address || '',
      departmentId: r.departmentId,
      designationId: r.designationId || currentDb.designations[0]?.id || '',
      joinDate: r.joinDate,
      gender: r.gender || 'other',
      status: 'active',
      basicSalary: basic,
      allowanceHra: Math.round(basic * 0.4),
      allowanceMedical: Math.round(basic * 0.1),
      grossSalary: Math.round(basic * 1.5),
      userId,
    };

    currentDb.employees.push(emp);
    created.push(emp);
  }

  saveDb();
  audit(req.user!, 'csv_import', 'employee', undefined, null, { count: created.length });
  res.json({ message: `Successfully imported ${created.length} employees.`, count: created.length });
});

/**
 * Export employees as CSV
 */
app.get('/api/employees/export-csv', authenticateToken, requireRole('hr', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const header = ['EmployeeCode', 'Name', 'Email', 'Phone', 'Department', 'Designation', 'JoinDate', 'Status', 'BasicSalary', 'GrossSalary'];
  const rows = currentDb.employees.map((e) => {
    const dept = currentDb.departments.find((d) => d.id === e.departmentId)?.name || '';
    const desig = currentDb.designations.find((d) => d.id === e.designationId)?.title || '';
    return [
      `"${e.employeeCode}"`,
      `"${e.name}"`,
      `"${e.email}"`,
      `"${e.phone}"`,
      `"${dept}"`,
      `"${desig}"`,
      `"${e.joinDate}"`,
      `"${e.status}"`,
      e.basicSalary,
      e.grossSalary,
    ].join(',');
  });

  const csvContent = [header.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="employees-export.csv"');
  res.send(csvContent);
});

// ----------------------------------------------------
// M4: ATTENDANCE & CAMERA CHECK-IN ROUTES
// ----------------------------------------------------

/**
 * Daily attendance board and records
 */
app.get('/api/attendance', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const { date, employeeId, startDate, endDate } = req.query;

  let records = [...currentDb.attendance];

  // RBAC data scope: Employee can ONLY read records with their own employeeId
  if (user.role === 'employee') {
    records = records.filter((r) => r.employeeId === user.employeeId);
  } else if (employeeId) {
    records = records.filter((r) => r.employeeId === String(employeeId));
  }

  if (date) {
    records = records.filter((r) => r.date === String(date));
  } else if (startDate && endDate) {
    records = records.filter((r) => r.date >= String(startDate) && r.date <= String(endDate));
  }

  // Enrich with employee name & dept
  const enriched = records.map((r) => {
    const emp = currentDb.employees.find((e) => e.id === r.employeeId);
    const dept = currentDb.departments.find((d) => d.id === emp?.departmentId);
    return {
      ...r,
      employeeName: emp?.name || 'Unknown',
      employeeCode: emp?.employeeCode || '',
      departmentName: dept?.name || '',
    };
  });

  res.json(enriched);
});

/**
 * Check-in endpoint (Web & Camera Check-in)
 * Business rules:
 * - Server stamps time.
 * - One record per employee per day (second check-in = 409 Conflict).
 * - Late after 09:15.
 * - Geofencing: if location is provided, calculate Haversine distance. Distance must be <= officeRadius.
 * - Camera bonus: face detection check.
 */
app.post('/api/attendance/check-in', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;

  let empId = user.role === 'employee' ? user.employeeId : req.body.employeeId || user.employeeId;
  if (!empId && (user.role === 'admin' || user.role === 'hr')) {
    empId = currentDb.employees[0]?.id;
  }
  if (!empId) {
    res.status(400).json({ error: 'No employee associated with this account to record attendance.' });
    return;
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // RULE: One record per employee per day (second check-in = 409)
  const existing = currentDb.attendance.find((a) => a.employeeId === empId && a.date === today);
  if (existing) {
    res.status(409).json({ error: 'Second check-in is not allowed. You have already checked in for today.' });
    return;
  }

  const { source = 'web', latitude, longitude, accuracy, faceDetected } = req.body;

  // Camera geofence check
  let distanceMeters: number | undefined;
  if (source === 'camera') {
    const faces = req.body.faceCount !== undefined ? Number(req.body.faceCount) : (faceDetected ? 1 : 0);

    if (faces === 0) {
      res.status(422).json({
        error: 'Face verification failed: No face detected in frame. Exactly one face must be in frame.',
        code: 'FACE_NOT_FOUND',
      });
      return;
    }

    if (faces > 1) {
      res.status(422).json({
        error: `Face verification failed: Multiple faces detected (${faces} faces in frame). Exactly one face is accepted per check-in.`,
        code: 'MULTIPLE_FACES',
      });
      return;
    }

    if (latitude !== undefined && longitude !== undefined) {
      if (accuracy !== undefined && Number(accuracy) > 100) {
        res.status(422).json({
          error: `GPS verification failed: Signal accuracy is too weak (±${accuracy}m). Accuracy must be 100m or better.`,
          code: 'GPS_WEAK_ACCURACY',
        });
        return;
      }

      distanceMeters = calculateHaversineDistance(
        Number(latitude),
        Number(longitude),
        currentDb.settings.officeLat,
        currentDb.settings.officeLng
      );

      if (distanceMeters > currentDb.settings.officeRadiusMeters) {
        res.status(422).json({
          error: `Geofence check failed: You are ${distanceMeters}m away from the office location. Maximum allowed radius is ${currentDb.settings.officeRadiusMeters}m.`,
          distanceMeters,
          code: 'OUTSIDE_GEOFENCE',
        });
        return;
      }
    }
  }

  // Evaluate status: office start 09:00 + grace 15m
  const status = evaluateCheckInStatus(now, currentDb.settings.officeStart, currentDb.settings.graceMinutes);

  const record: AttendanceRecord = {
    id: `att-${Date.now()}`,
    employeeId: empId,
    date: today,
    checkInTime: now.toISOString(),
    source,
    status,
    latitude: latitude ? Number(latitude) : undefined,
    longitude: longitude ? Number(longitude) : undefined,
    distanceMeters,
    faceDetected: source === 'camera' ? true : undefined,
  };

  currentDb.attendance.push(record);
  saveDb();
  audit(user, 'check_in', 'attendance', record.id, null, { date: today, status, source });

  res.json({
    message: `Checked in successfully! Status: ${status === 'late' ? 'Late' : 'Present'}`,
    record,
  });
});

/**
 * Check-out endpoint
 */
app.post('/api/attendance/check-out', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const empId = user.role === 'employee' ? user.employeeId : req.body.employeeId || user.employeeId;

  if (!empId) {
    res.status(400).json({ error: 'No employee record associated.' });
    return;
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const record = currentDb.attendance.find((a) => a.employeeId === empId && a.date === today);
  if (!record) {
    res.status(404).json({ error: 'No check-in record found for today. You must check in first.' });
    return;
  }

  if (record.checkOutTime) {
    res.status(400).json({ error: 'You have already checked out for today.' });
    return;
  }

  record.checkOutTime = now.toISOString();
  const { hours, isHalfDay } = evaluateWorkingHours(record.checkInTime, record.checkOutTime, currentDb.settings.halfDayHours);
  record.workingHours = hours;

  if (isHalfDay) {
    record.status = 'half_day';
  }

  saveDb();
  audit(user, 'check_out', 'attendance', record.id, null, { workingHours: hours, status: record.status });

  res.json({
    message: `Checked out successfully! Total working hours: ${hours}h.`,
    record,
  });
});

/**
 * Attendance Corrections: Employee requests, HR approves
 */
app.get('/api/attendance/corrections', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;

  let list = [...currentDb.attendanceCorrections];
  if (user.role === 'employee') {
    list = list.filter((c) => c.employeeId === user.employeeId);
  }

  const enriched = list.map((c) => {
    const emp = currentDb.employees.find((e) => e.id === c.employeeId);
    return {
      ...c,
      employeeName: emp?.name || 'Unknown',
      employeeCode: emp?.employeeCode || '',
    };
  });

  res.json(enriched);
});

app.post('/api/attendance/corrections', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const { date, requestedCheckIn, requestedCheckOut, reason } = req.body;

  if (!date || !requestedCheckIn || !reason) {
    res.status(400).json({ error: 'Date, requested check-in time, and reason are required.' });
    return;
  }

  const empId = user.employeeId || req.body.employeeId;
  if (!empId) {
    res.status(400).json({ error: 'No employee record associated.' });
    return;
  }

  const correction = {
    id: `cor-${Date.now()}`,
    employeeId: empId,
    date,
    requestedCheckIn,
    requestedCheckOut: requestedCheckOut || '',
    reason,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  };

  currentDb.attendanceCorrections.unshift(correction);
  saveDb();
  audit(user, 'request_correction', 'attendance_correction', correction.id, null, correction);
  res.json({ message: 'Attendance correction request submitted to HR.', correction });
});

app.put('/api/attendance/corrections/:id', authenticateToken, requireRole('hr', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const { status, hrComment } = req.body; // 'approved' | 'rejected'

  const cor = currentDb.attendanceCorrections.find((c) => c.id === req.params.id);
  if (!cor) {
    res.status(404).json({ error: 'Correction request not found.' });
    return;
  }

  cor.status = status;
  cor.hrComment = hrComment || '';
  cor.reviewedBy = user.name;
  cor.reviewedAt = new Date().toISOString();

  // If approved, update or insert attendance record
  if (status === 'approved') {
    let rec = currentDb.attendance.find((a) => a.employeeId === cor.employeeId && a.date === cor.date);
    const checkInDate = new Date(cor.requestedCheckIn);
    const attStatus = evaluateCheckInStatus(checkInDate, currentDb.settings.officeStart, currentDb.settings.graceMinutes);

    if (rec) {
      rec.checkInTime = cor.requestedCheckIn;
      rec.status = attStatus;
      if (cor.requestedCheckOut) {
        rec.checkOutTime = cor.requestedCheckOut;
        const { hours, isHalfDay } = evaluateWorkingHours(rec.checkInTime, rec.checkOutTime, currentDb.settings.halfDayHours);
        rec.workingHours = hours;
        if (isHalfDay) rec.status = 'half_day';
      }
    } else {
      rec = {
        id: `att-${Date.now()}`,
        employeeId: cor.employeeId,
        date: cor.date,
        checkInTime: cor.requestedCheckIn,
        checkOutTime: cor.requestedCheckOut || undefined,
        source: 'web',
        status: attStatus,
      };
      if (cor.requestedCheckOut) {
        const { hours, isHalfDay } = evaluateWorkingHours(rec.checkInTime, rec.checkOutTime!, currentDb.settings.halfDayHours);
        rec.workingHours = hours;
        if (isHalfDay) rec.status = 'half_day';
      }
      currentDb.attendance.push(rec);
    }
  }

  saveDb();
  audit(user, 'decide_correction', 'attendance_correction', cor.id, null, { status, hrComment });
  res.json({ message: `Correction request ${status}.`, correction: cor });
});

// ----------------------------------------------------
// M5: LEAVE WORKFLOW & APPROVAL ROUTES
// ----------------------------------------------------

app.get('/api/leaves', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  let leaves = [...currentDb.leaveRequests];

  if (user.role === 'employee') {
    leaves = leaves.filter((l) => l.employeeId === user.employeeId);
  }

  const enriched = leaves.map((l) => {
    const emp = currentDb.employees.find((e) => e.id === l.employeeId);
    const lt = currentDb.leaveTypes.find((t) => t.id === l.leaveTypeId);
    return {
      ...l,
      employeeName: emp?.name || 'Unknown',
      employeeCode: emp?.employeeCode || '',
      leaveTypeName: lt?.name || l.leaveTypeId,
    };
  });

  res.json(enriched);
});

/**
 * Leave quota balance endpoint
 */
app.get('/api/leaves/balance/:employeeId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const empId = req.params.employeeId;

  if (user.role === 'employee' && user.employeeId !== empId) {
    res.status(403).json({ error: 'Cannot view leave balance of another employee.' });
    return;
  }

  const approvedLeaves = currentDb.leaveRequests.filter((l) => l.employeeId === empId && l.status === 'approved');

  const balances = currentDb.leaveTypes.map((lt) => {
    const used = approvedLeaves
      .filter((l) => l.leaveTypeId === lt.id)
      .reduce((sum, l) => sum + l.workingDays, 0);

    const quota = lt.yearlyQuota;
    const remaining = quota >= 999 ? 9999 : Math.max(0, quota - used);
    return {
      leaveTypeId: lt.id,
      name: lt.name,
      code: lt.code,
      quota,
      usedDays: used,
      remainingDays: remaining,
    };
  });

  res.json(balances);
});

/**
 * Apply for leave:
 * Brief Rules:
 * - Working days only (skip weekends, holidays)
 * - Quotas: annual 14, sick 8, casual 10, unpaid unlimited
 * - Overlap or over-balance = 422 Unprocessable Entity
 */
app.post('/api/leaves/apply', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const { leaveTypeId, startDate, endDate, reason } = req.body;

  if (!leaveTypeId || !startDate || !endDate || !reason) {
    res.status(400).json({ error: 'Leave type, start date, end date, and reason are required.' });
    return;
  }

  const empId = user.employeeId || req.body.employeeId;
  if (!empId) {
    res.status(400).json({ error: 'No employee record found for applicant.' });
    return;
  }

  if (startDate > endDate) {
    res.status(422).json({ error: 'Start date cannot be after end date.' });
    return;
  }

  // Calculate working days (skipping weekends & holidays)
  const { count: workingDays, dates: requestDates } = countWorkingDays(
    startDate,
    endDate,
    currentDb.settings.weekendDays,
    currentDb.holidays
  );

  if (workingDays === 0) {
    res.status(422).json({ error: 'The selected date range contains no working days (all fall on weekends or public holidays).' });
    return;
  }

  // RULE: Check overlap with existing approved or pending leaves
  const existingLeaves = currentDb.leaveRequests.filter(
    (l) => l.employeeId === empId && (l.status === 'approved' || l.status === 'pending')
  );

  for (const l of existingLeaves) {
    const { dates: existingDates } = countWorkingDays(l.startDate, l.endDate, currentDb.settings.weekendDays, currentDb.holidays);
    const hasOverlap = requestDates.some((d) => existingDates.includes(d));
    if (hasOverlap) {
      res.status(422).json({
        error: `Leave overlap detected! You already have an existing leave request (${l.startDate} to ${l.endDate}) covering one or more of these dates.`,
      });
      return;
    }
  }

  // RULE: Check quota balance
  const lt = currentDb.leaveTypes.find((t) => t.id === leaveTypeId || t.code === leaveTypeId);
  if (!lt) {
    res.status(404).json({ error: 'Invalid leave type.' });
    return;
  }

  const usedDays = currentDb.leaveRequests
    .filter((l) => l.employeeId === empId && l.leaveTypeId === lt.id && l.status === 'approved')
    .reduce((sum, l) => sum + l.workingDays, 0);

  const remaining = lt.yearlyQuota >= 999 ? 9999 : lt.yearlyQuota - usedDays;
  if (workingDays > remaining) {
    res.status(422).json({
      error: `Over-balance error! You requested ${workingDays} working days, but you only have ${remaining} days remaining in your ${lt.name} quota.`,
    });
    return;
  }

  const newRequest: LeaveRequest = {
    id: `leave-${Date.now()}`,
    employeeId: empId,
    leaveTypeId: lt.id,
    startDate,
    endDate,
    workingDays,
    reason,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  currentDb.leaveRequests.unshift(newRequest);
  saveDb();
  audit(user, 'apply_leave', 'leave', newRequest.id, null, newRequest);

  res.json({
    message: 'Leave application submitted successfully.',
    leaveRequest: newRequest,
    workingDays,
  });
});

/**
 * Cancel pending leave
 */
app.post('/api/leaves/:id/cancel', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const leave = currentDb.leaveRequests.find((l) => l.id === req.params.id);

  if (!leave) {
    res.status(404).json({ error: 'Leave request not found.' });
    return;
  }

  if (user.role === 'employee' && leave.employeeId !== user.employeeId) {
    res.status(403).json({ error: 'Unauthorized to cancel this leave.' });
    return;
  }

  if (leave.status !== 'pending') {
    res.status(400).json({ error: `Cannot cancel a leave with status '${leave.status}'.` });
    return;
  }

  leave.status = 'cancelled';
  saveDb();
  audit(user, 'cancel_leave', 'leave', leave.id);
  res.json({ message: 'Leave request cancelled.', leave });
});

/**
 * HR approves or rejects leave with a comment
 */
app.post('/api/leaves/:id/decide', authenticateToken, requireRole('hr', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const { status, hrComment } = req.body; // 'approved' | 'rejected'

  if (status !== 'approved' && status !== 'rejected') {
    res.status(400).json({ error: "Status must be 'approved' or 'rejected'." });
    return;
  }

  const leave = currentDb.leaveRequests.find((l) => l.id === req.params.id);
  if (!leave) {
    res.status(404).json({ error: 'Leave request not found.' });
    return;
  }

  const before = { ...leave };
  leave.status = status;
  leave.hrComment = hrComment || '';
  leave.reviewedBy = user.name;
  leave.reviewedAt = new Date().toISOString();

  // Send notification to employee
  const emp = currentDb.employees.find((e) => e.id === leave.employeeId);
  if (emp && emp.userId) {
    currentDb.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: emp.userId,
      title: `Leave Request ${status.toUpperCase()}`,
      message: `Your leave request from ${leave.startDate} to ${leave.endDate} was ${status} by HR. Comment: ${hrComment || 'None'}`,
      type: 'leave',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  saveDb();
  audit(user, 'decide_leave', 'leave', leave.id, before, leave);
  res.json({ message: `Leave request ${status} successfully.`, leave });
});

// ----------------------------------------------------
// M6: PAYROLL LITE ROUTES
// ----------------------------------------------------

/**
 * Get all payroll runs
 */
app.get('/api/payroll/runs', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  res.json(currentDb.payrollRuns);
});

/**
 * Generate / Review monthly payroll draft (HR or Admin)
 */
app.post('/api/payroll/draft', authenticateToken, requireRole('hr', 'admin'), (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const { month } = req.body; // YYYY-MM e.g. "2026-10"

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM (e.g. 2026-10).' });
    return;
  }

  // Check if finalized run already exists
  const existing = currentDb.payrollRuns.find((p) => p.month === month);
  if (existing && existing.status === 'finalized') {
    res.status(409).json({ error: 'This month has already been finalized and locked by Admin. It cannot be recalculated.' });
    return;
  }

  const totalWorkingDays = getWorkingDaysInMonth(month, currentDb.settings.weekendDays, currentDb.holidays);

  let runId = existing ? existing.id : `payrun-${month}-${Date.now()}`;
  const payslipsForMonth: Payslip[] = [];

  let sumGross = 0;
  let sumDeductions = 0;
  let sumTax = 0;
  let sumNet = 0;

  for (const emp of currentDb.employees) {
    if (emp.status === 'terminated' || emp.status === 'resigned') {
      // Check if exit happened before this month
      if (emp.exitDate && emp.exitDate < `${month}-01`) continue;
    }

    // Attendance stats for this month
    const attRecords = currentDb.attendance.filter(
      (a) => a.employeeId === emp.id && a.date.startsWith(month)
    );
    const presentDays = attRecords.filter((a) => a.status === 'present').length;
    const lateDays = attRecords.filter((a) => a.status === 'late').length;
    const halfDays = attRecords.filter((a) => a.status === 'half_day').length;

    // Approved leaves in this month
    const approvedLeaves = currentDb.leaveRequests.filter(
      (l) => l.employeeId === emp.id && l.status === 'approved' && (l.startDate.startsWith(month) || l.endDate.startsWith(month))
    );

    let unpaidDays = 0;
    approvedLeaves.forEach((l) => {
      const lt = currentDb.leaveTypes.find((t) => t.id === l.leaveTypeId);
      if (lt && lt.code === 'unpaid') {
        unpaidDays += l.workingDays;
      }
    });

    const activeDaysRecorded = attRecords.length;
    const absentDays = Math.max(0, totalWorkingDays - activeDaysRecorded - approvedLeaves.reduce((s, l) => s + l.workingDays, 0));

    const slip = computeEmployeeMonthlyPayroll({
      employee: emp,
      month,
      totalMonthWorkingDays: totalWorkingDays,
      presentDays,
      lateDays,
      halfDays,
      absentDays,
      unpaidLeaveDays: unpaidDays,
      latePenaltyEnabled: currentDb.settings.latePenaltyEnabled,
    });

    const payslipObj: Payslip = {
      id: `slip-${emp.id}-${month}`,
      payrollRunId: runId,
      employeeId: emp.id,
      month,
      ...slip,
      status: 'draft',
    };

    payslipsForMonth.push(payslipObj);
    sumGross += slip.grossSalary;
    sumDeductions += slip.leaveDeductions + slip.latePenaltyDeduction;
    sumTax += slip.taxDeduction;
    sumNet += slip.netSalary;
  }

  // Remove existing draft payslips for this month
  currentDb.payslips = currentDb.payslips.filter((p) => p.month !== month);
  currentDb.payslips.push(...payslipsForMonth);

  const payrollRun: PayrollRun = {
    id: runId,
    month,
    status: 'draft',
    totalWorkingDays,
    totalGross: sumGross,
    totalDeductions: sumDeductions,
    totalTax: sumTax,
    totalNet: sumNet,
    createdAt: new Date().toISOString(),
  };

  currentDb.payrollRuns = currentDb.payrollRuns.filter((p) => p.month !== month);
  currentDb.payrollRuns.unshift(payrollRun);

  saveDb();
  audit(user, 'draft_payroll', 'payroll', payrollRun.id, null, { month, totalNet: sumNet, employees: payslipsForMonth.length });

  res.json({
    message: 'Monthly payroll draft prepared successfully.',
    payrollRun,
    payslips: payslipsForMonth,
  });
});

/**
 * Admin finalizes payroll (Locks the month)
 * Brief Rule: Finalize the monthly payroll prepared by HR (only Admin can lock it). Finalized runs cannot be edited!
 */
app.post('/api/payroll/:id/finalize', authenticateToken, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const run = currentDb.payrollRuns.find((p) => p.id === req.params.id);

  if (!run) {
    res.status(404).json({ error: 'Payroll run not found.' });
    return;
  }

  if (run.status === 'finalized') {
    res.status(400).json({ error: 'This payroll run is already locked and finalized.' });
    return;
  }

  run.status = 'finalized';
  run.finalizedBy = user.name;
  run.finalizedAt = new Date().toISOString();

  // Mark all payslips for this run as finalized and send in-app notifications
  currentDb.payslips
    .filter((p) => p.payrollRunId === run.id)
    .forEach((p) => {
      p.status = 'finalized';
      const emp = currentDb.employees.find((e) => e.id === p.employeeId);
      if (emp?.userId) {
        currentDb.notifications.unshift({
          id: `notif-${Date.now()}-${p.id}`,
          userId: emp.userId,
          title: `Payslip Available: ${p.month}`,
          message: `Your finalized payslip for ${p.month} is now available for download. Net Pay: PKR ${p.netSalary.toLocaleString()}`,
          type: 'payroll',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    });

  saveDb();
  audit(user, 'finalize', 'payroll', run.id, null, { month: run.month, lockedBy: user.email });

  res.json({
    message: `Payroll for ${run.month} is officially finalized and locked!`,
    payrollRun: run,
  });
});

/**
 * Payslips list & detail (Role scoped)
 */
app.get('/api/payroll/payslips', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const { month, employeeId } = req.query;

  let slips = [...currentDb.payslips];

  if (user.role === 'employee') {
    // Employee only sees finalized payslips for themselves
    slips = slips.filter((s) => s.employeeId === user.employeeId && s.status === 'finalized');
  } else if (employeeId) {
    slips = slips.filter((s) => s.employeeId === String(employeeId));
  }

  if (month) {
    slips = slips.filter((s) => s.month === String(month));
  }

  const enriched = slips.map((s) => {
    const emp = currentDb.employees.find((e) => e.id === s.employeeId);
    const dept = currentDb.departments.find((d) => d.id === emp?.departmentId);
    const desig = currentDb.designations.find((d) => d.id === emp?.designationId);
    return {
      ...s,
      employeeName: emp?.name || 'Unknown',
      employeeCode: emp?.employeeCode || '',
      departmentName: dept?.name || '',
      designationTitle: desig?.title || '',
    };
  });

  res.json(enriched);
});

// ----------------------------------------------------
// M7: DASHBOARDS & ANALYTICS ROUTES
// ----------------------------------------------------

/**
 * Dashboard KPIs and server-side aggregations filterable by department & date range
 */
app.get('/api/dashboards/stats', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const { departmentId, dateRange = 'month' } = req.query;

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);

  let emps = [...currentDb.employees];
  if (departmentId) {
    emps = emps.filter((e) => e.departmentId === String(departmentId));
  }

  const activeEmps = emps.filter((e) => e.status === 'active' || e.status === 'probation');
  const headcount = activeEmps.length;

  // Headcount & attrition formula: Active + probation on end date / exits in period / average headcount * 100
  const exitsCount = emps.filter((e) => e.status === 'resigned' || e.status === 'terminated').length;
  const attritionRate = headcount > 0 ? Number(((exitsCount / Math.max(1, headcount)) * 100).toFixed(1)) : 0;

  // Today's attendance
  const todayAtt = currentDb.attendance.filter(
    (a) => a.date === today && emps.some((e) => e.id === a.employeeId)
  );
  const presentToday = todayAtt.filter((a) => a.status === 'present').length;
  const lateToday = todayAtt.filter((a) => a.status === 'late').length;
  const halfDayToday = todayAtt.filter((a) => a.status === 'half_day').length;

  // On leave today
  const onLeaveTodayCount = currentDb.leaveRequests.filter(
    (l) =>
      l.status === 'approved' &&
      l.startDate <= today &&
      l.endDate >= today &&
      emps.some((e) => e.id === l.employeeId)
  ).length;

  const totalWorkingRecordsToday = todayAtt.length;
  // Formula: (present + late + missing_checkout + 0.5 * half_day) / (working_day_records - on_leave)
  const effectivePresent = presentToday + lateToday + 0.5 * halfDayToday;
  const attendanceRate =
    headcount > 0
      ? Math.min(100, Math.round((effectivePresent / Math.max(1, headcount - onLeaveTodayCount)) * 100))
      : 100;

  // Absenteeism by department
  const absenteeismByDept = currentDb.departments.map((d) => {
    const deptEmps = currentDb.employees.filter((e) => e.departmentId === d.id && (e.status === 'active' || e.status === 'probation'));
    const deptAtt = currentDb.attendance.filter((a) => a.date === today && deptEmps.some((e) => e.id === a.employeeId));
    const absent = Math.max(0, deptEmps.length - deptAtt.length);
    const rate = deptEmps.length > 0 ? Math.round((absent / deptEmps.length) * 100) : 0;
    return {
      departmentId: d.id,
      name: d.name,
      totalEmployees: deptEmps.length,
      absentCount: absent,
      absentRatePercent: rate,
    };
  });

  // Leave utilization by type
  const leaveUtilization = currentDb.leaveTypes.map((lt) => {
    const approvedDays = currentDb.leaveRequests
      .filter((l) => l.leaveTypeId === lt.id && l.status === 'approved')
      .reduce((sum, l) => sum + l.workingDays, 0);
    const totalQuota = headcount * lt.yearlyQuota;
    const utilizationRate = lt.yearlyQuota < 999 && totalQuota > 0 ? Math.round((approvedDays / totalQuota) * 100) : 0;
    return {
      name: lt.name,
      code: lt.code,
      approvedDays,
      quotaPerEmployee: lt.yearlyQuota,
      utilizationRatePercent: utilizationRate,
    };
  });

  // Top 5 late-comers this month
  const monthAtt = currentDb.attendance.filter((a) => a.date.startsWith(currentMonth) && a.status === 'late');
  const lateMap: { [empId: string]: number } = {};
  monthAtt.forEach((a) => {
    lateMap[a.employeeId] = (lateMap[a.employeeId] || 0) + 1;
  });

  const topLateComers = Object.entries(lateMap)
    .map(([empId, count]) => {
      const emp = currentDb.employees.find((e) => e.id === empId);
      const dept = currentDb.departments.find((d) => d.id === emp?.departmentId);
      return {
        id: empId,
        name: emp?.name || 'Unknown',
        department: dept?.name || '',
        lateCount: count,
      };
    })
    .sort((a, b) => b.lateCount - a.lateCount)
    .slice(0, 5);

  // Payroll summary
  const totalPayrollCost = activeEmps.reduce((sum, e) => sum + e.grossSalary, 0);
  const avgSalary = headcount > 0 ? Math.round(totalPayrollCost / headcount) : 0;

  // Headcount by dept
  const headcountByDept = currentDb.departments.map((d) => ({
    name: d.name,
    count: currentDb.employees.filter((e) => e.departmentId === d.id && (e.status === 'active' || e.status === 'probation')).length,
    payrollCost: currentDb.employees
      .filter((e) => e.departmentId === d.id && (e.status === 'active' || e.status === 'probation'))
      .reduce((sum, e) => sum + e.grossSalary, 0),
  }));

  // Employee specific personal dashboard KPIs if logged in as employee
  let employeeDashboardData = null;
  if (user.role === 'employee' && user.employeeId) {
    const myAtt = currentDb.attendance.filter((a) => a.employeeId === user.employeeId);
    const myToday = myAtt.find((a) => a.date === today);

    // Hours this week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    const thisWeekHours = myAtt
      .filter((a) => a.date >= startOfWeekStr)
      .reduce((sum, a) => sum + (a.workingHours || 0), 0);

    const myLates = myAtt.filter((a) => a.status === 'late' && a.date.startsWith(currentMonth)).length;

    const myLeaves = currentDb.leaveRequests.filter(
      (l) => l.employeeId === user.employeeId && l.status === 'approved'
    );
    const leaveBalances = currentDb.leaveTypes.map((lt) => {
      const used = myLeaves.filter((l) => l.leaveTypeId === lt.id).reduce((s, l) => s + l.workingDays, 0);
      return {
        name: lt.name,
        code: lt.code,
        quota: lt.yearlyQuota >= 999 ? 'Unlimited' : lt.yearlyQuota,
        remaining: lt.yearlyQuota >= 999 ? 'Unlimited' : Math.max(0, lt.yearlyQuota - used),
      };
    });

    const myPayslips = currentDb.payslips
      .filter((p) => p.employeeId === user.employeeId && p.status === 'finalized')
      .sort((a, b) => b.month.localeCompare(a.month));

    employeeDashboardData = {
      todayCheckIn: myToday ? myToday.checkInTime : null,
      todayCheckOut: myToday ? myToday.checkOutTime : null,
      todayStatus: myToday ? myToday.status : 'not_checked_in',
      hoursThisWeek: Number(thisWeekHours.toFixed(1)),
      targetHours: 40,
      lateCountMonth: myLates,
      leaveBalances,
      lastPayslip: myPayslips[0] || null,
    };
  }

  res.json({
    kpis: {
      headcount,
      attritionRate,
      attendanceRate,
      presentToday,
      lateToday,
      halfDayToday,
      onLeaveToday: onLeaveTodayCount,
      pendingLeaves: currentDb.leaveRequests.filter((l) => l.status === 'pending').length,
      payrollCost: totalPayrollCost,
      avgSalary,
    },
    headcountByDept,
    absenteeismByDept,
    leaveUtilization,
    topLateComers,
    recentAuditFeed: user.role === 'admin' ? currentDb.auditLogs.slice(0, 10) : [],
    employeeDashboard: employeeDashboardData,
  });
});

// ----------------------------------------------------
// M8: AI ASSISTANT ROUTES
// ----------------------------------------------------

// Supports both /api/ai/chat and /ai/chat as per Hackathon Brief Section 4
app.post(['/api/ai/chat', '/ai/chat'], authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }
    const result = await processAIChat(message, req.user!);
    res.json(result);
  } catch (err: any) {
    console.error('AI chat endpoint error:', err);
    res.status(500).json({ error: err.message || 'Internal error processing AI query' });
  }
});

app.post('/api/ai/summarize-dashboard', authenticateToken, requireRole('admin', 'hr'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kpis } = req.body;
    if (!kpis) {
      res.status(400).json({ error: 'KPI data is required for summary.' });
      return;
    }
    const bullets = await summarizeDashboardKPIs(kpis);
    res.json({ bullets });
  } catch (err: any) {
    console.error('AI summarize error:', err);
    res.status(500).json({ error: err.message || 'Internal error summarizing dashboard' });
  }
});

app.post('/api/ai/smart-leave', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }
    const parsed = await parseSmartLeave(prompt);
    res.json(parsed);
  } catch (err: any) {
    console.error('Smart leave error:', err);
    res.status(500).json({ error: err.message || 'Internal error parsing smart leave' });
  }
});

// ----------------------------------------------------
// M9: COMMS & AUDIT LOG ROUTES
// ----------------------------------------------------

app.get('/api/comms/announcements', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  res.json(currentDb.announcements);
});

app.post('/api/comms/announcements', authenticateToken, requireRole('admin', 'hr'), (req: AuthenticatedRequest, res: Response) => {
  const { title, content, priority = 'normal' } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: 'Title and content are required.' });
    return;
  }
  const currentDb = getDb();
  const ann: Announcement = {
    id: `ann-${Date.now()}`,
    title,
    content,
    priority,
    postedBy: req.user!.id,
    postedByName: req.user!.name,
    createdAt: new Date().toISOString(),
  };
  currentDb.announcements.unshift(ann);
  saveDb();
  audit(req.user!, 'post_announcement', 'announcement', ann.id, null, ann);
  res.json(ann);
});

app.get('/api/comms/notifications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const user = req.user!;
  const notifs = currentDb.notifications.filter((n) => n.userId === user.id);
  res.json(notifs);
});

app.put('/api/comms/notifications/:id/read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  const notif = currentDb.notifications.find((n) => n.id === req.params.id && n.userId === req.user!.id);
  if (notif) {
    notif.isRead = true;
    saveDb();
  }
  res.json({ success: true });
});

app.get('/api/audit-logs', authenticateToken, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
  const currentDb = getDb();
  res.json(currentDb.auditLogs);
});

// ----------------------------------------------------
// SYSTEM RESET & SEEDING (JUDGE & DEMO HELPER)
// ----------------------------------------------------

app.post('/api/demo/reset-fresh', (req: Request, res: Response) => {
  resetDatabase(true);
  res.json({ message: 'System completely reset to fresh install state.' });
});

app.post('/api/demo/seed-hackathon', (req: Request, res: Response) => {
  const currentDb = resetDatabase(false);

  // Set company profile
  currentDb.settings.companyName = 'Saylani IT Park - HCM Lite';
  currentDb.settings.isConfigured = true;
  currentDb.settings.officeStart = '09:00';
  currentDb.settings.graceMinutes = 15;
  currentDb.settings.officeLat = 24.8607;
  currentDb.settings.officeLng = 67.0011;
  currentDb.settings.officeRadiusMeters = 250;

  // 1. Admin
  const admin: User = {
    id: 'usr-admin-1',
    name: 'Saylani Admin',
    email: 'admin@saylani.com',
    passwordHash: hashPassword('Admin@123'),
    role: 'admin',
    mustChangePassword: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  currentDb.users.push(admin);

  // 2. HR Manager
  const hrUser: User = {
    id: 'usr-hr-1',
    name: 'Ayesha Khan (HR Lead)',
    email: 'ayesha.hr@saylani.com',
    passwordHash: hashPassword('Hr@123'),
    role: 'hr',
    mustChangePassword: false,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  currentDb.users.push(hrUser);

  // 3. Employees
  const empData = [
    { name: 'Muhammad Bilal', email: 'bilal@saylani.com', dept: 'dept-1', desig: 'desig-1', basic: 120000, gender: 'male' },
    { name: 'Zainab Fatima', email: 'zainab@saylani.com', dept: 'dept-3', desig: 'desig-5', basic: 95000, gender: 'female' },
    { name: 'Hamza Tariq', email: 'hamza@saylani.com', dept: 'dept-1', desig: 'desig-2', basic: 80000, gender: 'male' },
  ];

  empData.forEach((ed, i) => {
    const empId = `emp-${i + 1}`;
    const userId = `usr-emp-${i + 1}`;
    const code = `EMP-${String(i + 1).padStart(3, '0')}`;

    const u: User = {
      id: userId,
      name: ed.name,
      email: ed.email,
      passwordHash: hashPassword('Employee@123'),
      role: 'employee',
      employeeId: empId,
      mustChangePassword: i === 0 ? false : true, // First one ready to demo
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    currentDb.users.push(u);

    const emp: Employee = {
      id: empId,
      employeeCode: code,
      name: ed.name,
      email: ed.email,
      phone: `+92 300 123456${i}`,
      address: `Block ${i + 1}, Gulshan-e-Iqbal, Karachi`,
      departmentId: ed.dept,
      designationId: ed.desig,
      joinDate: '2026-01-15',
      gender: ed.gender as any,
      status: 'active',
      basicSalary: ed.basic,
      allowanceHra: Math.round(ed.basic * 0.4),
      allowanceMedical: Math.round(ed.basic * 0.1),
      grossSalary: Math.round(ed.basic * 1.5),
      userId,
    };
    currentDb.employees.push(emp);
  });

  // Seed sample attendance for today
  const today = new Date().toISOString().split('T')[0];
  currentDb.attendance.push(
    {
      id: 'att-1',
      employeeId: 'emp-1',
      date: today,
      checkInTime: `${today}T08:55:00Z`,
      source: 'web',
      status: 'present',
    },
    {
      id: 'att-2',
      employeeId: 'emp-3',
      date: today,
      checkInTime: `${today}T09:22:00Z`,
      source: 'camera',
      status: 'late',
      distanceMeters: 45,
      faceDetected: true,
    }
  );

  // Seed sample approved leave for emp-2 (Zainab Fatima)
  currentDb.leaveRequests.push({
    id: 'leave-1',
    employeeId: 'emp-2',
    leaveTypeId: 'lt-casual',
    startDate: today,
    endDate: today,
    workingDays: 1,
    reason: "Sister's wedding ceremony",
    status: 'approved',
    hrComment: 'Approved. Enjoy the wedding!',
    reviewedBy: 'Ayesha Khan (HR Lead)',
    reviewedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  saveDb();
  audit(admin, 'seed', 'system', undefined, null, { note: 'Hackathon demo dataset loaded.' });

  res.json({
    message: 'Demo dataset loaded successfully!',
    logins: [
      { role: 'Admin', email: 'admin@saylani.com', password: 'Admin@123' },
      { role: 'HR', email: 'ayesha.hr@saylani.com', password: 'Hr@123' },
      { role: 'Employee', email: 'bilal@saylani.com', password: 'Employee@123' },
      { role: 'New Employee (Password Change)', email: 'zainab@saylani.com', password: 'Employee@123' },
    ],
  });
});

// ----------------------------------------------------
// VITE DEV & STATIC PRODUCTION SERVING
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> HCM Lite server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
