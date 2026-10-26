import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign up | Reportlee",
  description: "Create a Reportlee account for your team and start reporting in a structured rhythm.",
};

export default function SignupPage() {
  return <SignupForm />;
}
