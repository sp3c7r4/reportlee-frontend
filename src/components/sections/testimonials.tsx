"use client";

import { ArrowLeft01Icon, ArrowRight01Icon, StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { useState } from "react";
import { SectionHeading } from "@/components/brand/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const STARS = [0, 1, 2, 3, 4] as const;

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  avatar: string;
};

type Slide = {
  image: string;
  alt: string;
  stat: { value: string; label: string };
  testimonials: Testimonial[];
};

const SLIDES: Slide[] = [
  {
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    alt: "Operations team mapping their priorities on a whiteboard",
    stat: { value: "+38%", label: "on-time submissions" },
    testimonials: [
      {
        quote:
          "We used to chase eleven departments for updates every Friday. Reports now arrive in one format, and the AI summary tells me what changed before I open a single one.",
        name: "Amaka Obi",
        role: "Head of Operations, Meridian Group",
        avatar:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
      },
      {
        quote:
          "The assistant asks exactly the questions my line managers used to ask. A week's report takes four minutes instead of twenty, and nothing gets left out.",
        name: "Tunde Bello",
        role: "Engineering Lead, Northwind",
        avatar:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      },
    ],
  },
  {
    image:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
    alt: "Product and engineering team reviewing dashboards in an open-plan office",
    stat: { value: "4.2 days", label: "average approval turnaround" },
    testimonials: [
      {
        quote:
          "Approvals are same-day now instead of same-month. When compliance asked who signed off on a submission, the audit trail answered it in one afternoon.",
        name: "Grace Adeyemi",
        role: "Chief of Staff, Cardinal Bank",
        avatar:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
      },
      {
        quote:
          "Field teams submit with location attached only when they choose to. We finally have proof of visit without adding a single sheet of paperwork.",
        name: "Ibrahim Yusuf",
        role: "Regional Manager, Kite Logistics",
        avatar:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      },
    ],
  },
];

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  const go = (step: number) =>
    setIndex((current) => (current + step + SLIDES.length) % SLIDES.length);

  return (
    <section className="px-6 py-16 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <SectionHeading
          eyebrow="Testimonials"
          eyebrowIcon={StarIcon}
          title="Teams that report on Reportlee, in their own words"
          description="Operations, engineering, and compliance teams run their reporting rhythm on Reportlee."
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-lg"
                aria-label="Previous testimonial"
                onClick={() => go(-1)}
                className="rounded-4xl border-hairline bg-surface-alt hover:bg-surface-muted"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-lg"
                aria-label="Next testimonial"
                onClick={() => go(1)}
                className="rounded-4xl border-hairline bg-surface-alt hover:bg-surface-muted"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
              </Button>
            </div>
          }
        />

        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal className="h-full" variant="wipe">
            <div
              key={`media-${index}`}
              className="animate-in fade-in-0 slide-in-from-bottom-2 relative h-full min-h-[320px] overflow-hidden rounded-3xl duration-500 lg:min-h-[460px]"
            >
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-ink/85 px-4 py-3 backdrop-blur-md">
                <span className="font-bold text-[22px] tracking-[-0.03em] text-brand">
                  {slide.stat.value}
                </span>
                <span className="text-[13px] text-white/70">{slide.stat.label}</span>
              </div>
            </div>
          </Reveal>

          <div className="flex flex-col gap-5">
            {slide.testimonials.map((testimonial, position) => (
              <Reveal key={testimonial.name} className="h-full" delay={position * 0.06}>
                <Card
                  key={`${index}-${testimonial.name}`}
                  className="animate-in fade-in-0 h-full bg-surface-alt duration-500 ring-0"
                >
                  <CardContent className="flex h-full flex-col gap-5">
                    <div className="flex gap-0.5" role="img" aria-label="Rated 5 out of 5">
                      {STARS.map((star) => (
                        <HugeiconsIcon
                          key={star}
                          icon={StarIcon}
                          strokeWidth={1.6}
                          className="size-4 fill-brand text-brand"
                        />
                      ))}
                    </div>
                    <p className="text-[15px] leading-[1.6] text-ink/85">“{testimonial.quote}”</p>
                    <Separator className="mt-auto bg-hairline" />
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                        <AvatarFallback>
                          {testimonial.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-[14px] text-ink">{testimonial.name}</span>
                        <span className="text-[12.5px] text-muted-foreground">
                          {testimonial.role}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
