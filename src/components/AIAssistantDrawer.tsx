import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolUsed?: string;
  prefilledLeave?: any;
  timestamp: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  initialQuery,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when drawer is opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome: ChatMessage = {
        id: 'msg-welcome',
        sender: 'assistant',
        text: `Assalam-o-Alaikum ${user?.name || ''}! I am your HCM Lite AI Assistant.
I answer real queries from your company database using automated tool calling.
• Role active: **${user?.role?.toUpperCase()}** (answers strictly scoped to your authorized access)
• Supports English & Roman Urdu (e.g. "Meri kitni sick leave bachi hain?", "Who is on leave today?")`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([welcome]);
    }
  }, [isOpen, user]);

  // Handle passed initial query
  useEffect(() => {
    if (initialQuery && isOpen) {
      sendMessage(initialQuery);
    }
  }, [initialQuery, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen) return null;

  const sendMessage = async (textToSend: string) => {
    const q = textToSend.trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.sendAIChat(q) as any;
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'assistant',
        text: res.text,
        toolUsed: res.toolUsed,
        prefilledLeave: res.prefilledLeave,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'assistant',
        text: err.message || 'Sorry, I encountered an issue processing your request. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Hackathon Brief Suggested Test Prompts per Role
  const samplePrompts =
    user?.role === 'employee'
      ? [
          'How many sick leaves do I have left this year?',
          'What is my colleague’s salary? (Policy test)',
          'Meri kitni casual leave bachi hain?',
          'What is the office start time and grace rule?',
        ]
      : user?.role === 'hr'
      ? [
          'Who is on leave today?',
          'Who came late most often this month?',
          'What is this month’s attendance rate?',
          'How many active employees are in Engineering?',
        ]
      : [
          'What is our total active headcount?',
          'Summarize this month’s payroll and tax cost',
          'Who came late most often this month?',
          'What is the company policy on 3 late check-ins?',
        ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm flex items-center gap-1.5">
              <span>HCM Lite Assistant (M8)</span>
              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white/20 font-mono font-bold">
                {user?.role}
              </span>
            </div>
            <div className="text-[10px] text-emerald-100">Live Tool Calling & Section 3 Guardrails</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Suggested Prompts Banner */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
        <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 px-1">Try:</span>
        {samplePrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => sendMessage(p)}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-emerald-500 hover:text-emerald-600 shrink-0 transition-colors text-left"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages Viewport */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => {
          const isMe = m.sender === 'user';
          return (
            <div key={m.id} className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[85%] space-y-1`}>
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-xs shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-line">{m.text}</div>

                  {m.prefilledLeave && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await api.applyLeave({
                              leaveTypeId: 'lt-casual',
                              startDate: m.prefilledLeave.start,
                              endDate: m.prefilledLeave.end,
                              reason: m.prefilledLeave.reason,
                            });
                            const confirmMsg: ChatMessage = {
                              id: `msg-${Date.now()}-confirmed`,
                              sender: 'assistant',
                              text: `✅ **Leave Application Confirmed & Submitted!**\nYour casual leave from ${m.prefilledLeave.start} to ${m.prefilledLeave.end} has been sent to HR for review.`,
                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            };
                            setMessages((prev) => [...prev, confirmMsg]);
                          } catch (err: any) {
                            alert(err.message || 'Leave submission failed');
                          }
                        }}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm & Submit This Leave Now
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 px-1 text-[10px] text-slate-400">
                  <span>{m.timestamp}</span>
                  {!isMe && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        AI-generated
                      </span>
                    </>
                  )}
                  {m.toolUsed && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-teal-600 dark:text-teal-400 flex items-center gap-0.5">
                        <Wrench className="w-2.5 h-2.5" /> {m.toolUsed}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {isMe && (
                <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-500" />
              <span>Querying database with tools...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form onSubmit={handleFormSubmit} className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask in English or Roman Urdu..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
