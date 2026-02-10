import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Activity, Bot, Loader2, BarChart3, CalendarCheck, Network, Sparkles, Play } from 'lucide-react';
import Dashboard from './Dashboard';
import PatientDetail from './PatientDetail';
import Workflow from './Workflow';
import PitchOverview from './PitchOverview';
import CommandCenter from './components/CommandCenter';
import GuidedTour from './components/GuidedTour';
import CRCDemoMode from './components/CRCDemoMode';
import { loadAllData } from './utils/dataLoader';
import { patientIdToNodeId } from './utils/patientMapping';

const KnowledgeGraph = lazy(() => import('./KnowledgeGraph'));

export default function App() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [now, setNow] = useState(new Date());
  const [targetNodeId, setTargetNodeId] = useState(null);
  const [tourActive, setTourActive] = useState(false);
  const [crcDemoActive, setCrcDemoActive] = useState(false);
  const [kgDemoKnowledgeLoss, setKgDemoKnowledgeLoss] = useState(null);

  useEffect(() => {
    loadAllData()
      .then(setPatients)
      .catch((err) => console.error('Failed to load data:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectPatient = useCallback((id) => {
    setSelectedPatientId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = useCallback(() => {
    setSelectedPatientId(null);
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (!crcDemoActive) setSelectedPatientId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [crcDemoActive]);

  // Demo-mode tab change: doesn't clear patient (demo controls that separately)
  const handleDemoTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const handleDemoClearPatient = useCallback(() => {
    setSelectedPatientId(null);
  }, []);

  const handleStartCRCDemo = useCallback(() => {
    setSelectedPatientId(null);
    setActiveTab('overview');
    setCrcDemoActive(true);
  }, []);

  const handleStopCRCDemo = useCallback(() => {
    setCrcDemoActive(false);
    setKgDemoKnowledgeLoss(null);
  }, []);

  // Cross-tab navigation: Dashboard/Workflow/CC → Knowledge Graph
  const handleNavigateToKG = useCallback((dashboardPatientId) => {
    const nodeId = patientIdToNodeId(dashboardPatientId);
    setTargetNodeId(nodeId);
    setActiveTab('knowledgegraph');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Cross-tab navigation: KG/Workflow → Dashboard patient detail
  const handleNavigateToDashboard = useCallback((patientId) => {
    setActiveTab('dashboard');
    setSelectedPatientId(patientId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const selectedPatient = selectedPatientId
    ? patients.find((p) => p.patient_id === selectedPatientId) || null
    : null;

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F9FAFB]">
        <div className="flex items-center gap-2">
          <Loader2 size={20} className="agent-spin text-[var(--color-agent-blue)]" />
          <span className="text-sm text-gray-500">Loading patient data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b bg-white/90 border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-5">
              <button
                onClick={() => handleTabChange('overview')}
                className="flex items-center gap-2.5 cursor-pointer bg-transparent border-none"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-agent-blue)] to-[var(--color-agent-cyan)] flex items-center justify-center">
                  <Activity size={16} className="text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold font-[family-name:var(--font-display)] tracking-tight leading-none text-gray-900">
                    Cadence
                  </h1>
                  <p className="text-[9px] uppercase tracking-[0.15em] font-medium text-gray-400">
                    Autonomous CRC Operations
                  </p>
                </div>
              </button>

              {/* Tab Navigation */}
              <nav className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => handleTabChange('overview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Activity size={13} /> Overview
                </button>
                <button
                  onClick={() => handleTabChange('workflow')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    activeTab === 'workflow'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <CalendarCheck size={13} /> Workflow
                </button>
                <button
                  onClick={() => handleTabChange('dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 size={13} /> Risk Monitor
                </button>
                <button
                  onClick={() => handleTabChange('knowledgegraph')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    activeTab === 'knowledgegraph'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Network size={13} /> Knowledge Graph
                </button>
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* CRC Demo button */}
              <button
                onClick={handleStartCRCDemo}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200"
              >
                <Play size={11} className="fill-current" /> CRC Demo
              </button>
              {/* Take Tour button */}
              <button
                onClick={() => setTourActive(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors text-gray-500 hover:text-blue-600 hover:bg-blue-50"
              >
                <Sparkles size={12} /> Tour
              </button>

              {/* Agent status indicator */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-blue-50 border-blue-100">
                <Bot size={13} className="text-blue-600" />
                <span className="text-[11px] font-medium text-blue-700">
                  Agents Active
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-risk-low)] agent-pulse" />
              </div>

              {/* Date/time */}
              <div className="text-right">
                <p className="text-[11px] font-medium text-gray-700">{dateStr}</p>
                <p className="text-[10px] font-[family-name:var(--font-mono)] text-gray-400">{timeStr}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {activeTab === 'overview' ? (
        <PitchOverview onSwitchTab={handleTabChange} onStartCRCDemo={handleStartCRCDemo} />
      ) : activeTab === 'workflow' ? (
        <Workflow onNavigateToDashboard={handleNavigateToDashboard} />
      ) : activeTab === 'knowledgegraph' ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-[60vh]">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="agent-spin text-[var(--color-agent-purple)]" />
                <span className="text-xs text-gray-500">Loading Knowledge Graph...</span>
              </div>
            </div>
          }
        >
          <KnowledgeGraph
            initialNodeId={targetNodeId}
            onNavigateToDashboard={handleNavigateToDashboard}
            demoKnowledgeLoss={kgDemoKnowledgeLoss}
          />
        </Suspense>
      ) : (
        <>
          <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {selectedPatient ? (
              <PatientDetail patient={selectedPatient} onBack={handleBack} />
            ) : (
              <Dashboard
                patients={patients}
                onSelectPatient={handleSelectPatient}
                onNavigateToKG={handleNavigateToKG}
              />
            )}
          </main>

          {/* Footer (dashboard only) */}
          <footer className="border-t border-gray-200 mt-8">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-400">
                  Cadence v1.0 — Dropout Prediction Engine (AUC 0.96) + Institutional Knowledge Base
                </p>
                <p className="text-[10px] text-gray-400 font-[family-name:var(--font-mono)]">
                  Phase 1: ML Prediction + Knowledge Capture
                </p>
              </div>
            </div>
          </footer>
        </>
      )}

      {/* Bottom spacer when demo narrator bar is visible */}
      {crcDemoActive && <div className="h-48" />}

      {/* Floating Command Center — hidden during CRC demo to avoid overlap */}
      {!crcDemoActive && <CommandCenter onNavigateToKG={handleNavigateToKG} />}

      {/* Guided Tour */}
      {tourActive && (
        <GuidedTour
          onComplete={() => setTourActive(false)}
          onSwitchTab={handleTabChange}
        />
      )}

      {/* CRC Day-in-the-Life Demo */}
      <CRCDemoMode
        active={crcDemoActive}
        onClose={handleStopCRCDemo}
        onSwitchTab={handleDemoTabChange}
        onSelectPatient={handleSelectPatient}
        onClearPatient={handleDemoClearPatient}
        onSetKGKnowledgeLoss={setKgDemoKnowledgeLoss}
      />
    </div>
  );
}
