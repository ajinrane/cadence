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
import SiteSetupWizard from "./components/onboarding/SiteSetupWizard";
import NewCRCWelcome from "./components/onboarding/NewCRCWelcome";
import TabOnboarding from "./components/onboarding/TabOnboarding";
import { TAB_ONBOARDING_CONFIGS, getDefaultPreferences } from "./components/onboarding/tabConfigs";

const AdminPanel = lazy(() => import("./components/admin/AdminPanel"));

export default function App() {
  const [activePage, setActivePage] = useState("chat");
  const [currentSiteId, setCurrentSiteId] = useState("site_columbia");
  const [sites, setSites] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  // Onboarding state
  const [userPreferences, setUserPreferences] = useState({});
  const [onboardedTabs, setOnboardedTabs] = useState([]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [showSiteSetup, setShowSiteSetup] = useState(false);
  const [showCRCWelcome, setShowCRCWelcome] = useState(false);
  const [showTabOnboarding, setShowTabOnboarding] = useState(null);

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
    } else {
      setPreferencesLoaded(true);
    }
  }, []);

  // Fetch preferences + detect wizard/welcome when user logs in
  useEffect(() => {
    if (!currentUser) {
      setPreferencesLoaded(true);
      return;
    }

    api.getPreferences()
      .then((data) => {
        setUserPreferences(data.preferences || {});
        setOnboardedTabs(data.onboarded_tabs || []);
        setPreferencesLoaded(true);

        if (data.first_login) {
          const siteId = currentUser.site_id || currentSiteId;
          api.patientRegistry({ site_id: siteId })
            .then((res) => {
              const count = res.total || 0;
              if (count === 0) {
                const done = localStorage.getItem(`cadence_site_setup_${siteId}`);
                if (!done) setShowSiteSetup(true);
              } else {
                setShowCRCWelcome(true);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        setPreferencesLoaded(true);
      });
  }, [currentUser, currentSiteId]);

  // Check for empty site when site changes (any user, not just first_login)
  useEffect(() => {
    if (!currentUser || !currentSiteId) return;
    api.patientRegistry({ site_id: currentSiteId })
      .then((res) => {
        const count = res.total || 0;
        if (count === 0) {
          const done = localStorage.getItem(`cadence_site_setup_${currentSiteId}`);
          if (!done) setShowSiteSetup(true);
        }
      })
      .catch(() => {});
  }, [currentSiteId, currentUser]);

  // Tab onboarding trigger
  useEffect(() => {
    if (!currentUser || !preferencesLoaded) return;
    if (activePage === "admin") return;
    if (showSiteSetup || showCRCWelcome) return;
    if (!TAB_ONBOARDING_CONFIGS[activePage]) return;
    if (!onboardedTabs.includes(activePage)) {
      setShowTabOnboarding(activePage);
    } else {
      setShowTabOnboarding(null);
    }
  }, [activePage, onboardedTabs, currentUser, preferencesLoaded, showSiteSetup, showCRCWelcome]);

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
    setPreferencesLoaded(false);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("cadence_token");
    setCurrentUser(null);
    setUserPreferences({});
    setOnboardedTabs([]);
    setPreferencesLoaded(false);
    setShowSiteSetup(false);
    setShowCRCWelcome(false);
    setShowTabOnboarding(null);
    setActivePage((prev) => (prev === "admin" ? "chat" : prev));
  }, []);

  const handleTabOnboardingComplete = useCallback(
    async (tabName, preferences) => {
      setShowTabOnboarding(null);
      setOnboardedTabs((prev) => [...prev, tabName]);
      if (currentUser) {
        try {
          const prefs = preferences || getDefaultPreferences(tabName);
          await api.updateTabPreferences(tabName, prefs);
          setUserPreferences((prev) => ({ ...prev, [tabName]: prefs }));
        } catch {
          // Best-effort — preferences are not critical
        }
      }
    },
    [currentUser],
  );

  const currentSite = sites.find((s) => s.site_id === currentSiteId);

  const renderPage = () => {
    switch (activePage) {
      case "chat":
        return (
          <div className="h-full">
            <CadenceChat currentSiteId={currentSiteId} onDataChange={handleDataChange} />
          </div>
        );
      case "calendar":
        return <TaskCalendar currentSiteId={currentSiteId} dataVersion={dataVersion} preferences={userPreferences.calendar} />;
      case "patients":
        return <PatientRegistry currentSiteId={currentSiteId} dataVersion={dataVersion} preferences={userPreferences.patients} />;
      case "protocols":
        return <ProtocolManager currentSiteId={currentSiteId} />;
      case "monitoring":
        return <MonitoringPrep currentSiteId={currentSiteId} preferences={userPreferences.monitoring} />;
      case "analytics":
        return <SiteAnalytics currentSiteId={currentSiteId} preferences={userPreferences.analytics} />;
      case "knowledge":
        return <KnowledgeBase currentSiteId={currentSiteId} preferences={userPreferences.knowledge} />;
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

      {/* Tab-level onboarding overlay */}
      {showTabOnboarding && TAB_ONBOARDING_CONFIGS[showTabOnboarding] && (
        <TabOnboarding
          tabName={showTabOnboarding}
          {...TAB_ONBOARDING_CONFIGS[showTabOnboarding]}
          onComplete={(prefs) => handleTabOnboardingComplete(showTabOnboarding, prefs)}
          onUseDefaults={() => handleTabOnboardingComplete(showTabOnboarding, null)}
        />
      )}

      {/* New CRC welcome overlay */}
      {showCRCWelcome && (
        <NewCRCWelcome
          siteId={currentUser?.site_id || currentSiteId}
          siteName={currentSite?.name}
          userName={currentUser?.name}
          onComplete={() => setShowCRCWelcome(false)}
          onNavigate={(page) => {
            setShowCRCWelcome(false);
            handleNavigate(page);
          }}
        />
      )}

      {/* Site setup wizard overlay (highest z-index) */}
      {showSiteSetup && (
        <SiteSetupWizard
          siteId={currentSiteId}
          siteName={currentSite?.name}
          onComplete={() => setShowSiteSetup(false)}
          onNavigate={(page) => {
            setShowSiteSetup(false);
            handleNavigate(page);
          }}
        />
      )}
    </AppLayout>
  );
}
