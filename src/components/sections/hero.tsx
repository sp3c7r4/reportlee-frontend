"use client";

import { CheckmarkCircle02Icon, PlayIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef } from "react";
import { Mosaic } from "@/components/brand/mosaic";
import { Button } from "@/components/ui/button";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";

/** Rounded-square mark that sits inline with the headline. */
function InlineMark({ icon }: { icon: typeof SparklesIcon }) {
  return (
    <span className="mx-[0.12em] inline-grid size-[0.86em] translate-y-[0.06em] place-items-center rounded-[0.26em] bg-brand align-middle sm:size-[0.9em]">
      <HugeiconsIcon icon={icon} strokeWidth={2.4} className="size-[0.46em] text-white" />
    </span>
  );
}

/** Hand-drawn swoosh that marks the headline's key word. */
function KeywordUnderline() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 16"
      className="absolute top-full left-[-3%] w-[106%] overflow-visible text-brand"
    >
      <path
        data-hero-swoosh
        d="M3 11.2C41 3.2 86 2.4 128 6.4c25 2.4 47 2.6 69-0.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

        /* 1. the report grid assembles itself */
        timeline.fromTo(
          "[data-mosaic-tile]",
          { opacity: 0, scale: 0.92, transformOrigin: "50% 50%" },
          { opacity: 1, scale: 1, duration: 0.62, stagger: { each: 0.011, from: "random" } },
          0
        );

        /* 2. the badge, then the headline rising out of its lines */
        timeline.fromTo(
          "[data-hero-badge]",
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          0.06
        );
        timeline.fromTo(
          "[data-hero-line]",
          { yPercent: 110 },
          { yPercent: 0, duration: 0.95, stagger: 0.09 },
          0.2
        );

        /* 3. the swoosh draws under the keyword */
        const swoosh = ref.current?.querySelector("[data-hero-swoosh]");
        if (swoosh instanceof SVGPathElement) {
          const length = swoosh.getTotalLength();
          timeline.fromTo(
            swoosh,
            { strokeDasharray: length, strokeDashoffset: length },
            { strokeDashoffset: 0, duration: 0.65, ease: "power2.inOut" },
            0.78
          );
        }

        /* 4. subcopy and actions */
        timeline.fromTo(
          "[data-hero-rest]",
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.62, stagger: 0.07 },
          0.88
        );

        /* 5. the grid keeps drifting as the page scrolls away */
        gsap.to("[data-mosaic-tile]", {
          y: -22,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      id="home"
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-5 pt-28 pb-16 sm:px-6 sm:pb-20"
    >
      <Mosaic />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-5 text-center sm:gap-6">
        <span
          data-hero-badge
          className="inline-flex items-center gap-2 rounded-4xl bg-surface-alt/90 py-1.5 pr-3.5 pl-1.5 shadow-card sm:gap-2.5 sm:py-2 sm:pr-4 sm:pl-2"
        >
          <span className="grid size-5.5 place-items-center rounded-full bg-brand sm:size-6">
            <HugeiconsIcon icon={SparklesIcon} strokeWidth={2.4} className="size-3 text-white" />
          </span>
          <span className="font-medium text-[12.5px] text-ink sm:text-[13.5px]">
            AI In Every Report
          </span>
        </span>

        <h1 className="text-balance font-bold text-[34px] text-ink leading-[1.06] tracking-[-0.03em] sm:text-[54px] sm:leading-[1.04] lg:text-[72px]">
          <span className="-mb-[0.22em] block overflow-hidden pb-[0.22em]">
            <span data-hero-line className="block">
              Reporting on Your Schedule
            </span>
          </span>
          <span className="-mb-[0.26em] block overflow-hidden pb-[0.26em]">
            <span data-hero-line className="block sm:whitespace-nowrap">
              <InlineMark icon={SparklesIcon} />
              Accountability at{" "}
              <span className="relative inline-block">
                Scale
                <KeywordUnderline />
              </span>
              <InlineMark icon={CheckmarkCircle02Icon} />
            </span>
          </span>
        </h1>

        <p
          data-hero-rest
          className="max-w-[33ch] text-[15px] text-muted-foreground leading-[1.6] sm:max-w-[520px] sm:text-[16px]"
        >
          One workspace to draft, review, and track every report, on the schedule your organization
          runs.
        </p>

        <div
          data-hero-rest
          className="mt-2 flex w-full flex-col items-stretch gap-2.5 sm:mt-4 sm:w-auto sm:flex-row sm:items-center sm:gap-3"
        >
          <Button className="h-[52px] w-full rounded-4xl bg-brand px-7 font-medium text-[15px] text-white transition-colors hover:bg-brand-hover sm:h-12 sm:w-auto">
            Request A Demo
          </Button>
          <Button
            variant="outline"
            className="h-[52px] w-full justify-center gap-2.5 rounded-4xl border-hairline bg-surface-alt pr-5 pl-1.5 font-medium text-[15px] text-ink transition-colors hover:bg-surface-muted sm:h-12 sm:w-auto"
          >
            <span className="grid size-9 place-items-center rounded-full bg-ink">
              <HugeiconsIcon icon={PlayIcon} strokeWidth={2.4} className="size-3.5 text-white" />
            </span>
            Watch Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
