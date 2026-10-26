import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reportlee: AI-native reporting and accountability",
  description:
    "Reportlee turns scattered updates into structured, accountable reports. AI-assisted drafting, admin review, Space analytics, and org-scoped search in one workspace.",
  applicationName: "Reportlee",
  openGraph: {
    title: "Reportlee: AI-native reporting and accountability",
    description:
      "Structured reporting on your own schedule, with AI-assisted drafting, review workflows, and Space analytics.",
    siteName: "Reportlee",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
