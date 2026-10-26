import type { Metadata } from "next";
import { AssistantScreen } from "@/components/assistant/assistant-screen";

export const metadata: Metadata = {
  title: "Assistant | Reportlee",
  description: "Ask about on-time, late, missing or decisions, counted the way Analytics counts.",
};

export default function AssistantPage() {
  return <AssistantScreen />;
}
