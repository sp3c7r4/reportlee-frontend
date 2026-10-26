"use client";

import { ArrowDown01Icon, Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FEATURE_LINKS } from "@/data/landing";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "#home", id: "home" },
  { label: "How It Works", href: "#how-it-works", id: "how-it-works" },
  { label: "Pricing", href: "#pricing", id: "pricing" },
  { label: "FAQ", href: "#faq", id: "faq" },
];

/** Highlights the nav item for the section currently in view. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

/**
 * The pill sits on ink, so every state is authored here rather than inherited:
 * no light hover fills, and the active item stays orange through hover.
 */
const PILL_ITEM =
  "flex h-10 items-center rounded-4xl px-4 font-medium text-[14px] whitespace-nowrap transition-colors duration-200 outline-none";

function pillClass(active: boolean) {
  return cn(
    PILL_ITEM,
    active
      ? "bg-brand text-white hover:bg-brand-hover focus-visible:bg-brand-hover"
      : "text-white/70 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white"
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection(["home", "how-it-works", "features", "pricing", "faq"]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "transition-colors duration-300",
          scrolled ? "bg-surface-alt" : "bg-transparent"
        )}
      >
        <div className="mx-auto grid h-[76px] w-full max-w-[1240px] grid-cols-[1fr_auto] items-center gap-6 px-6 lg:grid-cols-[1fr_auto_1fr]">
          <a href="#home" aria-label="Reportlee home" className="w-fit">
            <Logo />
          </a>

          <nav className="hidden lg:block" aria-label="Main">
            <ul className="m-0 flex list-none items-center gap-0.5 rounded-4xl bg-ink p-1.5">
              <li>
                <a href="#home" className={pillClass(active === "home")}>
                  Home
                </a>
              </li>

              <li>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      pillClass(active === "features"),
                      "gap-1 [&[data-open]_svg]:rotate-180"
                    )}
                  >
                    Features
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      strokeWidth={2}
                      className="size-3.5 transition-transform duration-300"
                      aria-hidden="true"
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-[360px] p-2">
                    {FEATURE_LINKS.map((feature) => (
                      <DropdownMenuItem
                        key={feature.label}
                        className="p-0"
                        render={
                          <a href={feature.href} className="flex items-start gap-3 rounded-xl p-3">
                            <span className="mt-px grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                              <HugeiconsIcon
                                icon={feature.icon}
                                strokeWidth={2}
                                className="size-4"
                              />
                            </span>
                            <span className="flex flex-col gap-0.5">
                              <span className="font-medium text-[13.5px] text-ink">
                                {feature.label}
                              </span>
                              <span className="text-[12.5px] text-muted-foreground leading-[1.4]">
                                {feature.description}
                              </span>
                            </span>
                          </a>
                        }
                      />
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>

              {NAV_LINKS.slice(1).map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={pillClass(active === link.id)}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden items-center justify-end gap-4 lg:flex">
            <Link
              href="/login"
              className="font-medium text-[14px] text-ink/70 transition-colors hover:text-ink"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className={cn(
                buttonVariants(),
                "h-11 rounded-4xl bg-ink px-5 font-medium text-[14px] text-white transition-colors hover:bg-charcoal"
              )}
            >
              Sign Up
            </Link>
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-lg" }),
                "justify-self-end lg:hidden"
              )}
            >
              <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="bg-surface-alt">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                {[{ label: "Features", href: "#features" }, ...NAV_LINKS].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-2xl px-4 py-3 font-medium text-[15px] text-ink/75 transition-colors hover:bg-surface-muted hover:text-ink"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <div className="mt-auto flex flex-col gap-2 p-6">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-4xl")}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className={cn(
                    buttonVariants(),
                    "h-11 rounded-4xl bg-ink font-medium text-white hover:bg-charcoal"
                  )}
                >
                  Sign Up
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
