import { useState, useEffect, useCallback } from "react";
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

export default function App() {
  const [activePage, setActivePage] = useState("chat");
  const [currentSiteId, setCurrentSiteId] = useState("site_columbia");
  const [sites, setSites] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  // Health check + fetch sites on mount
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
    >
      {renderPage()}
    </AppLayout>
  );
}
