import { CheckmarkCircle02Icon, DollarCircleIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SectionHeading } from "@/components/brand/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Starter",
    description: "For one team testing a structured reporting rhythm.",
    price: "Free",
    period: "/forever",
    cta: "Create a workspace",
    featured: false,
    features: [
      "Up to 10 seats",
      "Scheduled reports & reviews",
      "Comment threads and tasks",
      "30-day report retention",
      "Email notifications",
    ],
  },
  {
    name: "Team",
    description: "For organizations running reporting across Spaces.",
    price: "$12",
    period: "/user, month",
    cta: "Create a workspace",
    featured: true,
    features: [
      "Unlimited seats & Spaces",
      "AI-assisted drafting & summaries",
      "Plain-language report queries",
      "Space trends & KPIs",
      "Files, KPI data & location tagging",
      "Unlimited report retention",
    ],
  },
  {
    name: "Enterprise",
    description: "For regulated teams with compliance and SSO requirements.",
    price: "$450",
    period: "/month",
    cta: "Talk to Sales",
    featured: false,
    features: [
      "Everything in Team",
      "SSO & SCIM provisioning",
      "Audit exports & retention policies",
      "Dedicated environment options",
      "Onboarding and priority SLA",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-28 bg-surface-muted/50 px-6 py-16 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14">
        <SectionHeading
          align="center"
          eyebrow="Pricing Plan"
          eyebrowIcon={DollarCircleIcon}
          title="Flexible Plans for Every Team and Budget"
          description="Start with a 30-day trial. Upgrade, downgrade, or cancel anytime."
        />

        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          {PLANS.map((plan, index) => (
            <Reveal key={plan.name} className="h-full" delay={index * 0.06}>
              <Card
                className={cn(
                  "h-full gap-0 rounded-3xl py-8 ring-0 transition-transform duration-300",
                  plan.featured
                    ? "bg-ink ring-0"
                    : "bg-surface-alt hover:-translate-y-0.5 hover:shadow-card"
                )}
              >
                <CardContent className="flex h-full flex-col gap-8">
                  <div className="flex flex-col gap-2.5">
                    <h3
                      className={cn(
                        "font-semibold text-[24px] tracking-[-0.02em]",
                        plan.featured ? "text-white" : "text-ink"
                      )}
                    >
                      {plan.name}
                    </h3>
                    <p
                      className={cn(
                        "min-h-[3.1rem] max-w-[32ch] text-[15px] leading-[1.5]",
                        plan.featured ? "text-white/60" : "text-muted-foreground"
                      )}
                    >
                      {plan.description}
                    </p>
                  </div>

                  <div className="flex items-end gap-1.5">
                    <span
                      className={cn(
                        "font-bold text-[46px] leading-[0.9] tracking-[-0.03em]",
                        plan.featured ? "text-white" : "text-ink"
                      )}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={cn(
                        "pb-1 text-[16px]",
                        plan.featured ? "text-white/60" : "text-muted-foreground"
                      )}
                    >
                      {plan.period}
                    </span>
                  </div>

                  <Button
                    className={cn(
                      "h-12 w-fit rounded-4xl px-6 font-medium text-[15px]",
                      plan.featured
                        ? "bg-brand text-white hover:bg-brand-hover"
                        : "bg-ink text-white hover:bg-charcoal"
                    )}
                  >
                    {plan.cta}
                  </Button>

                  <ul className="flex flex-col gap-4 pt-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        {plan.featured ? (
                          <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-brand">
                            <HugeiconsIcon
                              icon={Tick02Icon}
                              strokeWidth={3}
                              className="size-2.5 text-white"
                            />
                          </span>
                        ) : (
                          <HugeiconsIcon
                            icon={Tick02Icon}
                            strokeWidth={1.8}
                            className="size-[18px] shrink-0 text-ink/35"
                          />
                        )}
                        <span
                          className={cn(
                            "text-[15px] leading-[1.4]",
                            plan.featured ? "text-white/85" : "text-ink/80"
                          )}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>

        <p className="flex items-center justify-center gap-2 text-[14px] text-muted-foreground">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            strokeWidth={2}
            className="size-4 text-brand"
          />
          Every plan includes encrypted traffic, single-use OTPs, and org-scoped data isolation.
        </p>
      </div>
    </section>
  );
}
