"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createEnvironmentClient } from "@/lib/supabase/client";
import { useEnvironmentStore } from "@/lib/stores/environmentStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const EMAIL_DOMAIN = "@kalamkidslearning.com";
const OTP_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [error, setError] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [fullEmail, setFullEmail] = React.useState("");
  const [otp, setOtp] = React.useState(Array(OTP_LENGTH).fill(""));
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const { environment, setEnvironment } = useEnvironmentStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    const email = `${username.trim()}${EMAIL_DOMAIN}`;
    setFullEmail(email);
    setLoading(true);

    try {
      const supabase = createEnvironmentClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
      });

      if (authError) throw authError;
      setSent(true);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && newOtp.every((d) => d !== "")) {
      verifyOtp(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const nextEmpty = newOtp.findIndex((d) => d === "");
    inputRefs.current[nextEmpty >= 0 ? nextEmpty : OTP_LENGTH - 1]?.focus();

    if (newOtp.every((d) => d !== "")) {
      verifyOtp(newOtp.join(""));
    }
  };

  const verifyOtp = async (token: string) => {
    setError("");
    setVerifying(true);

    try {
      const supabase = createEnvironmentClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: fullEmail,
        token,
        type: "email",
      });

      if (verifyError) throw verifyError;
      router.replace("/curricula");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    setOtp(Array(OTP_LENGTH).fill(""));

    try {
      const supabase = createEnvironmentClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: fullEmail,
      });

      if (authError) throw authError;
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Enter Verification Code</CardTitle>
            <CardDescription>
              A 6-digit code was sent to <strong>{fullEmail}</strong>
            </CardDescription>
            <p className="text-sm text-muted-foreground mt-2">
              Signing in to{" "}
              <span
                className={cn(
                  "font-semibold",
                  environment === "prod" ? "text-red-600" : "text-amber-500"
                )}
              >
                {environment.toUpperCase()}
              </span>
            </p>
          </CardHeader>
          <CardContent>
            <div
              className="flex justify-center gap-2"
              onPaste={handleOtpPaste}
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={verifying}
                  className="w-12 h-14 text-center text-2xl font-mono border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
                />
              ))}
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mt-4">
                {error}
              </div>
            )}

            {verifying && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Verifying...
              </p>
            )}

            <div className="mt-6 text-center space-y-2">
              <Button
                variant="link"
                onClick={handleResend}
                disabled={loading || verifying}
                className="text-sm"
              >
                {loading ? "Sending..." : "Resend code"}
              </Button>
              <div>
                <Button
                  variant="link"
                  onClick={() => {
                    setSent(false);
                    setOtp(Array(OTP_LENGTH).fill(""));
                    setError("");
                  }}
                  className="text-sm text-muted-foreground"
                >
                  Use a different account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Image
            src="/logo.png"
            alt="Studio"
            width={56}
            height={56}
            className="mx-auto mb-4 rounded-xl"
            priority
          />
          <CardTitle className="text-2xl">Studio</CardTitle>
          <CardDescription>Sign in to manage curriculum</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Environment Switcher */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center bg-muted rounded-lg p-1">
              <button
                type="button"
                onClick={() => setEnvironment("dev")}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-semibold transition-colors",
                  environment === "dev"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                DEV
              </button>
              <button
                type="button"
                onClick={() => setEnvironment("prod")}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-semibold transition-colors",
                  environment === "prod"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                PROD
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex items-stretch">
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  required
                  disabled={loading}
                />
                <div className="flex items-center px-3 py-2 bg-muted border border-input border-l-0 rounded-r-md">
                  <span className="text-muted-foreground text-sm whitespace-nowrap">
                    {EMAIL_DOMAIN}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your username only
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className={cn(
                "w-full",
                environment === "prod"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-primary hover:bg-primary/90"
              )}
              disabled={loading}
            >
              {loading
                ? "Sending code..."
                : `Sign in to ${environment.toUpperCase()}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
