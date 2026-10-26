import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Set up your workspace | Reportlee",
  description: "Name your workspace, add your first Space, and invite your team.",
};

/* @info - Block static optimization because the root layout wraps children in
   TooltipProvider, which Next considers dynamic during prerender. Onboarding
   does not benefit from instant navigation, so this is an acceptable tradeoff. */
export const instant = false;

type OnboardingPageProps = {
  searchParams: Promise<{ step?: string | string[] }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;
  const step = typeof params.step === "string" ? params.step : undefined;

  return <OnboardingFlow initialStep={step} />;
}
