import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in | Reportlee",
  description: "Sign in to your Reportlee workspace to draft, review and approve reports.",
};

export default function LoginPage() {
  return <LoginForm />;
}
