import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaceLoginScanner } from './FaceLoginScanner';
import { FaceRegistrationModal } from './FaceRegistrationModal';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  User,
  Sparkles,
  RotateCcw,
  ScanFace,
  KeyRound,
} from 'lucide-react';

export const LoginScreen: React.FC<{ onShowDeploymentGuide: () => void; onShowDemoGuide: () => void }> = ({
  onShowDeploymentGuide,
  onShowDemoGuide,
}) => {
  const { login, seedDemoData, resetToFresh } = useAuth();
  const [loginMode, setLoginMode] = useState<'password' | 'face'>('password');
  const [showFaceRegisterModal, setShowFaceRegisterModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
    setLoading(true);
    try {
      await login(userEmail, userPass);
    } catch {
      // If demo data not in DB, seed it and login
      try {
        await seedDemoData();
        await login(userEmail, userPass);
      } catch (err: any) {
        setError(err.message || 'Failed to authenticate');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        {/* Top Header Card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-lg mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            HCM Lite
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            AI-Assisted Human Capital Management · Saylani Hackathon
          </p>
        </div>

        {/* Main Login Box */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          {/* Segmented Mode Switcher */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setLoginMode('password')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                loginMode === 'password'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>Password Login</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('face')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                loginMode === 'face'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ScanFace className="w-3.5 h-3.5 text-teal-500" />
              <span>Face Login & Attendance</span>
            </button>
          </div>

          {loginMode === 'face' ? (
            <FaceLoginScanner
              onOpenRegisterModal={() => setShowFaceRegisterModal(true)}
            />
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Sign In</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Enter your credentials or choose a quick role test profile below.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-400 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@saylani.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

          {/* Judge Quick-Login Panel */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Hackathon Demo Logins
              </span>
              <button
                type="button"
                onClick={onShowDemoGuide}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                5-Min Demo Guide
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@saylani.com', 'Admin@123')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Admin
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">All controls</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ayesha.hr@saylani.com', 'Hr@123')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-bold text-xs mb-0.5">
                  <UserCheck className="w-3.5 h-3.5" /> HR Lead
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Approvals & Payroll</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('bilal@saylani.com', 'Employee@123')}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs mb-0.5">
                  <User className="w-3.5 h-3.5" /> Employee
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Self-service</div>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom utility links */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2">
          <button
            type="button"
            onClick={resetToFresh}
            className="hover:text-rose-600 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Test Fresh Install Flow
          </button>
          <button
            type="button"
            onClick={onShowDeploymentGuide}
            className="hover:text-emerald-600 font-medium transition-colors"
          >
            Deployment & Code Guide
          </button>
        </div>
      </div>

      {/* Face Registration Modal with Credential Verification */}
      <FaceRegistrationModal
        isOpen={showFaceRegisterModal}
        onClose={() => setShowFaceRegisterModal(false)}
        requireAuthCredentials={true}
      />
    </div>
  );
};
