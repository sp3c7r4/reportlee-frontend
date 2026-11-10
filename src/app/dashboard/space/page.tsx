import type { Metadata } from "next";
import { MySpaceScreen } from "@/components/people/space-screen";

export const metadata: Metadata = {
  title: "My Space | Reportlee",
  description: "The Space this Membership heads or belongs to.",
};

export default function MySpacePage() {
  return <MySpaceScreen />;
}
