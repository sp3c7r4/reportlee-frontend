"use client";

import { type ElementType, Fragment, useRef } from "react";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

type SplitHeadlineProps = {
  text: string;
  className?: string;
  as?: ElementType;
  delay?: number;
  /** Play on mount rather than on scroll: used by the hero. */
  immediate?: boolean;
};

/** Section headlines reveal word by word as they enter the viewport. */
export function SplitHeadline({
  text,
  className,
  as: Tag = "h2",
  delay = 0,
  immediate,
}: SplitHeadlineProps) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(" ");

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          el.querySelectorAll("[data-word]"),
          { y: "0.35em", opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.045,
            delay,
            ...(immediate
              ? {}
              : {
                  scrollTrigger: { trigger: el, start: "top 88%", once: true },
                }),
          }
        );
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <Tag ref={ref} className={cn(className)}>
      {words.map((word, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: repeated words need their position in the key
        <Fragment key={`${word}-${index}`}>
          <span data-word className="inline-block">
            {word}
          </span>
          {index < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  );
}
