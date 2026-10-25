import { CompanySettings, Employee, PublicHoliday } from './db.js';

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Check if a date string is a weekend or public holiday
 */
export function isWorkingDay(
  dateStr: string,
  weekendDays: number[] = [0, 6],
  holidays: PublicHoliday[] = []
): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  if (weekendDays.includes(day)) return false;

  const isHoliday = holidays.some((h) => h.date === dateStr);
  return !isHoliday;
}

/**
 * Count working days in a date range (inclusive), skipping weekends & holidays
 */
export function countWorkingDays(
  startDateStr: string,
  endDateStr: string,
  weekendDays: number[] = [0, 6],
  holidays: PublicHoliday[] = []
): { count: number; dates: string[] } {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  const dates: string[] = [];

  let current = new Date(start);
  while (current <= end) {
    const isoDate = current.toISOString().split('T')[0];
    if (isWorkingDay(isoDate, weekendDays, holidays)) {
      dates.push(isoDate);
    }
    current.setDate(current.getDate() + 1);
  }

  return { count: dates.length, dates };
}

/**
 * Get total working days in a specific calendar month (YYYY-MM)
 */
export function getWorkingDaysInMonth(
  yearMonth: string,
  weekendDays: number[] = [0, 6],
  holidays: PublicHoliday[] = []
): number {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${yearMonth}-${dayStr}`;
    if (isWorkingDay(dateStr, weekendDays, holidays)) {
      count++;
    }
  }

  return Math.max(1, count);
}

/**
 * Determine attendance status based on office rules:
 * - Office start 09:00, grace 15 min -> late after 09:15
 */
export function evaluateCheckInStatus(
  checkInDate: Date,
  officeStart = '09:00',
  graceMinutes = 15
): 'present' | 'late' {
  const [startHour, startMin] = officeStart.split(':').map(Number);
  const checkInHour = checkInDate.getHours();
  const checkInMin = checkInDate.getMinutes();

  const officeMinutes = startHour * 60 + startMin + graceMinutes;
  const actualMinutes = checkInHour * 60 + checkInMin;

  return actualMinutes > officeMinutes ? 'late' : 'present';
}

/**
 * Calculate working hours and half-day status
 */
export function evaluateWorkingHours(
  checkInIso: string,
  checkOutIso: string,
  halfDayHours = 5
): { hours: number; isHalfDay: boolean } {
  const checkIn = new Date(checkInIso).getTime();
  const checkOut = new Date(checkOutIso).getTime();
  const hours = Math.max(0, Number(((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2)));
  return {
    hours,
    isHalfDay: hours < halfDayHours,
  };
}

/**
 * Calculate Pakistan tax slab according to Hackathon brief:
 * Annual gross = gross * 12
 * 0 to 600,000 -> 0%
 * 600,001 to 1,200,000 -> 5% of amount above 600k
 * 1,200,001 to 2,400,000 -> 30,000 + 15% of amount above 1.2M
 * 2,400,001 to 3,600,000 -> 210,000 + 25% of amount above 2.4M
 * > 3,600,000 -> 510,000 + 35% of amount above 3.6M
 */
export function calculateAnnualTax(annualGross: number): number {
  if (annualGross <= 600000) {
    return 0;
  }
  if (annualGross <= 1200000) {
    return (annualGross - 600000) * 0.05;
  }
  if (annualGross <= 2400000) {
    return 30000 + (annualGross - 1200000) * 0.15;
  }
  if (annualGross <= 3600000) {
    return 210000 + (annualGross - 2400000) * 0.25;
  }
  return 510000 + (annualGross - 3600000) * 0.35;
}

/**
 * Calculate payroll for single employee in a given month
 */
export function computeEmployeeMonthlyPayroll({
  employee,
  month,
  totalMonthWorkingDays,
  presentDays,
  lateDays,
  halfDays,
  absentDays,
  unpaidLeaveDays,
  latePenaltyEnabled,
}: {
  employee: Employee;
  month: string;
  totalMonthWorkingDays: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;
  unpaidLeaveDays: number;
  latePenaltyEnabled: boolean;
}) {
  const basicSalary = employee.basicSalary;
  const hra = Math.round(basicSalary * 0.4);
  const medical = Math.round(basicSalary * 0.1);
  let grossSalary = Math.round(basicSalary * 1.5);

  // Check proration if joined during the month
  let isProrated = false;
  const [year, m] = month.split('-').map(Number);
  const monthStart = new Date(year, m - 1, 1);
  const monthEnd = new Date(year, m, 0);

  const joinDate = new Date(employee.joinDate);
  if (joinDate > monthStart && joinDate <= monthEnd) {
    // Prorate
    isProrated = true;
    const daysEligible = Math.max(1, monthEnd.getDate() - joinDate.getDate() + 1);
    const fraction = Math.min(1, daysEligible / monthEnd.getDate());
    grossSalary = Math.round(grossSalary * fraction);
  }

  const perDayRate = grossSalary / totalMonthWorkingDays;

  // Deduct absent + unpaid + 0.5 * half_day
  const deductionDays = absentDays + unpaidLeaveDays + 0.5 * halfDays;
  const leaveDeductions = Math.round(deductionDays * perDayRate);

  // Late penalty rule: 3 lates = 0.5 day salary deduction
  let latePenaltyDeduction = 0;
  if (latePenaltyEnabled && lateDays >= 3) {
    const penaltyBlocks = Math.floor(lateDays / 3);
    latePenaltyDeduction = Math.round(penaltyBlocks * 0.5 * perDayRate);
  }

  // Tax calculation
  const annualGross = grossSalary * 12;
  const annualTax = calculateAnnualTax(annualGross);
  const monthlyTax = Math.round(annualTax / 12);

  const totalDeductions = leaveDeductions + latePenaltyDeduction + monthlyTax;
  const netSalary = Math.max(0, Math.round(grossSalary - totalDeductions));

  return {
    basicSalary,
    hra,
    medical,
    grossSalary,
    workingDays: totalMonthWorkingDays,
    presentDays,
    lateDays,
    halfDays,
    absentDays,
    unpaidLeaveDays,
    latePenaltyDeduction,
    leaveDeductions,
    taxDeduction: monthlyTax,
    netSalary,
    isProrated,
  };
}

/**
 * Attrition risk score (0 to 100) based on absence, lates, tenure, and recent trends
 */
export function calculateAttritionRisk(
  employee: Employee,
  absentCount: number,
  lateCount: number,
  leaveDaysTaken: number
): { score: number; level: 'low' | 'medium' | 'high'; factors: string[] } {
  let score = 15; // base baseline
  const factors: string[] = [];

  if (absentCount > 3) {
    score += 25;
    factors.push(`${absentCount} unexpected absences this period`);
  }
  if (lateCount >= 4) {
    score += 20;
    factors.push(`Frequent punctuality anomalies (${lateCount} late check-ins)`);
  }
  if (leaveDaysTaken > 6) {
    score += 15;
    factors.push('High concentration of leave requests');
  }

  // Tenure factor: joiners within 90 days have higher probation transition risk
  const join = new Date(employee.joinDate).getTime();
  const diffDays = (Date.now() - join) / (1000 * 3600 * 24);
  if (diffDays < 90) {
    score += 10;
    factors.push('Early tenure probation window (< 90 days)');
  }

  score = Math.min(95, Math.max(5, score));
  const level = score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';
  return { score, level, factors };
}
