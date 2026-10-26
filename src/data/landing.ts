import {
  AiMagicIcon,
  Analytics01Icon,
  CheckmarkCircle02Icon,
  ClipboardListIcon,
  File01Icon,
} from "@hugeicons/core-free-icons";

/** Feature menu items: shared by the nav dropdown and the feature grid. */
export const FEATURE_LINKS = [
  {
    label: "AI Assistant",
    description: "Draft from rough notes, query reports in plain language.",
    href: "#features",
    icon: AiMagicIcon,
  },
  {
    label: "Structured Reports",
    description: "Accomplishments, challenges, and next plans in one format.",
    href: "#how-it-works",
    icon: ClipboardListIcon,
  },
  {
    label: "Review & Approvals",
    description: "Approve, reject, or bulk-update with a full audit trail.",
    href: "#how-it-works",
    icon: CheckmarkCircle02Icon,
  },
  {
    label: "Analytics & Insights",
    description: "Space trends, KPIs, and approval turnaround.",
    href: "#features",
    icon: Analytics01Icon,
  },
  {
    label: "Files & Attachments",
    description: "PDFs, documents, and images with KPI and location data.",
    href: "#features",
    icon: File01Icon,
  },
] as const;
