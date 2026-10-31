import { LeadsScreen } from "@/components/leads/LeadsScreen";

/**
 * The internal leads list, inside the dashboard shell, a destination for Admin and
 * Staff. It reads the leads through `listLeads` and never chooses a Workspace: the real
 * guard lands with the backend. Reading the active Membership is tidiness, not access
 * control.
 */
export default function DashboardLeadsPage() {
  return <LeadsScreen />;
}
