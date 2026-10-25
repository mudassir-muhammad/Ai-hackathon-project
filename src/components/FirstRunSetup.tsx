import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Building2, ShieldCheck, Clock, MapPin, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export const FirstRunSetup: React.FC = () => {
  const { refreshUser, seedDemoData } = useAuth();
  const [companyName, setCompanyName] = useState('Saylani IT Park');
  const [adminName, setAdminName] = useState('System Admin');
  const [adminEmail, setAdminEmail] = useState('admin@saylani.com');
  const [adminPassword, setAdminPassword] = useState('Admin@123');
  const [officeStart, setOfficeStart] = useState('09:00');
  const [officeRadiusMeters, setOfficeRadiusMeters] = useState('200');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.setupSystem({
        companyName,
        adminName,
        adminEmail,
        adminPassword,
        officeStart,
        officeRadiusMeters: Number(officeRadiusMeters),
      });
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSeed = async () => {
    setLoading(true);
    setError(null);
    try {
      await seedDemoData();
    } catch (err: any) {
      setError(err.message || 'Failed to seed demo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-xs">
              Saylani Hackathon 2026
            </span>
            <span className="text-xs text-emerald-100 flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> Fresh Install Detected
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome to HCM Lite</h1>
          <p className="text-emerald-100 mt-2 text-sm max-w-lg leading-relaxed">
            AI-assisted Human Capital Management for Admin, HR, and Employees. Set up your company profile and master Admin account to start.
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-emerald-600" />
                1. Company Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    placeholder="e.g. Saylani IT Park"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Office Start Time (09:00 Rule)
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={officeStart}
                      onChange={(e) => setOfficeStart(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <Clock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Geofence Radius (meters)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={officeRadiusMeters}
                      onChange={(e) => setOfficeRadiusMeters(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      placeholder="e.g. 200"
                    />
                    <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 pt-6">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                  Coordinates preset for Zaitoon Ashraf IT Park
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                2. Master Admin Account
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Admin Name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Initializing Setup...' : 'Complete Setup & Launch'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleQuickSeed}
                disabled={loading}
                className="py-3 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                title="Loads Saylani Hackathon sample employees, attendance, leaves and HR user for quick judging"
              >
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Quick Seed Hackathon Data
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
