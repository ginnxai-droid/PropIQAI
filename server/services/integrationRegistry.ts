export const integrationRegistry = [
  {
    provider: "MANUAL_UI",
    label: "Manual UI Intake",
    availability: "AVAILABLE",
  },
  {
    provider: "WEBSITE_FORM",
    label: "Website Form Intake",
    availability: "AVAILABLE",
  },
  {
    provider: "WEBHOOK",
    label: "Authenticated Webhook Intake",
    availability: "AVAILABLE",
  },
  {
    provider: "WHATSAPP",
    label: "WhatsApp Automation",
    availability: "NOT_AVAILABLE",
  },
  {
    provider: "TELEPHONY",
    label: "Telephony",
    availability: "NOT_AVAILABLE",
  },
  {
    provider: "META_LEAD_ADS",
    label: "Meta Lead Ads Sync",
    availability: "NOT_AVAILABLE",
  },
  {
    provider: "CRM_SYNC",
    label: "External CRM Sync",
    availability: "NOT_AVAILABLE",
  },
] as const;
