import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mosaic } from "@/components/brand/mosaic";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeadline } from "@/components/motion/split-headline";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
      <Mosaic className="opacity-70" />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="relative flex flex-col gap-10 lg:block">
          <SplitHeadline
            text="Ready to Transform Your Reporting Process?"
            className="max-w-[13ch] text-balance font-bold text-[36px] leading-[1.04] tracking-[-0.03em] sm:text-[54px] lg:text-[76px]"
          />

          <Reveal delay={0.12} className="self-end lg:absolute lg:right-0 lg:bottom-0">
            <Button
              size="icon-lg"
              aria-label="Request a demo"
              className="group/cta grid size-20 place-items-center rounded-full bg-brand text-white transition-transform duration-300 hover:scale-105 hover:bg-brand-hover sm:size-28 lg:size-40"
            >
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                strokeWidth={1.6}
                className="size-7 transition-transform duration-300 group-hover/cta:translate-x-1 group-hover/cta:-translate-y-1 lg:size-14"
              />
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
