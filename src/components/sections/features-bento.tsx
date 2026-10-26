"use client";

import {
  AiMagicIcon,
  Doc01Icon,
  File01Icon,
  GlobeIcon,
  Image01Icon,
  LockPasswordIcon,
  Pdf01Icon,
  Shield01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { SectionHeading } from "@/components/brand/section-heading";
import { Card, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const CHIPS = [
  { icon: AiMagicIcon, label: "AI-Powered" },
  { icon: Shield01Icon, label: "Audit Trail" },
  { icon: Doc01Icon, label: "Auto-Summaries" },
];

const WORKSPACES = [
  { monogram: "EN", active: true },
  { monogram: "PR", active: false },
  { monogram: "OP", active: false },
  { monogram: "FN", active: false },
  { monogram: "CS", active: false },
  { monogram: "LG", active: false },
  { monogram: "HR", active: false },
  { monogram: "AC", active: false },
];

const FILES = [
  { icon: Pdf01Icon, name: "Q3-summary.pdf", meta: "2.4 MB" },
  { icon: File01Icon, name: "engineering-week-41.docx", meta: "318 KB" },
  { icon: Image01Icon, name: "warehouse-audit.png", meta: "1.1 MB" },
];

const PERMISSIONS = [
  // Admins monitor and never author a Report, so they have no submit column check.
  { label: "Submit reports", values: [true, true, false] },
  { label: "Review reports", values: [false, true, true] },
  { label: "Invite members", values: [false, true, true] },
  { label: "Manage Spaces", values: [false, false, true] },
  { label: "Export audit log", values: [false, false, true] },
  { label: "Billing & seats", values: [false, false, true] },
];

const ROLES = ["Staff", "Head", "Admin"];

/* ------------------------------------------------------------------ */
/*  Animated SVG Checkmark                                             */
/* ------------------------------------------------------------------ */

function AnimatedCheck({ className }: { className?: string }) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

    const trigger = ScrollTrigger.create({
      trigger: path.closest("[data-bento-card]"),
      start: "top 80%",
      once: true,
      onEnter: () => {
        gsap.to(path, {
          strokeDashoffset: 0,
          duration: 0.45,
          ease: "power2.out",
          delay: Math.random() * 0.25,
        });
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className={cn("size-3.5 shrink-0", className)}
    >
      <path
        ref={pathRef}
        d="M3 8.5L6.5 12L13 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Card shell                                                         */
/* ------------------------------------------------------------------ */

function BentoCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card
      data-bento-card
      className={cn(
        "h-full overflow-hidden ring-0",
        "bg-surface-alt",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]",
        "transition-shadow duration-500 ease-out",
        "hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_8px_32px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      {children}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Assistant — full-width hero, horizontal on desktop              */
/* ------------------------------------------------------------------ */

function AssistantCard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const userMsg = el.querySelector("[data-user-msg]") as HTMLElement;
    const assistantMsg = el.querySelector("[data-assistant-msg]") as HTMLElement;
    const summaryRows = el.querySelectorAll("[data-summary-row]");
    const cursor = el.querySelector("[data-cursor]") as HTMLElement;

    const elements = [userMsg, assistantMsg, ...Array.from(summaryRows)];
    gsap.set(elements, { opacity: 0, y: 8 });
    if (cursor) gsap.set(cursor, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
        once: true,
      },
    });

    tl.to(userMsg, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" })
      .to(assistantMsg, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "+=0.2")
      .to(cursor, { opacity: 1, duration: 0.15 }, "-=0.1")
      .to(
        summaryRows,
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: "power2.out",
          stagger: 0.08,
        },
        "+=0.15"
      );

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <BentoCard>
      <div className="flex flex-col lg:flex-row">
        {/* Preview zone — tinted, edge-to-edge */}
        <div
          ref={containerRef}
          className="flex flex-col gap-3.5 border-b border-hairline bg-ink/[0.018] p-5 sm:p-6 lg:w-[58%] lg:shrink-0 lg:border-b-0 lg:border-r"
        >
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-lg bg-brand text-white">
              <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} className="size-3.5" />
            </span>
            <span className="font-medium text-[12px] text-ink">Reporting assistant</span>
            <span className="ml-auto rounded-4xl bg-brand-soft px-2 py-0.5 font-medium text-[10px] uppercase tracking-[0.06em] text-brand-hover">
              Drafting
            </span>
          </div>

          {/* User message */}
          <p
            data-user-msg
            className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2.5 text-[12.5px] leading-[1.55] text-white/90"
          >
            shipped the payments migration, onboarding is still flaky, need QA next week
          </p>

          {/* Assistant reply */}
          <p
            data-assistant-msg
            className="max-w-[88%] rounded-2xl rounded-bl-md border border-hairline bg-surface-alt px-3.5 py-2.5 text-[12.5px] leading-[1.55] text-ink"
          >
            Noted. Which metric moved most after the migration?
            <span
              data-cursor
              className="ml-1 inline-block h-3.5 w-[3px] translate-y-0.5 rounded-[1px] bg-brand"
              style={{ animation: "cursorBlink 1s steps(2, start) infinite" }}
            />
          </p>

          <Separator className="bg-hairline" />

          {/* Extracted fields */}
          <dl className="flex flex-col gap-2">
            {(
              [
                ["Accomplishments", "Payments v2 at 100% rollout"],
                ["Challenges", "Onboarding error rate at 1.8%"],
                ["Next plans", "QA sweep with the platform team"],
              ] as const
            ).map(([label, value]) => (
              <div key={label} data-summary-row className="flex items-start gap-2">
                <AnimatedCheck className="mt-0.5 text-brand" />
                <dt className="w-[104px] shrink-0 font-medium text-[11.5px] text-ink/55">
                  {label}
                </dt>
                <dd className="text-[11.5px] leading-[1.45] text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Text zone */}
        <div className="flex flex-col justify-center gap-3 p-5 sm:p-6 lg:px-8 lg:py-10">
          <CardTitle className="font-semibold text-[17px] tracking-[-0.02em]">
            AI Assistant
          </CardTitle>
          <p className="max-w-[38ch] text-[13.5px] leading-[1.6] text-muted-foreground">
            Draft from rough notes or ask questions in plain language. Admins get instant answers
            across every report in the workspace.
          </p>
        </div>
      </div>
    </BentoCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Multi-Tenant Workspaces                                            */
/* ------------------------------------------------------------------ */

function WorkspacesCard() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const tiles = grid.querySelectorAll("[data-tile]");
    gsap.set(tiles, { scale: 0.88, opacity: 0 });

    const trigger = ScrollTrigger.create({
      trigger: grid,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(tiles, {
          scale: 1,
          opacity: 1,
          duration: 0.35,
          ease: "power2.out",
          stagger: { amount: 0.25, from: "start" },
        });
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  return (
    <BentoCard>
      {/* Preview zone */}
      <div className="flex flex-1 flex-col gap-3 bg-ink/[0.018] p-5">
        <div ref={gridRef} className="grid grid-cols-4 gap-2">
          {WORKSPACES.map((ws) => (
            <div
              key={ws.monogram}
              data-tile
              className={cn(
                "flex h-12 flex-col items-center justify-center gap-0.5 rounded-lg",
                "transition-transform duration-300 ease-out hover:-translate-y-px",
                ws.active ? "bg-brand text-white" : "bg-ink/[0.045] text-ink/50"
              )}
            >
              <HugeiconsIcon icon={GlobeIcon} strokeWidth={2} className="size-3 opacity-70" />
              <span className="font-medium text-[10px] tracking-[0.04em]">{ws.monogram}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-surface-alt/80 px-3 py-2">
          <HugeiconsIcon icon={LockPasswordIcon} strokeWidth={2} className="size-3.5 text-ink/30" />
          <span className="text-[11px] text-ink/45">Isolated per organization</span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-ink/35">
            <span className="size-1.5 rounded-full bg-success" />
            Active
          </span>
        </div>
      </div>

      {/* Text zone */}
      <div className="flex flex-col gap-2 p-5 pt-4">
        <CardTitle className="font-semibold text-[15px] tracking-[-0.01em]">
          Multi-Tenant Workspaces
        </CardTitle>
        <p className="text-[13px] leading-[1.55] text-muted-foreground">
          Every organization gets an isolated workspace with its own Spaces, deadlines, and
          data.
        </p>
      </div>
    </BentoCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Files & Attachments                                                */
/* ------------------------------------------------------------------ */

function FilesCard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const bar = progressRef.current;
    if (!container || !bar) return;

    const rows = container.querySelectorAll("[data-file-row]");
    const uploadRow = container.querySelector("[data-upload-row]") as HTMLElement;

    gsap.set(rows, { opacity: 0, x: -6 });
    gsap.set(uploadRow, { opacity: 0 });
    gsap.set(bar, { width: "0%" });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 85%",
        once: true,
      },
    });

    tl.to(rows, {
      opacity: 1,
      x: 0,
      duration: 0.35,
      ease: "power2.out",
      stagger: 0.08,
    })
      .to(uploadRow, { opacity: 1, duration: 0.25, ease: "power2.out" }, "-=0.05")
      .to(bar, { width: "66%", duration: 1, ease: "power1.inOut" }, "-=0.1");

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <BentoCard>
      {/* Preview zone */}
      <div ref={containerRef} className="flex flex-1 flex-col gap-2 bg-ink/[0.018] p-5">
        {FILES.map((file) => (
          <div
            key={file.name}
            data-file-row
            className="flex items-center gap-3 rounded-lg bg-surface-alt/80 px-3 py-2"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-ink/[0.05] text-ink/60">
              <HugeiconsIcon icon={file.icon} strokeWidth={2} className="size-3" />
            </span>
            <span className="truncate text-[11.5px] text-ink">{file.name}</span>
            <span className="ml-auto shrink-0 text-[10px] tabular-nums text-ink/35">
              {file.meta}
            </span>
          </div>
        ))}

        <div
          data-upload-row
          className="flex items-center gap-3 rounded-lg border border-dashed border-ink/10 px-3 py-2"
        >
          <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} className="size-3.5 text-brand" />
          <span className="text-[11px] text-ink/45">Uploading appendix…</span>
          <span className="ml-auto h-1 w-14 overflow-hidden rounded-full bg-ink/[0.06]">
            <span
              ref={progressRef}
              className="block h-full rounded-full bg-brand"
              style={{ width: 0 }}
            />
          </span>
        </div>
      </div>

      {/* Text zone */}
      <div className="flex flex-col gap-2 p-5 pt-4">
        <CardTitle className="font-semibold text-[15px] tracking-[-0.01em]">
          Files & Attachments
        </CardTitle>
        <p className="text-[13px] leading-[1.55] text-muted-foreground">
          Attach PDFs, documents and images to any report. Links are short-lived and checked against
          who can open the report.
        </p>
      </div>
    </BentoCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Role-Based Access                                                  */
/* ------------------------------------------------------------------ */

const PERM_GRID = "grid grid-cols-[1fr_44px_44px_44px] items-center gap-y-1.5";

function PermissionsCard() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const rows = container.querySelectorAll("[data-perm-row]");
    gsap.set(rows, { opacity: 0, y: 3 });

    const trigger = ScrollTrigger.create({
      trigger: container,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(rows, {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          stagger: 0.05,
        });
      },
    });

    return () => {
      trigger.kill();
    };
  }, []);

  return (
    <BentoCard>
      {/* Preview zone */}
      <div ref={containerRef} className="flex flex-1 flex-col gap-2 bg-ink/[0.018] p-5">
        <div className={PERM_GRID}>
          <span />
          {ROLES.map((role) => (
            <span
              key={role}
              className="text-center font-medium text-[10px] uppercase tracking-[0.06em] text-ink/35"
            >
              {role}
            </span>
          ))}
        </div>

        <Separator className="bg-ink/[0.06]" />

        {PERMISSIONS.map((perm) => (
          <div key={perm.label} data-perm-row className={PERM_GRID}>
            <span className="text-[11.5px] text-ink/70">{perm.label}</span>
            {perm.values.map((allowed, i) => (
              <span key={`${perm.label}-${ROLES[i]}`} className="flex items-center justify-center">
                {allowed ? (
                  <AnimatedCheck className="text-brand" />
                ) : (
                  <span className="h-px w-2.5 rounded-full bg-ink/15" />
                )}
              </span>
            ))}
          </div>
        ))}

        <Separator className="bg-ink/[0.06]" />

        <p className="text-[10px] leading-[1.45] text-ink/35">
          Platform administration is internal to Reportlee and never granted to a workspace.
        </p>
      </div>

      {/* Text zone */}
      <div className="flex flex-col gap-2 p-5 pt-4">
        <CardTitle className="font-semibold text-[15px] tracking-[-0.01em]">
          Role-Based Access
        </CardTitle>
        <p className="text-[13px] leading-[1.55] text-muted-foreground">
          Staff report, Heads review their own Space, Admins monitor the whole workspace. Every
          status change is logged for audit.
        </p>
      </div>
    </BentoCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                            */
/* ------------------------------------------------------------------ */

export function FeaturesBento() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const cards = section.querySelectorAll("[data-bento-card]");
    gsap.set(cards, { opacity: 0, y: 20 });

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top 72%",
      once: true,
      onEnter: () => {
        gsap.to(cards, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "cubic-bezier(0.16, 1, 0.3, 1)",
          stagger: 0.1,
        });
      },
    });

    const chipsBar = section.querySelector("[data-chips-bar]") as HTMLElement;
    if (chipsBar) {
      gsap.set(chipsBar, { opacity: 0 });

      const chipTrigger = ScrollTrigger.create({
        trigger: chipsBar,
        start: "top 92%",
        once: true,
        onEnter: () => {
          gsap.to(chipsBar, {
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
          });
        },
      });

      return () => {
        trigger.kill();
        chipTrigger.kill();
      };
    }

    return () => {
      trigger.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="scroll-mt-28 bg-surface-muted/50 px-6 py-16 sm:py-24"
    >
      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-bento-card],
          [data-tile],
          [data-file-row],
          [data-upload-row],
          [data-perm-row],
          [data-user-msg],
          [data-assistant-msg],
          [data-summary-row],
          [data-chips-bar] {
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <SectionHeading
          align="center"
          title="Everything your team needs to report with confidence"
          description="From the first rough note to the monthly board summary, Reportlee keeps the whole cycle in one place."
        />

        <div className="flex flex-col gap-4">
          {/* Hero — AI Assistant, full width */}
          <AssistantCard />

          {/* Supporting — three columns */}
          <div className="grid gap-4 md:grid-cols-3">
            <WorkspacesCard />
            <FilesCard />
            <PermissionsCard />
          </div>

          {/* Capability markers — quiet, no container */}
          <div
            data-chips-bar
            className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5 px-4 py-3"
          >
            {CHIPS.map((chip) => (
              <span
                key={chip.label}
                className="flex items-center gap-1.5 text-[12.5px] text-ink/40"
              >
                <HugeiconsIcon icon={chip.icon} strokeWidth={2} className="size-3.5" />
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
