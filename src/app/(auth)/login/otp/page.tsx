import type { Metadata } from "next";
import { OtpLoginForm } from "@/components/auth/otp-login-form";

export const metadata: Metadata = {
  title: "Sign in with a code | Reportlee",
  description: "We will send you a six digit code to sign in without a password.",
};

export default function OtpLoginPage() {
  return <OtpLoginForm />;
}
