import type { Metadata } from "next";
import { MembersScreen } from "@/components/people/people-screens";

export const metadata: Metadata = {
  title: "Members | Reportlee",
  description:
    "Who is in the Workspace, who is invited, and which Space they report into.",
};

export default function MembersPage() {
  return <MembersScreen />;
}
