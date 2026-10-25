import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Employee } from '../types';
import {
  extractFaceDescriptorFromVideo,
  FaceExtractionResult,
} from '../utils/faceRecognition';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  ScanFace,
  RefreshCw,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface FaceRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (employee: Employee) => void;
  // If provided, register for this specific employee directly (e.g. from HR/Admin directory or self profile)
  targetEmployee?: Employee | null;
  // If true, require login credentials first (used after failed face login from login screen)
  requireAuthCredentials?: boolean;
}

export const FaceRegistrationModal: React.FC<FaceRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetEmployee,
  requireAuthCredentials = false,
}) => {
  const { user, employee: currentEmployee, refreshUser, verifyAndRegisterFace } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Flow step: 'credentials' -> 'camera' -> 'preview' -> 'success'
  const [step, setStep] = useState<'credentials' | 'camera' | 'preview' | 'success'>(
    requireAuthCredentials && !user ? 'credentials' : 'camera'
  );

  // Credentials form state (if registering before login)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Camera & Face capture state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedFace, setCapturedFace] = useState<FaceExtractionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredEmployee, setRegisteredEmployee] = useState<Employee | null>(null);

  const activeEmployee = targetEmployee || currentEmployee;

  // Initialize camera when entering camera step
  useEffect(() => {
    if (!isOpen) return;

    if (step === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, step]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
        };
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError('Webcam access was denied or is unavailable. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleVerifyCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSaving(true);
    try {
      // Test login credentials
      await api.login(email, password);
      // Success: proceed to camera capture
      setStep('camera');
    } catch (err: any) {
      setAuthError(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setSaving(false);
    }
  };

  const handleCaptureSnapshot = () => {
    setErrorMsg(null);
    if (!videoRef.current) {
      setErrorMsg('Camera video is not ready. Please wait a moment.');
      return;
    }

    const extraction = extractFaceDescriptorFromVideo(videoRef.current);
    if (!extraction) {
      setErrorMsg('Could not capture frame. Please ensure your camera is running and unobstructed.');
      return;
    }

    setCapturedFace(extraction);
    stopCamera();
    setStep('preview');
  };

  const handleRetake = () => {
    setCapturedFace(null);
    setErrorMsg(null);
    setStep('camera');
  };

  const handleSaveFaceToDatabase = async () => {
    if (!capturedFace) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      if (requireAuthCredentials && email && password) {
        // Register using verified credentials endpoint
        const res = await verifyAndRegisterFace(
          email,
          password,
          capturedFace.dataUrl,
          capturedFace.descriptor
        );
        setRegisteredEmployee(res.employee);
        setStep('success');
        if (onSuccess) onSuccess(res.employee);
      } else {
        // Logged-in user registering their own or target employee's face
        const empId = activeEmployee?.id || user?.employeeId;
        if (!empId) {
          throw new Error('No employee record found to associate with this face.');
        }

        const res = await api.registerEmployeeFace(
          empId,
          capturedFace.dataUrl,
          capturedFace.descriptor
        );

        setRegisteredEmployee(res.employee);
        await refreshUser();
        setStep('success');
        if (onSuccess) onSuccess(res.employee);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save face profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-sm">
            <div className="p-1.5 rounded-xl bg-white/20">
              <ScanFace className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="leading-tight">Register Face Profile</div>
              <div className="text-[11px] text-emerald-100 font-normal">
                {activeEmployee ? `${activeEmployee.name} (${activeEmployee.employeeCode})` : 'Biometric Face Enrollment'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* STEP 1: Verify Credentials (when coming from failed face login) */}
          {step === 'credentials' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                <span className="font-bold block mb-1">Verify Your Identity:</span>
                Please enter your login details to register your face for 1-click Face Login and Attendance.
              </div>

              {authError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyCredentials} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="bilal@saylani.com"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>Verify & Open Camera</>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: Live Camera Capture */}
          {step === 'camera' && (
            <div className="space-y-4 text-center">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Look straight at the camera. Position your face in the oval frame and click <strong>Capture Picture</strong>.
              </p>

              {cameraError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Viewfinder with face targeting oval */}
              <div className="relative w-full aspect-4/3 bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-700">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />

                {/* Face Targeting Oval Guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-60 rounded-[50%] border-2 border-dashed border-emerald-400/90 shadow-[0_0_20px_rgba(16,185,129,0.3)] relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded-full">
                      Align Face Here
                    </span>
                  </div>
                </div>

                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white text-xs gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                    <span>Opening webcam...</span>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleCaptureSnapshot}
                disabled={!cameraActive}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Camera className="w-4 h-4" /> Click Face Picture
              </button>
            </div>
          )}

          {/* STEP 3: Preview & Confirm Save */}
          {step === 'preview' && capturedFace && (
            <div className="space-y-4 text-center">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Confirm your face picture. This will be added to the database to match your face during login & attendance.
              </p>

              {/* Snapshot Preview */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-emerald-500 shadow-xl bg-slate-100 dark:bg-slate-800">
                  <img
                    src={capturedFace.dataUrl}
                    alt="Captured Face"
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                </div>
                <div className="mt-3 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>128-Point Feature Embedding Extracted</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Lighting Score: {capturedFace.brightness}/255 ({capturedFace.qualityOk ? 'Optimal' : 'Acceptable'})
                </span>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all"
                >
                  Retake Photo
                </button>
                <button
                  type="button"
                  onClick={handleSaveFaceToDatabase}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Adding to Database...
                    </>
                  ) : (
                    <>Add Picture to Database</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Registration Success */}
          {step === 'success' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Face Successfully Registered!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Face picture and biometrics have been saved in the database for{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {registeredEmployee?.name || activeEmployee?.name || user?.name}
                  </strong>
                  .
                </p>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="font-bold flex items-center justify-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Face Attendance & Login Ready
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  You can now log in and stamp your attendance simply by scanning your face at the portal!
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
