import {
  DribbbleIcon,
  GithubIcon,
  Linkedin01Icon,
  NewTwitterIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logo } from "@/components/brand/logo";
import { Separator } from "@/components/ui/separator";

const COLUMNS = [
  {
    title: "About",
    links: [
      { label: "Company", href: "/company" },
      { label: "Careers", href: "/careers" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "AI Assistant", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Reporting Guide", href: "/docs/reporting" },
      { label: "Help Center", href: "#faq" },
      { label: "Status", href: "/status" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Security", href: "/security" },
      { label: "Data Processing", href: "/dpa" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
  {
    title: "Help Center",
    links: [
      { label: "Getting Started", href: "/docs/getting-started" },
      { label: "Submit a Report", href: "/docs/reports" },
      { label: "Invite Members", href: "/docs/members" },
      { label: "Billing & Plans", href: "/docs/billing" },
      { label: "Contact Support", href: "/contact" },
    ],
  },
];

const SOCIALS = [
  { label: "X", icon: NewTwitterIcon, href: "https://x.com/reportlee" },
  { label: "LinkedIn", icon: Linkedin01Icon, href: "https://linkedin.com/company/reportlee" },
  { label: "GitHub", icon: GithubIcon, href: "https://github.com/reportlee" },
  { label: "Dribbble", icon: DribbbleIcon, href: "https://dribbble.com/reportlee" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Security", href: "/security" },
  { label: "Status", href: "/status" },
];

export function SiteFooter() {
  return (
    <footer className="px-6 pt-14 pb-10 sm:pt-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)]">
          <div className="flex flex-col gap-5">
            <Logo />
            <p className="max-w-xs text-[13.5px] text-muted-foreground leading-[1.6]">
              AI-native reporting and accountability for organizations that need to see the work
              clearly.
            </p>
            <a
              href="mailto:hello@reportlee.app"
              className="w-fit text-[13.5px] text-ink/70 underline-offset-4 transition-colors hover:text-brand hover:underline"
            >
              hello@reportlee.app
            </a>
          </div>

          <nav className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-4">
                <h3 className="font-medium text-[13px] text-ink">{column.title}</h3>
                <ul className="flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[13px] text-muted-foreground transition-colors hover:text-brand"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <Separator className="bg-hairline" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <p className="text-[12.5px] text-muted-foreground">
              Copyright © 2026 Reportlee. All Rights Reserved.
            </p>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-[12.5px] text-muted-foreground transition-colors hover:text-brand"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 rounded-4xl border border-hairline bg-surface-alt px-3 py-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-2 animate-status-pulse rounded-full bg-success" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span className="font-medium text-[11.5px] text-ink/70">System Operational</span>
            </span>

            <ul className="flex items-center gap-1.5">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    aria-label={social.label}
                    className="grid size-9 place-items-center rounded-4xl border border-hairline text-ink/55 transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand"
                  >
                    <HugeiconsIcon icon={social.icon} strokeWidth={1.8} className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
