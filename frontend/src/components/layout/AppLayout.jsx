import { useState, useRef, useEffect, useMemo } from "react";
import { api } from "../../api/client";

const NAV_ITEMS = [
  { id: "chat", label: "Chat", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { id: "calendar", label: "Calendar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { id: "patients", label: "Patients", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { id: "protocols", label: "Protocols", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "monitoring", label: "Monitor Prep", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { id: "analytics", label: "Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: "knowledge", label: "Knowledge", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { id: "team", label: "Team", icon: "M18 21a8 8 0 00-16 0M12 11a4 4 0 100-8 4 4 0 000 8z" },
  { id: "handoff", label: "Handoff", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
];

const ADMIN_NAV_ITEM = {
  id: "admin",
  label: "Admin",
  icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
};

function NavIcon({ path }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export default function AppLayout({
  activePage,
  onNavigate,
  currentSiteId,
  sites = [],
  onSiteChange,
  isConnected,
  currentUser,
  onLogin,
  onLogout,
  children,
}) {
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const dropdownRef = useRef(null);

  const currentSite = sites.find((s) => s.site_id === currentSiteId);

  const isAdmin = currentUser && (currentUser.role === "admin" || currentUser.role === "sponsor");
  const visibleNavItems = useMemo(() => {
    return isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;
  }, [isAdmin]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSiteDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const { token, user } = await api.login(loginEmail, loginPassword);
      onLogin(token, user);
      setLoginOpen(false);
      setLoginEmail("");
      setLoginPassword("");
    } catch {
      setLoginError("Invalid credentials");
    }
    setLoginLoading(false);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800 leading-tight">Cadence</h1>
              <p className="text-[11px] text-slate-400">CRC Operating System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? item.id === "admin"
                      ? "bg-slate-100 text-slate-800 border-r-2 border-slate-600"
                      : "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <NavIcon path={item.icon} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Auth section */}
        <div className="px-4 py-3 border-t border-slate-100">
          {currentUser ? (
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.role}</p>
              </div>
              <button
                onClick={onLogout}
                className="text-[10px] text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-2"
              >
                Logout
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={() => { setLoginOpen(!loginOpen); setLoginError(""); }}
                className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
              >
                {loginOpen ? "Cancel" : "Sign in"}
              </button>
              {loginOpen && (
                <form onSubmit={handleLoginSubmit} className="mt-2 space-y-2">
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-400"
                    autoComplete="email"
                  />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-400"
                    autoComplete="current-password"
                  />
                  {loginError && <p className="text-[10px] text-red-500">{loginError}</p>}
                  <button
                    type="submit"
                    disabled={loginLoading || !loginEmail || !loginPassword}
                    className="w-full text-xs py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loginLoading ? "..." : "Sign in"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Connection status */}
        <div className="px-5 py-3 border-t border-slate-100">
          <div className={`flex items-center gap-2 text-xs ${isConnected ? "text-emerald-600" : "text-red-500"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
            {isConnected ? "API Connected" : "Disconnected"}
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-800 capitalize">
              {visibleNavItems.find((n) => n.id === activePage)?.label || activePage}
            </h2>
          </div>

          {/* Site switcher */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="max-w-[180px] truncate">{currentSite?.name || "Select site"}</span>
              <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${siteDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {siteDropdownOpen && (
              <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                {sites.map((site) => (
                  <button
                    key={site.site_id}
                    onClick={() => {
                      onSiteChange(site.site_id);
                      setSiteDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                      site.site_id === currentSiteId ? "bg-blue-50 text-blue-700" : "text-slate-700"
                    }`}
                  >
                    <div className="font-medium">{site.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{site.location} &middot; PI: {site.pi_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
