import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password | Reportlee",
  description: "Choose a new password for your account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
