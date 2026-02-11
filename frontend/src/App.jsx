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

export default function App() {
  const [activePage, setActivePage] = useState("chat");
  const [currentSiteId, setCurrentSiteId] = useState("site_columbia");
  const [sites, setSites] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

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

  const renderPage = () => {
    switch (activePage) {
      case "chat":
        return (
          <div className="h-full">
            <CadenceChat />
          </div>
        );
      case "calendar":
        return <TaskCalendar currentSiteId={currentSiteId} />;
      case "patients":
        return <PatientRegistry currentSiteId={currentSiteId} />;
      case "protocols":
        return <ProtocolManager currentSiteId={currentSiteId} />;
      case "monitoring":
        return <MonitoringPrep currentSiteId={currentSiteId} />;
      case "analytics":
        return <SiteAnalytics currentSiteId={currentSiteId} />;
      case "handoff":
        return <HandoffView currentSiteId={currentSiteId} />;
      default:
        return <CadenceChat />;
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
