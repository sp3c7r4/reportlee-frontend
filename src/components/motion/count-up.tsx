"use client";

import { useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";

type CountUpProps = {
  value: number;
  suffix?: string;
  className?: string;
  duration?: number;
};

/** Renders the final figure on the server, then counts up on scroll. */
export function CountUp({ value, suffix = "", className, duration = 1.6 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = `${value}${suffix}`;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const counter = { n: 0 };
        gsap.to(counter, {
          n: value,
          duration,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
          onUpdate: () => {
            el.textContent = `${Math.round(counter.n)}${suffix}`;
          },
        });
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <span ref={ref} className={className}>
      {final}
    </span>
  );
}
