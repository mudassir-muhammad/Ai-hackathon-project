/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FirstRunSetup } from './components/FirstRunSetup';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AdminDashboard } from './components/AdminDashboard';
import { HRDashboard } from './components/HRDashboard';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { AttendanceModule } from './components/AttendanceModule';
import { LeaveModule } from './components/LeaveModule';
import { PayrollModule } from './components/PayrollModule';
import { EmployeeDirectory } from './components/EmployeeDirectory';
import { OrgSetupModule } from './components/OrgSetupModule';
import { AnnouncementsView } from './components/AnnouncementsView';
import { AuditLogView } from './components/AuditLogView';
import { MyProfileView } from './components/MyProfileView';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { CameraCheckInModal } from './components/CameraCheckInModal';
import { DemoGuideModal } from './components/DemoGuideModal';
import { DeploymentGuideModal } from './components/DeploymentGuideModal';
import { RefreshCw } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isConfigured, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [showAIDrawer, setShowAIDrawer] = useState<boolean>(false);
  const [aiInitialQuery, setAiInitialQuery] = useState<string>('');
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [showDemoGuide, setShowDemoGuide] = useState<boolean>(false);
  const [showDeploymentGuide, setShowDeploymentGuide] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // 1. Fresh Install Onboarding Wizard
  if (!isConfigured) {
    return <FirstRunSetup />;
  }

  // 2. Unauthenticated Login Screen
  if (!user) {
    return (
      <>
        <LoginScreen
          onShowDeploymentGuide={() => setShowDeploymentGuide(true)}
          onShowDemoGuide={() => setShowDemoGuide(true)}
        />
        <DemoGuideModal isOpen={showDemoGuide} onClose={() => setShowDemoGuide(false)} />
        <DeploymentGuideModal isOpen={showDeploymentGuide} onClose={() => setShowDeploymentGuide(false)} />
      </>
    );
  }

  const handleOpenAIWithPrompt = (prompt: string) => {
    setAiInitialQuery(prompt);
    setShowAIDrawer(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        if (user.role === 'admin') {
          return <AdminDashboard onOpenAIWithQuery={handleOpenAIWithPrompt} />;
        }
        if (user.role === 'hr') {
          return <HRDashboard onNavigateTab={setActiveTab} />;
        }
        return (
          <EmployeeDashboard
            onOpenCameraModal={() => setShowCameraModal(true)}
            onOpenAIWithPrompt={handleOpenAIWithPrompt}
            onNavigateTab={setActiveTab}
          />
        );

      case 'attendance':
        return <AttendanceModule onOpenCameraModal={() => setShowCameraModal(true)} />;

      case 'leaves':
        return <LeaveModule />;

      case 'payroll':
        return <PayrollModule />;

      case 'employees':
      case 'directory':
        return <EmployeeDirectory />;

      case 'org_setup':
        return <OrgSetupModule />;

      case 'announcements':
        return <AnnouncementsView />;

      case 'audit_log':
        return <AuditLogView />;

      case 'profile':
        return <MyProfileView />;

      default:
        return <AdminDashboard onOpenAIWithQuery={handleOpenAIWithPrompt} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        onShowDemoGuide={() => setShowDemoGuide(true)}
        onShowDeploymentGuide={() => setShowDeploymentGuide(true)}
        onOpenCameraModal={() => setShowCameraModal(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAI={() => {
            setAiInitialQuery('');
            setShowAIDrawer(true);
          }}
        />

        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Force Password Change on First Sign-in (Brief Requirement!) */}
      <ChangePasswordModal />

      {/* Camera & GPS Geofence Check-In Modal (Bonus Feature) */}
      <CameraCheckInModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onSuccess={() => setActiveTab('attendance')}
      />

      {/* AI Assistant Drawer (M8 Tool Calling) */}
      <AIAssistantDrawer
        isOpen={showAIDrawer}
        onClose={() => setShowAIDrawer(false)}
        initialQuery={aiInitialQuery}
      />

      {/* 5-Min Judge Demo Guide */}
      <DemoGuideModal
        isOpen={showDemoGuide}
        onClose={() => setShowDemoGuide(false)}
      />

      {/* Step-by-Step Deployment & Code Guide */}
      <DeploymentGuideModal
        isOpen={showDeploymentGuide}
        onClose={() => setShowDeploymentGuide(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
