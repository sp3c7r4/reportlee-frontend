import {
  AiMagicIcon,
  Analytics01Icon,
  CheckmarkCircle02Icon,
  ClipboardListIcon,
  Task01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SectionHeading } from "@/components/brand/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

const STEPS = [
  {
    icon: AiMagicIcon,
    title: "AI-Assisted Drafting",
    body: "Turn rough notes into complete, structured reports. The assistant asks the right questions.",
  },
  {
    icon: ClipboardListIcon,
    title: "Structured Reports",
    body: "Accomplishments, challenges, and next plans in one consistent format.",
  },
  {
    icon: CheckmarkCircle02Icon,
    title: "Review & Approve",
    body: "Heads review their own Space. Admins approve, reject, or bulk-update across the workspace, with a full audit trail.",
  },
  {
    icon: Analytics01Icon,
    title: "Insights & Analytics",
    body: "Space trends, KPI tracking, and approval turnaround at a glance.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-28 px-6 py-16 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14">
        <SectionHeading
          eyebrow="How It Works"
          eyebrowIcon={Task01Icon}
          title="Reporting on autopilot, accountability by design"
          description="Every submission follows the same path: draft, structure, review, learn. Reportlee owns the process so your team only owns the work."
          action={
            <Button className="h-12 rounded-4xl bg-ink px-6 font-medium text-white hover:bg-charcoal">
              Get Started
            </Button>
          }
        />

        <div className="grid gap-6 sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.06} className="h-full">
              <Card className="h-full border-0 bg-surface-muted py-8 shadow-none ring-0">
                <CardContent className="flex flex-col gap-6">
                  <span className="grid size-14 place-items-center rounded-full bg-brand text-white">
                    <HugeiconsIcon icon={step.icon} strokeWidth={2} className="size-6" />
                  </span>
                  <CardTitle className="font-semibold text-[22px] tracking-[-0.02em]">
                    {step.title}
                  </CardTitle>
                  <p className="max-w-[46ch] text-[15.5px] text-muted-foreground leading-[1.55]">
                    {step.body}
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
