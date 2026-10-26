import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import { SectionHeading } from "@/components/brand/section-heading";
import { Reveal } from "@/components/motion/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

const FAQS = [
  {
    value: "ai",
    question: "How does the AI assistant help with reporting?",
    answer:
      "Drop in rough notes, bullet points, or a brain dump. The assistant asks clarifying questions, then structures everything into accomplishments, challenges, and next plans. Admins can also ask questions across the workspace in plain language, such as “How is Engineering trending?”, and get a summarised answer with links to the source reports.",
  },
  {
    value: "isolation",
    question: "Is my organization's data isolated from others?",
    answer:
      "Yes. Every record belongs to exactly one workspace, and row-level security in the database scopes every query to it, so one workspace cannot read another's reports, comments, files, or members. Reportlee operators can reach workspace data for support, under a separate database role, and every one of those actions is written to an audit log. Our terms say so in plain words.",
  },
  {
    value: "files",
    question: "Can I attach files and location to a report?",
    answer:
      "Attach PDFs, documents and images to any report or comment. Files stay private: links are short-lived and checked against who can open the report. Location tagging is off unless an Admin turns it on for the workspace, and even then it is optional on each report.",
  },
  {
    value: "review",
    question: "How do admins review and approve reports?",
    answer:
      "A Head of Space works from the review queue for their own Space. Admins see every Space, can override a Head's decision, approve or reject with a reason, and bulk-update after a deadline passes. Every status change and admin action is written to an audit trail, so you can always answer who changed what, and when.",
  },
  {
    value: "trial",
    question: "What happens when the trial ends?",
    answer:
      "A new workspace gets 30 days of Team features. After that there is a 14-day grace period, then the workspace becomes read-only: everyone can still read, and Admins can still manage members and choose a plan. Nothing is deleted. On Starter only the last 30 days of reports are shown, and older ones are kept and come back if you upgrade.",
  },
  {
    value: "mobile",
    question: "Does Reportlee work on mobile?",
    answer:
      "Yes. Submitting a report, reviewing a submission, or replying to a comment all work in any modern mobile browser, and notifications keep things moving when you are away from a desk.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-28 px-6 py-16 sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="FAQ"
            eyebrowIcon={HelpCircleIcon}
            title="Your questions, answered"
            description="Everything on reporting workflows, data isolation, and the AI assistant. Still unsure? Our team replies within a business day."
          />
          <Button className="h-11 w-fit rounded-4xl bg-ink px-6 font-medium text-white hover:bg-charcoal">
            See All FAQs
          </Button>
        </div>

        <Reveal>
          <Accordion
            defaultValue={["ai"]}
            className="gap-3 overflow-visible rounded-none border-0!"
          >
            {FAQS.map((faq) => (
              <AccordionItem
                key={faq.value}
                value={faq.value}
                className="group/faq-item rounded-2xl bg-surface-muted px-1 data-open:bg-ink! data-open:text-white"
              >
                <AccordionTrigger className="px-5 py-4.5 text-[15px] tracking-[-0.01em] hover:no-underline! aria-expanded:**:data-[slot=accordion-trigger-icon]:text-white/60! **:data-[slot=accordion-trigger-icon]:text-ink/30!">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-5 text-[13.5px] leading-[1.6] text-muted-foreground group-data-[open]/faq-item:text-white/65">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
