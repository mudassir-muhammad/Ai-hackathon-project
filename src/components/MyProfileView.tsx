import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FaceRegistrationModal } from './FaceRegistrationModal';
import {
  UserCircle,
  Phone,
  MapPin,
  Mail,
  Building,
  Briefcase,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Camera,
  ScanFace,
  Trash2,
} from 'lucide-react';

export const MyProfileView: React.FC = () => {
  const { user, employee, refreshUser } = useAuth();
  const [phone, setPhone] = useState(employee?.phone || '');
  const [address, setAddress] = useState(employee?.address || '');
  const [saving, setSaving] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [removingFace, setRemovingFace] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (employee) {
      setPhone(employee.phone || '');
      setAddress(employee.address || '');
    }
  }, [employee]);

  const handleRemoveFace = async () => {
    if (!employee || !confirm('Are you sure you want to remove your registered face profile?')) return;
    setRemovingFace(true);
    try {
      await api.removeEmployeeFace(employee.id);
      await refreshUser();
      setMessage({ text: 'Face profile removed successfully.', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to remove face profile.', type: 'error' });
    } finally {
      setRemovingFace(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setSaving(true);
    setMessage(null);
    try {
      await api.updateEmployee(employee.id, { phone, address });
      setMessage({ text: 'Personal contact details updated successfully.', type: 'success' });
      await refreshUser();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!employee) {
    return (
      <div className="p-8 text-center text-slate-400">
        No employee record associated with this account. (Admin account profile)
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <UserCircle className="w-6 h-6 text-emerald-600" />
          My Profile (Employee 360)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Rule: As an employee, you can view your official profile and edit your personal contact details (phone and address).
        </p>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
        {/* Read-Only Official Details */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Official Organization Record
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Employee Code</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">
                {employee.employeeCode}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">
                {employee.name}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Email</span>
              <span className="font-mono text-slate-900 dark:text-white mt-0.5 block truncate">
                {employee.email}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Join Date</span>
              <span className="font-mono text-slate-900 dark:text-white mt-0.5 block">
                {employee.joinDate}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Employment Status</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-xs mt-0.5 block">
                {employee.status}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Gross Salary (Yours)</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">
                PKR {employee.grossSalary.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Biometric Face Attendance Enrollment Card */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ScanFace className="w-4 h-4 text-emerald-500" />
              Biometric Face Recognition Profile
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                employee.facePhotoUrl
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
              }`}
            >
              {employee.facePhotoUrl ? 'Enrolled & Active' : 'Not Registered'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500 bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 shadow-md">
                {employee.facePhotoUrl ? (
                  <img
                    src={employee.facePhotoUrl}
                    alt={employee.name}
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />
                ) : (
                  <ScanFace className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{employee.name}</span>
                  <span className="text-[11px] font-mono font-normal text-slate-400">({employee.employeeCode})</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {employee.facePhotoUrl
                    ? `Registered on ${new Date(employee.faceRegisteredAt || '').toLocaleDateString()} · 128-Point Descriptor Active`
                    : 'No face picture registered yet. Click Capture Face Photo to enroll your picture in the portal.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              {employee.facePhotoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveFace}
                  disabled={removingFace}
                  className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-400 font-bold rounded-xl text-xs transition-all flex items-center gap-1 border border-rose-200 dark:border-rose-900"
                  title="Remove current face enrollment"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowFaceModal(true)}
                className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Camera className="w-3.5 h-3.5" />
                {employee.facePhotoUrl ? 'Update Face Photo' : 'Capture Face Photo'}
              </button>
            </div>
          </div>
        </div>

        {/* Editable Personal Contact Info */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Editable Personal Information
          </h3>

          <form onSubmit={handleUpdate} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium mb-1">Phone Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Residential Address</label>
              <div className="relative">
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Apartment, Street, Area, City"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
            >
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      </div>

      {/* Face Registration Modal */}
      <FaceRegistrationModal
        isOpen={showFaceModal}
        onClose={() => setShowFaceModal(false)}
        targetEmployee={employee}
        onSuccess={() => {
          refreshUser();
          setMessage({ text: 'Face profile updated successfully in the database!', type: 'success' });
        }}
      />
    </div>
  );
};
