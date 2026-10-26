import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reportlee console",
  description: "Platform support. Outside the signed-in app on purpose.",
};

/**
 * Its own layout, on purpose: no Workspace switcher, no dashboard rail, and marked in
 * code for extraction to console.reportlee.app.
 */
export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <div className="border-hairline border-b bg-surface-muted px-4 py-2 text-[12px] text-ink/70">
        Platform console · Reportlee staff only · every action is logged
      </div>
      {children}
    </div>
  );
}
