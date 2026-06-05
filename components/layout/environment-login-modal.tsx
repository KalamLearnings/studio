"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getClientForEnv } from "@/lib/supabase/client";
import type { Environment } from "@/lib/stores/environmentStore";

const EMAIL_DOMAIN = "@kalamkidslearning.com";
const OTP_LENGTH = 6;

interface EnvironmentLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetEnvironment: Environment;
  currentUserEmail?: string;
  onSuccess: () => void;
}

export function EnvironmentLoginModal({
  open,
  onOpenChange,
  targetEnvironment,
  currentUserEmail,
  onSuccess,
}: EnvironmentLoginModalProps) {
  const [username, setUsername] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [otpSent, setOtpSent] = React.useState(false);
  const [error, setError] = React.useState("");
  const [otp, setOtp] = React.useState(Array(OTP_LENGTH).fill(""));
  const [verifying, setVerifying] = React.useState(false);

  const otpRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Pre-fill username from current user email
  React.useEffect(() => {
    if (open && currentUserEmail) {
      const extractedUsername = currentUserEmail.replace(EMAIL_DOMAIN, "");
      setUsername(extractedUsername);
    }
  }, [open, currentUserEmail]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setOtpSent(false);
      setError("");
      setOtp(Array(OTP_LENGTH).fill(""));
      setLoading(false);
      setVerifying(false);
    }
  }, [open]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = getClientForEnv(targetEnvironment);
      const email = `${username.trim()}${EMAIL_DOMAIN}`;
      const { error } = await supabase.auth.signInWithOtp({ email });

      if (error) throw error;
      setOtpSent(true);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (token: string) => {
    setError("");
    setVerifying(true);

    try {
      const supabase = getClientForEnv(targetEnvironment);
      const email = `${username.trim()}${EMAIL_DOMAIN}`;
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      setOtp(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    if (value && newOtp.every((d) => d !== "")) {
      verifyOtp(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
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
    otpRefs.current[nextEmpty >= 0 ? nextEmpty : OTP_LENGTH - 1]?.focus();

    if (newOtp.every((d) => d !== "")) {
      verifyOtp(newOtp.join(""));
    }
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    setOtp(Array(OTP_LENGTH).fill(""));

    try {
      const supabase = getClientForEnv(targetEnvironment);
      const email = `${username.trim()}${EMAIL_DOMAIN}`;
      const { error } = await supabase.auth.signInWithOtp({ email });

      if (error) throw error;
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isProd = targetEnvironment === "prod";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Sign in to{" "}
            <span
              className={cn(
                "font-bold",
                isProd ? "text-env-prod" : "text-env-dev"
              )}
            >
              {targetEnvironment.toUpperCase()}
            </span>
          </DialogTitle>
          <DialogDescription>
            You need to authenticate with the {targetEnvironment} environment to
            access its data.
          </DialogDescription>
        </DialogHeader>

        {otpSent ? (
          <div className="py-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              A 6-digit code was sent to{" "}
              <strong>
                {username.trim()}
                {EMAIL_DOMAIN}
              </strong>
            </p>

            <div
              className="flex justify-center gap-2"
              onPaste={handleOtpPaste}
            >
              {otp.map((digit: string, i: number) => (
                <Input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={verifying}
                  className="w-10 h-12 text-center text-xl font-mono"
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

            <div className="mt-4 flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOtpSent(false);
                  setOtp(Array(OTP_LENGTH).fill(""));
                  setError("");
                }}
              >
                Back
              </Button>
              <Button
                variant="link"
                size="sm"
                onClick={handleResend}
                disabled={loading || verifying}
              >
                {loading ? "Sending..." : "Resend code"}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex">
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="rounded-r-none"
                  required
                  disabled={loading}
                />
                <div className="flex items-center px-3 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                  {EMAIL_DOMAIN}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Sending..." : "Send Code"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
