# HCM Lite — AI-Assisted Human Capital Management
### Saylani Hackathon 2026 · Challenge Brief Submission
**Venue:** Zaitoon Ashraf IT Park, Karachi  
**Team Submission Portal:** [Saylani LMS](https://lms.saylaniit.com/)

---

## 📌 Project Overview
**HCM Lite** is a full-stack, production-grade Human Capital Management system built for Admin, HR, and Employees with an integrated AI assistant powered by Gemini.

- **No pre-loaded dummy data on fresh install:** The system starts clean. Admin configures the organization, HR registers employees, and all metrics emerge organically from real user activity.
- **Role-Based Access Control (RBAC):** Server-side data scoping guards all endpoints across 3 distinct roles: **Admin**, **HR**, and **Employee**.
- **AI Assistant with Tool Calling (M8):** Uses internal tool calling (`get_headcount`, `get_attendance_summary`, `get_late_comers`, `get_leave_summary`, `get_my_leave_balance`, `get_payroll_summary`, `search_employees`), Roman Urdu comprehension, smart leave parsing, and strict privacy guardrails (politely refusing to reveal colleague salaries to employees).
- **Camera & Geofencing Attendance:** Live camera check-in with face detection and GPS Haversine distance validation against company office coordinates.

---

## 🚀 Live Demo & Quick Test Accounts
When testing or judging, you can either:
1. **Experience the Fresh Install Flow:** Start with an unconfigured database, set up your company profile and master Admin account.
2. **Use Pre-Configured Demo Accounts (1-Click Switcher in UI Navbar):**
   - **Admin:** `admin@saylani.com` / `Admin@123` (Full system governance, organization setup, payroll locking, immutable audit log)
   - **HR Lead:** `ayesha.hr@saylani.com` / `Hr@123` (Employee registrations, CSV import/export, leave approvals, monthly payroll draft)
   - **Employee:** `bilal@saylani.com` / `Employee@123` (Self-service check-in/out, smart leave, payslip PDF download)
   - **New Employee (First Sign-in Test):** `zainab@saylani.com` / `Employee@123` (Triggers mandatory temporary password change prompt)

---

## 🛠️ Tech Stack & Architecture
- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React icons, Motion
- **Backend API:** Node.js, Express, TypeScript (`server.ts`)
- **AI Engine:** Google Gemini (`@google/genai` with `gemini-3.8-flash`) via server-side tool calling
- **Authentication & Security:** JWT (JSON Web Tokens), Bcrypt password hashing, server-side data-scope guards
- **Export & Document Generation:** `jspdf` for authorized company payslip PDF generation

---

## 💻 How to Run Locally (In Under 3 Minutes)

### Prerequisites
- Node.js (version 20 or higher)
- npm or pnpm
- Git

### Step-by-Step Commands:
```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/saylani-hcm-lite.git
cd saylani-hcm-lite

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Copy .env.example to .env
cp .env.example .env

# Set your Gemini API key in .env:
# GEMINI_API_KEY="your-gemini-api-key"

# 4. Start the Full-Stack Dev Server
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🌐 How to Deploy for Free (Render / Railway)

### Deploying to Render.com:
1. Push your code to a public GitHub repository.
2. Sign in to [Render.com](https://render.com) and click **New +** -> **Web Service**.
3. Select your repository.
4. Set configurations:
   - **Environment:** Node
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start`
5. In **Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `NODE_ENV`: `production`
6. Click **Create Web Service**. Render will deploy your live full-stack app in ~2 minutes!

---

## 📋 25 Hackathon Functionalities Matrix

| # | Functionality | Admin | HR | Employee |
|---|---------------|:-----:|:--:|:--------:|
| 01 | First-run setup: company profile and Admin account | Manage | — | — |
| 02 | Login, logout, change password, role-based dashboards | Own | Own | Own |
| 03 | Company settings: office hours (09:00), grace (15m), weekend, geofence radius | Manage | View | — |
| 04 | Departments, designations, leave types/quotas, public holidays | Manage | View | — |
| 05 | Create HR logins; deactivate or reset any login | Manage | — | — |
| 06 | Register employee (creates login with temp password) | View | Manage | Own phone & address |
| 07 | Employee directory with search, filters, and Employee 360 | All | All | Own |
| 08 | CSV import with dry-run error report (row+field+reason); CSV export | — | Manage | — |
| 09 | Check in and check out on the web (one check-in per day = 409) | — | Own | Own |
| 10 | Attendance calendar and daily attendance board | All | All | Own |
| 11 | Attendance correction: request and approve | View | Approve | Request |
| 12 | Apply for or cancel leave; see balance and history | — | Own | Own |
| 13 | Approve or reject leave with comment | View | Approve | — |
| 14 | Salary structure per employee (Basic, HRA 40%, Medical 10%, Gross 1.5x) | View | Manage | — |
| 15 | Monthly payroll: create and review draft | View | Manage | — |
| 16 | Finalize payroll (permanently locks the month) | Manage | — | — |
| 17 | Payslips with PDF download | All | All | Own |
| 18 | Dashboards, KPIs, trends and insight lists with filters | Company | HR | Personal |
| 19 | AI assistant chat answering from real data with tool calling | All data | HR data | Own data |
| 20 | AI dashboard executive summary | Yes | Yes | — |
| 21 | Smart leave: type natural language sentence, get pre-filled form | — | Own | Own |
| 22 | Policy Q&A on attendance, leave and payroll rules | Yes | Yes | Yes |
| 23 | Company announcements | Post | Post | Read |
| 24 | In-app notifications (leave decisions, payslips) | Own | Own | Own |
| 25 | Audit log of create, update, approve, and finalize actions | View | — | — |

---

## ⭐ Bonus Features Implemented (+10 Points)
1. **Smart Camera & Geofencing Attendance Check-In:** Webcam capture with face detection and Haversine formula distance verification.
2. **Employee Attrition Risk Score Algorithm:** Analyzes absence patterns, punctuality anomalies, and tenure.
3. **Late Penalty Rule Automation:** 3 late check-ins (> 09:15) = 0.5 day deduction in monthly payroll.
4. **Roman Urdu Comprehension:** AI answers Roman Urdu queries like *"Meri kitni sick leave bachi hain?"* and *"Aaj kaun leave par hai?"*.
5. **Modern Dark Mode:** Seamless dark/light theme toggle.

---

## 🏆 Saylani LMS Submission Checklist
- [x] Public GitHub repository link
- [x] Working live hosted web application URL
- [x] Complete README with 5-minute judge demo script and local run guide
- [x] Secrets stored safely in hosting dashboard (only `.env.example` committed)
