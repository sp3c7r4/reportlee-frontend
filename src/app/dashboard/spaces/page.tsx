import type { Metadata } from "next";
import { SpacesScreen } from "@/components/people/people-screens";

export const metadata: Metadata = {
  title: "Spaces | Reportlee",
  description: "The groups that report, their Heads and their members.",
};

export default function SpacesPage() {
  return <SpacesScreen />;
}
