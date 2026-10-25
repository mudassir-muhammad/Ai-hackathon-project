import React, { useState } from 'react';
import {
  X,
  CloudUpload,
  Terminal,
  Github,
  Globe,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Laptop,
  FolderGit2,
} from 'lucide-react';

export const DeploymentGuideModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
      <div className="max-w-3xl w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-xs">
              <CloudUpload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black">Step-by-Step Deployment & Code Guide</h2>
              <p className="text-xs text-emerald-100">
                Where to put your code, tools to play it, free hosting, and Saylani LMS submission
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* Step 1: Which tool to use to play and run your code */}
          <div className="p-5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <Laptop className="w-4 h-4" />
              <span>Step 1: Which Tool to Use to Run & Play Your Code</span>
            </div>
            <p className="leading-relaxed">
              To edit, view, and run this application on your computer:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
              <li>
                <strong>Code Editor:</strong> Install <strong>Visual Studio Code (VS Code)</strong> from{' '}
                <a href="https://code.visualstudio.com" target="_blank" rel="noreferrer" className="text-emerald-600 underline">
                  code.visualstudio.com
                </a>.
              </li>
              <li>
                <strong>Runtime Engine:</strong> Install <strong>Node.js (v20 or v22 LTS)</strong> from{' '}
                <a href="https://nodejs.org" target="_blank" rel="noreferrer" className="text-emerald-600 underline">
                  nodejs.org
                </a>.
              </li>
              <li>
                <strong>Version Control:</strong> Install <strong>Git</strong> from{' '}
                <a href="https://git-scm.com" target="_blank" rel="noreferrer" className="text-emerald-600 underline">
                  git-scm.com
                </a>.
              </li>
            </ul>

            <div className="mt-3">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">
                Commands to run in VS Code terminal:
              </span>
              <div className="relative">
                <pre className="p-3 bg-slate-950 text-emerald-300 rounded-xl font-mono text-[11px] overflow-x-auto">
{`# 1. Install all dependencies
npm install

# 2. Start the unified Full-Stack server (Express API + Vite React UI)
npm run dev`}
                </pre>
                <button
                  onClick={() => copyToClipboard('npm install && npm run dev', 'cmd-run')}
                  className="absolute right-2.5 top-2.5 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  title="Copy command"
                >
                  {copiedId === 'cmd-run' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Your browser will open automatically at <span className="font-mono text-emerald-600">http://localhost:3000</span>.
              </p>
            </div>
          </div>

          {/* Step 2: Where to put your code (GitHub) */}
          <div className="p-5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <FolderGit2 className="w-4 h-4" />
              <span>Step 2: Where to Put Your Code (GitHub Repository)</span>
            </div>
            <p className="leading-relaxed">
              Hackathon requirement: Put your code in a <strong>Public GitHub Repository</strong> so the judges can inspect your code and architecture.
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>Go to <a href="https://github.com" target="_blank" rel="noreferrer" className="text-emerald-600 underline font-semibold">GitHub.com</a> and click <strong>New Repository</strong>.</li>
              <li>Name it <span className="font-mono font-bold text-slate-900 dark:text-white">saylani-hcm-lite</span> and keep it <strong>Public</strong>.</li>
              <li>Run these terminal commands from your project root folder:</li>
            </ol>

            <div className="relative mt-2">
              <pre className="p-3 bg-slate-950 text-emerald-300 rounded-xl font-mono text-[11px] overflow-x-auto">
{`git init
git add .
git commit -m "HCM Lite - Saylani Hackathon 2026 Submission"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/saylani-hcm-lite.git
git push -u origin main`}
              </pre>
              <button
                onClick={() =>
                  copyToClipboard(
                    'git init\ngit add .\ngit commit -m "HCM Lite - Saylani Hackathon 2026 Submission"\ngit branch -M main\ngit remote add origin https://github.com/YOUR_USERNAME/saylani-hcm-lite.git\ngit push -u origin main',
                    'cmd-git'
                  )
                }
                className="absolute right-2.5 top-2.5 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                title="Copy git commands"
              >
                {copiedId === 'cmd-git' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Step 3: Where to deploy live online for free */}
          <div className="p-5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <Globe className="w-4 h-4" />
              <span>Step 3: Where to Deploy Live Online for Free</span>
            </div>
            <p className="leading-relaxed">
              Because this project is a <strong>full-stack app</strong> (Node.js Express backend API + React Vite frontend), you can deploy it for free on <strong>Render.com</strong> or <strong>Railway.app</strong> in 2 minutes:
            </p>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-xs">
                Deploying to Render (Recommended Free Option):
              </span>
              <ol className="list-decimal pl-5 space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                <li>Sign up at <a href="https://render.com" target="_blank" rel="noreferrer" className="text-emerald-600 underline font-semibold">Render.com</a> (Free tier).</li>
                <li>Click <strong>New +</strong> &rarr; <strong>Web Service</strong>.</li>
                <li>Connect your GitHub repository: <span className="font-mono">saylani-hcm-lite</span>.</li>
                <li>Configure the service:
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    <li><strong>Runtime:</strong> Node</li>
                    <li><strong>Build Command:</strong> <span className="font-mono text-emerald-600">npm run build</span></li>
                    <li><strong>Start Command:</strong> <span className="font-mono text-emerald-600">npm run start</span></li>
                  </ul>
                </li>
                <li>Under <strong>Environment Variables</strong>, add:
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    <li><span className="font-mono">GEMINI_API_KEY</span> = (your Gemini API key)</li>
                    <li><span className="font-mono">NODE_ENV</span> = <span className="font-mono">production</span></li>
                  </ul>
                </li>
                <li>Click <strong>Create Web Service</strong>. In ~1 minute your live hosted URL will be ready!</li>
              </ol>
            </div>
          </div>

          {/* Step 4: Submission on Saylani LMS */}
          <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Step 4: Submitting on Saylani LMS</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Every student logs in to their portal at <a href="https://lms.saylaniit.com/" target="_blank" rel="noreferrer" className="text-emerald-600 underline font-bold">https://lms.saylaniit.com/</a> and submits the two links:
            </p>
            <div className="space-y-1.5 text-xs font-mono bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div><strong>1. Git Repository link:</strong> https://github.com/YOUR_USERNAME/saylani-hcm-lite</div>
              <div><strong>2. Hosted (Live) project link:</strong> https://saylani-hcm-lite.onrender.com (or your AI Studio live link)</div>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              • The live web app opens in a browser and starts from first-run setup so judges can test and create companies themselves.
              <br />
              • Never commit real secrets; commit only <span className="font-mono">.env.example</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
