import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { api } from "./api/client";
import AppLayout from "./components/layout/AppLayout";
import CadenceChat from "./components/chat/CadenceChat";
import TaskCalendar from "./components/calendar/TaskCalendar";
import PatientRegistry from "./components/patients/PatientRegistry";
import ProtocolManager from "./components/protocols/ProtocolManager";
import MonitoringPrep from "./components/monitoring/MonitoringPrep";
import SiteAnalytics from "./components/analytics/SiteAnalytics";
import HandoffView from "./components/handoff/HandoffView";
import KnowledgeBase from "./components/knowledge/KnowledgeBase";
import StaffDirectory from "./components/staff/StaffDirectory";

const AdminPanel = lazy(() => import("./components/admin/AdminPanel"));

export default function App() {
  const [activePage, setActivePage] = useState("chat");
  const [currentSiteId, setCurrentSiteId] = useState("site_columbia");
  const [sites, setSites] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  // Health check + fetch sites + restore auth session on mount
  useEffect(() => {
    api.health()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));

    api.sites()
      .then((data) => {
        const siteList = Array.isArray(data) ? data : data.sites || [];
        setSites(siteList);
      })
      .catch(() => {});

    // Restore auth session from localStorage
    const token = localStorage.getItem("cadence_token");
    if (token) {
      api.me()
        .then((user) => setCurrentUser(user))
        .catch(() => {
          localStorage.removeItem("cadence_token");
          setCurrentUser(null);
        });
    }
  }, []);

  const handleNavigate = useCallback((page) => {
    setActivePage(page);
  }, []);

  const handleSiteChange = useCallback((siteId) => {
    setCurrentSiteId(siteId);
  }, []);

  const handleDataChange = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  const handleLogin = useCallback((token, user) => {
    localStorage.setItem("cadence_token", token);
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("cadence_token");
    setCurrentUser(null);
    setActivePage((prev) => (prev === "admin" ? "chat" : prev));
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "chat":
        return (
          <div className="h-full">
            <CadenceChat currentSiteId={currentSiteId} onDataChange={handleDataChange} />
          </div>
        );
      case "calendar":
        return <TaskCalendar currentSiteId={currentSiteId} dataVersion={dataVersion} />;
      case "patients":
        return <PatientRegistry currentSiteId={currentSiteId} dataVersion={dataVersion} />;
      case "protocols":
        return <ProtocolManager currentSiteId={currentSiteId} />;
      case "monitoring":
        return <MonitoringPrep currentSiteId={currentSiteId} />;
      case "analytics":
        return <SiteAnalytics currentSiteId={currentSiteId} />;
      case "knowledge":
        return <KnowledgeBase currentSiteId={currentSiteId} />;
      case "team":
        return <StaffDirectory currentSiteId={currentSiteId} />;
      case "handoff":
        return <HandoffView currentSiteId={currentSiteId} />;
      case "admin":
        return (
          <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading admin...</div>}>
            <AdminPanel />
          </Suspense>
        );
      default:
        return <CadenceChat currentSiteId={currentSiteId} />;
    }
  };

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={handleNavigate}
      currentSiteId={currentSiteId}
      sites={sites}
      onSiteChange={handleSiteChange}
      isConnected={isConnected}
      currentUser={currentUser}
      onLogin={handleLogin}
      onLogout={handleLogout}
    >
      {renderPage()}
    </AppLayout>
  );
}
