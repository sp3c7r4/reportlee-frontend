import type { Metadata } from "next";
import { SpaceRoute } from "@/components/people/space-screen";

export const metadata: Metadata = {
  title: "Space | Reportlee",
  description: "One Space, its Reports, its members and its KPI template.",
};

export default function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <SpaceRoute params={params} />;
}
