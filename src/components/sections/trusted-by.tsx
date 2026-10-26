import { Reveal } from "@/components/motion/reveal";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/** Illustrative customer names: replace with real logos before launch. */
const ORGANIZATIONS = [
  "Meridian Group",
  "Northwind",
  "Kite Logistics",
  "Lagos Health Trust",
  "Vantage Partners",
  "Atlas Foods",
  "Cardinal Bank",
  "Sunrose Energy",
  "Bluepeak",
  "Tempo Retail",
];

export function TrustedBy({ className }: { className?: string }) {
  return (
    <section className={cn("px-6 py-16 sm:py-24", className)}>
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-9">
        <Reveal className="flex flex-col items-center gap-3 text-center">
          <h2 className="font-bold text-[24px] tracking-[-0.02em] sm:text-[30px]">
            80+ Organizations Report on Reportlee
          </h2>
          <p className="max-w-xl text-[15px] text-muted-foreground leading-[1.6]">
            Teams trust Reportlee to turn scattered updates into structured, accountable work.
          </p>
        </Reveal>

        <Separator className="bg-hairline" />

        <ul className="grid w-full grid-cols-2 items-center justify-items-center gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
          {ORGANIZATIONS.map((organization) => (
            <li
              key={organization}
              className="wordmark font-semibold text-[15px] tracking-[-0.01em]"
            >
              {organization}
            </li>
          ))}
        </ul>

        <Separator className="bg-hairline" />
      </div>
    </section>
  );
}
