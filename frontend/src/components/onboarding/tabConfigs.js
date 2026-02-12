/**
 * Per-tab onboarding configuration.
 * Each tab defines its welcome text, optional customization fields, and optional prompts.
 */

export const TAB_ONBOARDING_CONFIGS = {
  chat: {
    title: "Meet Cadence",
    description:
      "Your AI assistant. Ask about patients, risk scores, protocols, or tell it something worth remembering.",
    customizationFields: [],
    suggestedQuestions: [
      "Who are my high-risk patients?",
      "Remind me to call Maria tomorrow",
      "What's my workload this week?",
      "Help me prep for the monitoring visit",
    ],
  },

  calendar: {
    title: "Your Task Calendar",
    description:
      "Cadence auto-generates tasks from patient visit schedules and risk predictions. You can also add your own.",
    customizationFields: [
      {
        key: "default_view",
        type: "select",
        label: "Default View",
        options: [
          { value: "week", label: "Week" },
          { value: "day", label: "Day" },
        ],
        default: "week",
      },
      {
        key: "working_days",
        type: "checkbox_group",
        label: "Working Days",
        options: [
          { value: "Mon", label: "Mon" },
          { value: "Tue", label: "Tue" },
          { value: "Wed", label: "Wed" },
          { value: "Thu", label: "Thu" },
          { value: "Fri", label: "Fri" },
          { value: "Sat", label: "Sat" },
          { value: "Sun", label: "Sun" },
        ],
        default: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      },
      {
        key: "working_hours_start",
        type: "select",
        label: "Start Time",
        options: [
          { value: "6:00", label: "6:00 AM" },
          { value: "7:00", label: "7:00 AM" },
          { value: "8:00", label: "8:00 AM" },
          { value: "9:00", label: "9:00 AM" },
        ],
        default: "7:00",
      },
      {
        key: "working_hours_end",
        type: "select",
        label: "End Time",
        options: [
          { value: "16:00", label: "4:00 PM" },
          { value: "17:00", label: "5:00 PM" },
          { value: "18:00", label: "6:00 PM" },
          { value: "19:00", label: "7:00 PM" },
        ],
        default: "18:00",
      },
      {
        key: "auto_task_types",
        type: "checkbox_group",
        label: "Auto-Generate Tasks For",
        options: [
          { value: "visit", label: "Upcoming Visits" },
          { value: "call", label: "Follow-up Calls" },
          { value: "lab", label: "Lab Reviews" },
          { value: "documentation", label: "Documentation" },
          { value: "intervention", label: "Interventions" },
        ],
        default: ["visit", "call", "lab", "documentation", "intervention"],
      },
    ],
  },

  patients: {
    title: "Patient Registry",
    description:
      "Every patient across your trials in one place. Add notes, track risk, and never lose context.",
    customizationFields: [
      {
        key: "default_sort",
        type: "select",
        label: "Default Sort",
        options: [
          { value: "dropout_risk_score", label: "Risk Score (highest first)" },
          { value: "next_visit", label: "Next Visit" },
          { value: "last_contact", label: "Last Contact" },
          { value: "name", label: "Alphabetical" },
        ],
        default: "dropout_risk_score",
      },
      {
        key: "needs_contact_days",
        type: "select",
        label: '"Needs Contact" Threshold',
        options: [
          { value: 7, label: "7 days" },
          { value: 14, label: "14 days" },
          { value: 21, label: "21 days" },
          { value: 30, label: "30 days" },
        ],
        default: 14,
      },
      {
        key: "visible_columns",
        type: "checkbox_group",
        label: "Visible Columns",
        options: [
          { value: "name", label: "Name" },
          { value: "patient_id", label: "Patient ID" },
          { value: "trial", label: "Trial" },
          { value: "risk_score", label: "Risk Score" },
          { value: "status", label: "Status" },
          { value: "next_visit", label: "Next Visit" },
          { value: "last_contact", label: "Last Contact" },
          { value: "primary_crc", label: "Primary CRC" },
        ],
        default: [
          "name",
          "patient_id",
          "trial",
          "risk_score",
          "status",
          "next_visit",
          "last_contact",
          "primary_crc",
        ],
      },
    ],
  },

  protocols: {
    title: "Protocol Library",
    description:
      "Upload your trial protocols and Cadence makes them searchable. Ask Cadence questions about any protocol in the chat.",
    customizationFields: [],
    prompt: "Upload your first protocol to get started.",
  },

  monitoring: {
    title: "Monitoring Visit Prep",
    description:
      "Cadence auto-generates prep checklists before monitoring visits so you're never caught off guard.",
    customizationFields: [
      {
        key: "alert_days",
        type: "select",
        label: "Alert Days Before Visit",
        options: [
          { value: 3, label: "3 days" },
          { value: 5, label: "5 days" },
          { value: 7, label: "7 days" },
          { value: 14, label: "14 days" },
          { value: 21, label: "21 days" },
        ],
        default: 14,
      },
      {
        key: "custom_checklist_items",
        type: "text_list",
        label: "Custom Checklist Items",
        placeholder: "e.g. Temperature logs for drug storage",
        default: [],
      },
    ],
  },

  analytics: {
    title: "Site Performance",
    description:
      "Track retention, risk trends, intervention effectiveness, and team workload at a glance.",
    customizationFields: [
      {
        key: "retention_target",
        type: "number",
        label: "Retention Rate Target (%)",
        placeholder: "85",
        default: 85,
        min: 50,
        max: 100,
      },
      {
        key: "visible_cards",
        type: "checkbox_group",
        label: "Dashboard Cards",
        options: [
          { value: "retention_rate", label: "Retention Rate" },
          { value: "patients_at_risk", label: "Patients at Risk" },
          { value: "query_resolution", label: "Query Resolution" },
          { value: "interventions", label: "Interventions" },
          { value: "monitoring_readiness", label: "Monitoring Readiness" },
        ],
        default: [
          "retention_rate",
          "patients_at_risk",
          "query_resolution",
          "interventions",
          "monitoring_readiness",
        ],
      },
    ],
  },

  handoff: {
    title: "CRC Handoff",
    description:
      "When a new team member joins, Cadence generates a complete briefing from everything your team has built. No more lost knowledge.",
    customizationFields: [],
  },

  knowledge: {
    title: "Knowledge Base",
    description:
      "Cadence ships with clinical trial fundamentals. Your site's unique knowledge grows as your team uses the product.",
    customizationFields: [
      {
        key: "priority_categories",
        type: "checkbox_group",
        label: "Priority Categories",
        options: [
          { value: "retention_strategy", label: "Retention Strategies" },
          { value: "workflow", label: "Workflows" },
          { value: "protocol_tip", label: "Protocol Tips" },
          { value: "patient_communication", label: "Patient Communication" },
          { value: "regulatory", label: "Regulatory" },
          { value: "logistics", label: "Logistics" },
          { value: "onboarding", label: "Site-Specific" },
        ],
        default: [
          "retention_strategy",
          "workflow",
          "protocol_tip",
          "patient_communication",
          "regulatory",
          "logistics",
          "onboarding",
        ],
      },
    ],
    prompt: "Add your first site tip \u2014 what's something every CRC at your site should know?",
  },

  team: {
    title: "Your Team",
    description:
      "See who's handling what. Track workload and reassign patients or tasks as needed.",
    customizationFields: [],
  },
};

/**
 * Extract default preference values from a tab config.
 */
export function getDefaultPreferences(tabName) {
  const config = TAB_ONBOARDING_CONFIGS[tabName];
  if (!config?.customizationFields?.length) return {};
  const defaults = {};
  config.customizationFields.forEach((field) => {
    defaults[field.key] = field.default;
  });
  return defaults;
}
