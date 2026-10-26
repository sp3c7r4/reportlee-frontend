import { UserGroupIcon } from "@hugeicons/core-free-icons";
import Image from "next/image";
import { Eyebrow } from "@/components/brand/eyebrow";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeadline } from "@/components/motion/split-headline";

const STATS = [
  { value: 1500, suffix: "+", label: "Organizations" },
  { value: 1000, suffix: "+", label: "Reports submitted" },
  { value: 100, suffix: "+", label: "Teams on paid plans" },
];

export function StatsBand() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
      {/* The map bleeds off the right edge and carries the three office cities. */}
      <Image
        src="/brand/world-dots-light.svg"
        alt=""
        aria-hidden="true"
        width={1440}
        height={560}
        unoptimized
        className="pointer-events-none absolute -right-[46%] top-[62%] w-[150%] max-w-none -translate-y-1/2 sm:-right-[24%] sm:top-[58%] sm:w-[118%] lg:-right-[12%] lg:top-[60%] lg:w-[104%]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-surface via-surface/85 to-transparent to-70% sm:via-surface/70 sm:to-85%"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-surface to-transparent"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-14 sm:gap-20">
        <div className="flex max-w-2xl flex-col gap-5">
          <Eyebrow icon={UserGroupIcon}>Who We Are</Eyebrow>
          <SplitHeadline
            text="Accountability is the key to progress."
            className="text-balance font-bold text-[34px] leading-[1.06] tracking-[-0.025em] sm:text-[46px] lg:text-[56px]"
          />
          <Reveal delay={0.08}>
            <p className="max-w-xl text-[15.5px] text-muted-foreground leading-[1.6] sm:text-[16px]">
              Arthurite Integrated Group builds Reportlee so that every organization can see what was
              done, what got in the way, and what happens next.
            </p>
          </Reveal>
        </div>

        <dl className="grid gap-10 sm:grid-cols-3 sm:gap-8 lg:ml-auto lg:max-w-[640px]">
          {STATS.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.08} className="flex flex-col gap-2.5">
              <dd className="font-bold text-[38px] leading-none tracking-[-0.03em] lg:text-[46px]">
                <CountUp value={stat.value} suffix={stat.suffix} />
              </dd>
              <dt className="text-[14px] text-muted-foreground">{stat.label}</dt>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
