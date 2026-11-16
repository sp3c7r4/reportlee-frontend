import type { Metadata } from "next";
import { InviteScreen } from "@/components/invite/invite-screen";

export const metadata: Metadata = {
  title: "Join a Workspace | Reportlee",
  description: "Accept your invitation to a Reportlee Workspace.",
  robots: { index: false },
};

/* @info - Same reason as onboarding: the root layout's provider is dynamic. */
export const instant = false;

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteScreen token={token} />;
}
