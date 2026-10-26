"use client";

import { type ReactNode, useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Seconds to stagger this element behind its siblings. */
  delay?: number;
  y?: number;
  /** Animate on mount instead of waiting for the element to scroll into view. */
  immediate?: boolean;
  /** "rise" for text blocks, "wipe" for media so the two never read alike. */
  variant?: "rise" | "wipe";
};

export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  immediate,
  variant = "rise",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        if (variant === "wipe") {
          gsap.fromTo(
            el,
            { clipPath: "inset(10% 10% 10% 10% round 20px)", opacity: 0.4 },
            {
              clipPath: "inset(0% 0% 0% 0% round 20px)",
              opacity: 1,
              duration: 1.1,
              ease: "power3.out",
              delay,
              ...(immediate
                ? {}
                : { scrollTrigger: { trigger: el, start: "top 82%", once: true } }),
            }
          );
          return;
        }

        gsap.fromTo(
          el,
          { y, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            delay,
            ...(immediate ? {} : { scrollTrigger: { trigger: el, start: "top 88%", once: true } }),
          }
        );
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
