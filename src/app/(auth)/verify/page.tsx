import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyForm } from "@/components/auth/verify-form";
import { flowConfig } from "@/lib/otp";

export const metadata: Metadata = {
  title: "Verify your email | Reportlee",
  description: "Enter the six digit code we sent you to continue.",
};

/** Typed here rather than through the generated route helper, so the file checks
 *  in a fresh clone without a dev server having produced the route types. */
type VerifyPageProps = {
  searchParams: Promise<{ flow?: string | string[]; email?: string | string[] }>;
};

/**
 * The one code screen. The flow arrives as a parameter, is looked up in the flow
 * table, and anything outside that table sends the user to sign in rather than
 * rendering a screen with nothing on it.
 */
export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = await searchParams;
  const flow = flowConfig(typeof params.flow === "string" ? params.flow : null);
  if (!flow) redirect("/login");

  const email = typeof params.email === "string" ? params.email : "";

  return <VerifyForm flow={flow} email={email} />;
}
