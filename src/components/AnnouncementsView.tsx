import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Announcement } from '../types';
import { Megaphone, Plus, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export const AnnouncementsView: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await api.getAnnouncements();
      setAnnouncements(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    setMessage(null);
    try {
      await api.createAnnouncement(title, content, priority);
      setTitle('');
      setContent('');
      setShowPostModal(false);
      setMessage({ text: 'Announcement broadcasted to all employees and dashboards.', type: 'success' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-teal-600" />
            Company Announcements & Comms (M9)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Broadcast official notices, holidays, and event updates across all role portals.
          </p>
        </div>

        {user?.role !== 'employee' && (
          <button
            onClick={() => setShowPostModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 self-start"
          >
            <Plus className="w-4 h-4" /> Post Announcement
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            No announcements currently posted.
          </div>
        ) : (
          announcements.map((a) => {
            const priorityBadge =
              a.priority === 'high'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                : a.priority === 'low'
                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300';

            return (
              <div
                key={a.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{a.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${priorityBadge}`}>
                      {a.priority}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {a.content}
                </p>
                <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Published by: <span className="font-semibold text-slate-600 dark:text-slate-300">{a.postedByName}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Post Announcement */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Publish Announcement</h3>

            <form onSubmit={handlePost} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Office timings during Hackathon Week"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High (Urgent)</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Message Content</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type the full announcement body..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={posting}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {posting ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
