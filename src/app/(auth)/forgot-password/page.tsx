import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password | Reportlee",
  description: "Request a reset code for your Reportlee account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
