import { useState, useEffect, useCallback } from "react";
import { api } from "../../api/client";

const TABS = ["overview", "sites", "users", "trials"];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200 px-6 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-slate-800">Admin Panel</h1>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Internal</span>
        </div>
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-medium capitalize rounded-t-lg transition-colors ${
                activeTab === tab
                  ? "bg-slate-50 text-slate-800 border border-b-0 border-slate-200 -mb-px"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "sites" && <SitesTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "trials" && <TrialsTab />}
      </div>
    </div>
  );
}

/* ── Shared ─────────────────────────────────────────────────────────────── */

function Loading() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-6 bg-slate-200 rounded w-40" />
      <div className="h-40 bg-slate-100 rounded-lg" />
    </div>
  );
}

function AddBtn({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-medium bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
    >
      + {label}
    </button>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "", required = false }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 bg-white"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder = "Select..." }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-slate-400 bg-white"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ── Overview Tab ───────────────────────────────────────────────────────── */

function OverviewTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminOverview()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return <p className="text-sm text-red-500">Failed to load overview</p>;

  const cards = [
    { label: "Organizations", value: data.organizations },
    { label: "Sites", value: data.sites },
    { label: "Active Trials", value: data.trials },
    { label: "Total Patients", value: data.patients },
    { label: "Active Users", value: data.users },
    { label: "Staff Members", value: data.staff },
    { label: "Pending Tasks", value: data.tasks_pending },
    { label: "Knowledge Entries", value: data.knowledge_entries },
    { label: "LLM Cost", value: `$${(data.llm_cost || 0).toFixed(2)}` },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{c.label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Sites Tab ──────────────────────────────────────────────────────────── */

function SitesTab() {
  const [sites, setSites] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ name: "", organization_id: "", location: "", pi_name: "" });
  const [orgForm, setOrgForm] = useState({ name: "", type: "clinical_site" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [s, o] = await Promise.all([api.adminSites(), api.adminOrganizations()]);
      setSites(s.sites || []);
      setOrgs(o.organizations || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddSite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.adminCreateSite(form);
      setForm({ name: "", organization_id: "", location: "", pi_name: "" });
      setShowAdd(false);
      fetchData();
    } catch { /* */ }
    setSubmitting(false);
  };

  const handleAddOrg = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.adminCreateOrg(orgForm);
      setOrgForm({ name: "", type: "clinical_site" });
      setShowAddOrg(false);
      fetchData();
    } catch { /* */ }
    setSubmitting(false);
  };

  if (loading) return <Loading />;

  const orgMap = Object.fromEntries(orgs.map((o) => [o.organization_id, o.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AddBtn label="Add Site" onClick={() => setShowAdd(!showAdd)} />
        <AddBtn label="Add Organization" onClick={() => setShowAddOrg(!showAddOrg)} />
      </div>

      {showAddOrg && (
        <form onSubmit={handleAddOrg} className="bg-slate-100 border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-700 mb-3">New Organization</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} required />
            <Select label="Type" value={orgForm.type} onChange={(e) => setOrgForm({ ...orgForm, type: e.target.value })} options={[
              { value: "academic_medical_center", label: "Academic Medical Center" },
              { value: "va_hospital", label: "VA Hospital" },
              { value: "community_hospital", label: "Community Hospital" },
              { value: "clinical_site", label: "Clinical Site" },
            ]} />
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" disabled={submitting || !orgForm.name} className="px-3 py-1.5 text-xs font-medium bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:opacity-50">Create</button>
            <button type="button" onClick={() => setShowAddOrg(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
        </form>
      )}

      {showAdd && (
        <form onSubmit={handleAddSite} className="bg-slate-100 border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-700 mb-3">New Site</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Stanford Clinical Trials Unit" required />
            <Select label="Organization" value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value })} options={orgs.map((o) => ({ value: o.organization_id, label: o.name }))} placeholder="Select organization..." />
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Palo Alto, CA" required />
            <Input label="PI Name" value={form.pi_name} onChange={(e) => setForm({ ...form, pi_name: e.target.value })} placeholder="e.g. Dr. Jane Smith" required />
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" disabled={submitting || !form.name || !form.organization_id} className="px-3 py-1.5 text-xs font-medium bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:opacity-50">Create Site</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
        </form>
      )}

      {/* Sites table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Organization</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Location</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">PI</th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-500">Patients</th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-500">Trials</th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-500">Staff</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr
                key={site.site_id}
                onClick={() => setExpandedId(expandedId === site.site_id ? null : site.site_id)}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-2.5 font-medium text-slate-800">{site.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{orgMap[site.organization_id] || site.organization_id}</td>
                <td className="px-4 py-2.5 text-slate-600">{site.location}</td>
                <td className="px-4 py-2.5 text-slate-600">{site.pi_name}</td>
                <td className="px-4 py-2.5 text-right text-slate-700 font-medium">{site.patient_count}</td>
                <td className="px-4 py-2.5 text-right text-slate-700">{site.trial_count}</td>
                <td className="px-4 py-2.5 text-right text-slate-700">{site.staff_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sites.length === 0 && <p className="text-center py-8 text-xs text-slate-400">No sites yet</p>}
      </div>
    </div>
  );
}

/* ── Users Tab ──────────────────────────────────────────────────────────── */

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "sponsor", label: "Sponsor" },
  { value: "crc", label: "CRC" },
  { value: "lead_crc", label: "Lead CRC" },
  { value: "site_admin", label: "Site Admin" },
  { value: "pi", label: "PI" },
];

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "crc", site_id: "", password: "cadence123" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [u, s] = await Promise.all([api.adminUsers(), api.adminSites()]);
      setUsers(u.users || []);
      setSites(s.sites || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.adminCreateUser(form);
      setForm({ email: "", name: "", role: "crc", site_id: "", password: "cadence123" });
      setShowAdd(false);
      fetchData();
    } catch { /* */ }
    setSubmitting(false);
  };

  const handleToggleActive = async (user) => {
    try {
      await api.adminUpdateUser(user.id, { active: !user.active });
      fetchData();
    } catch { /* */ }
  };

  const handleRoleChange = async (user, newRole) => {
    try {
      await api.adminUpdateUser(user.id, { role: newRole });
      fetchData();
    } catch { /* */ }
  };

  const handleDelete = async (user) => {
    try {
      await api.adminDeleteUser(user.id);
      fetchData();
    } catch { /* */ }
  };

  if (loading) return <Loading />;

  const siteMap = Object.fromEntries(sites.map((s) => [s.site_id, s.name]));

  return (
    <div className="space-y-4">
      <AddBtn label="Add User" onClick={() => setShowAdd(!showAdd)} />

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-slate-100 border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-700 mb-3">New User</p>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" required />
            <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLES} />
            <Select label="Site" value={form.site_id} onChange={(e) => setForm({ ...form, site_id: e.target.value })} options={sites.map((s) => ({ value: s.site_id, label: s.name }))} placeholder="None (global)" />
            <Input label="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" disabled={submitting || !form.email || !form.name} className="px-3 py-1.5 text-xs font-medium bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:opacity-50">Create User</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
        </form>
      )}

      {/* Users table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Email</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Role</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Site</th>
              <th className="text-center px-4 py-2.5 font-medium text-slate-500">Active</th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-slate-800">{user.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{user.email}</td>
                <td className="px-4 py-2.5">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user, e.target.value)}
                    className="text-xs px-1.5 py-0.5 border border-slate-200 rounded bg-white"
                  >
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2.5 text-slate-600">{siteMap[user.site_id] || (user.site_id ? user.site_id : "Global")}</td>
                <td className="px-4 py-2.5 text-center">
                  <button
                    onClick={() => handleToggleActive(user)}
                    className={`w-2.5 h-2.5 rounded-full inline-block ${user.active ? "bg-emerald-500" : "bg-red-400"}`}
                    title={user.active ? "Active — click to deactivate" : "Inactive — click to activate"}
                  />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => handleDelete(user)}
                    className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-center py-8 text-xs text-slate-400">No users yet</p>}
      </div>
    </div>
  );
}

/* ── Trials Tab ─────────────────────────────────────────────────────────── */

function TrialsTab() {
  const [trials, setTrials] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ name: "", phase: "Phase 3", condition: "", sponsor: "", visit_schedule: "" });
  const [enrollForm, setEnrollForm] = useState({ site_id: "", enrolled: 0 });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([api.adminTrials(), api.adminSites()]);
      setTrials(t.trials || []);
      setSites(s.sites || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddTrial = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.adminCreateTrial(form);
      setForm({ name: "", phase: "Phase 3", condition: "", sponsor: "", visit_schedule: "" });
      setShowAdd(false);
      fetchData();
    } catch { /* */ }
    setSubmitting(false);
  };

  const handleEnroll = async (trialId) => {
    if (!enrollForm.site_id) return;
    setSubmitting(true);
    try {
      await api.adminEnrollSiteTrial(enrollForm.site_id, { trial_id: trialId, enrolled: parseInt(enrollForm.enrolled) || 0 });
      setEnrollForm({ site_id: "", enrolled: 0 });
      fetchData();
    } catch { /* */ }
    setSubmitting(false);
  };

  const handleUnenroll = async (siteId, trialId) => {
    try {
      await api.adminUnenrollSiteTrial(siteId, trialId);
      fetchData();
    } catch { /* */ }
  };

  if (loading) return <Loading />;

  const siteMap = Object.fromEntries(sites.map((s) => [s.site_id, s.name]));

  return (
    <div className="space-y-4">
      <AddBtn label="Add Trial" onClick={() => setShowAdd(!showAdd)} />

      {showAdd && (
        <form onSubmit={handleAddTrial} className="bg-slate-100 border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-700 mb-3">New Trial</p>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. RESOLVE-NASH Phase 3" required />
            <Select label="Phase" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} options={[
              { value: "Phase 1", label: "Phase 1" },
              { value: "Phase 2", label: "Phase 2" },
              { value: "Phase 3", label: "Phase 3" },
              { value: "Phase 4", label: "Phase 4" },
            ]} />
            <Input label="Condition" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} placeholder="e.g. NASH" required />
            <Input label="Sponsor" value={form.sponsor} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} placeholder="e.g. Madrigal Pharmaceuticals" required />
            <div className="col-span-2">
              <Input label="Visit Schedule" value={form.visit_schedule} onChange={(e) => setForm({ ...form, visit_schedule: e.target.value })} placeholder="e.g. Every 4 weeks, biopsy at Week 24" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" disabled={submitting || !form.name || !form.condition} className="px-3 py-1.5 text-xs font-medium bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:opacity-50">Create Trial</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
        </form>
      )}

      {/* Trials table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Trial ID</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Phase</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Condition</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-500">Sponsor</th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-500">Sites</th>
              <th className="text-right px-4 py-2.5 font-medium text-slate-500">Patients</th>
            </tr>
          </thead>
          <tbody>
            {trials.map((trial) => {
              const isExpanded = expandedId === trial.trial_id;
              const enrolledSiteIds = (trial.sites || []).map((s) => s.site_id);
              const availableSites = sites.filter((s) => !enrolledSiteIds.includes(s.site_id));

              return (
                <tr key={trial.trial_id} className="border-b border-slate-100">
                  <td colSpan={7} className="p-0">
                    {/* Main row */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : trial.trial_id)}
                      className="flex items-center hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 grid grid-cols-7 text-xs">
                        <div className="px-4 py-2.5 font-mono text-slate-500">{trial.trial_id}</div>
                        <div className="px-4 py-2.5 font-medium text-slate-800">{trial.name}</div>
                        <div className="px-4 py-2.5 text-slate-600">{trial.phase}</div>
                        <div className="px-4 py-2.5 text-slate-600">{trial.condition}</div>
                        <div className="px-4 py-2.5 text-slate-600">{trial.sponsor}</div>
                        <div className="px-4 py-2.5 text-right text-slate-700">{trial.site_count}</div>
                        <div className="px-4 py-2.5 text-right text-slate-700 font-medium">{trial.patient_count}</div>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-3 bg-slate-50 border-t border-slate-100">
                        <p className="text-[10px] font-medium text-slate-500 mt-2 mb-2">Site Enrollments</p>
                        {(trial.sites || []).length > 0 ? (
                          <div className="space-y-1">
                            {trial.sites.map((enrollment) => (
                              <div key={enrollment.site_id} className="flex items-center justify-between text-xs bg-white rounded px-3 py-1.5 border border-slate-100">
                                <span className="text-slate-700">{siteMap[enrollment.site_id] || enrollment.site_id}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-400">{enrollment.enrolled} enrolled</span>
                                  <button
                                    onClick={() => handleUnenroll(enrollment.site_id, trial.trial_id)}
                                    className="text-[10px] text-red-400 hover:text-red-600"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400">No sites enrolled yet</p>
                        )}

                        {availableSites.length > 0 && (
                          <div className="flex items-end gap-2 mt-3">
                            <Select
                              label="Enroll at site"
                              value={enrollForm.site_id}
                              onChange={(e) => setEnrollForm({ ...enrollForm, site_id: e.target.value })}
                              options={availableSites.map((s) => ({ value: s.site_id, label: s.name }))}
                              placeholder="Select site..."
                            />
                            <button
                              onClick={() => handleEnroll(trial.trial_id)}
                              disabled={!enrollForm.site_id || submitting}
                              className="px-3 py-1.5 text-xs font-medium bg-slate-600 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 mb-0"
                            >
                              Enroll
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {trials.length === 0 && <p className="text-center py-8 text-xs text-slate-400">No trials yet</p>}
      </div>
    </div>
  );
}
