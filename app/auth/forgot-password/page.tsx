"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { KeyRound, ArrowLeft } from "lucide-react";

type Step = "email" | "code" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const requestResetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/request-password-reset", { email });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Code Sent",
        description: "A verification code has been sent to your email.",
      });
      setStep("code");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: error.message,
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/auth/verify-reset-code", { email, code });
      return res.json();
    },
    onSuccess: (data) => {
      setResetToken(data.resetToken);
      toast({
        title: "Code Verified",
        description: "Please enter your new password.",
      });
      setStep("password");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message,
      });
      setOtp("");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords don't match");
      }
      const res = await apiRequest("PATCH", "/api/auth/reset-password", {
        resetToken,
        newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Password Reset Successfully",
        description: "You can now log in with your new password.",
      });
      setTimeout(() => router.push("/"), 1500);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error.message,
      });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            {step === "email" && "Enter your email to receive a verification code"}
            {step === "code" && "Enter the 6-digit code sent to your email"}
            {step === "password" && "Create a new password for your account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "email" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-reset-email"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => requestResetMutation.mutate()}
                disabled={!email || requestResetMutation.isPending}
                data-testid="button-request-reset"
              >
                {requestResetMutation.isPending ? "Sending..." : "Send Reset Code"}
              </Button>
            </>
          )}

          {step === "code" && (
            <>
              <div className="flex flex-col items-center space-y-4">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  onComplete={(value) => verifyCodeMutation.mutate(value)}
                  data-testid="input-otp-reset"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-sm text-muted-foreground">
                  Code expires in 10 minutes
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => requestResetMutation.mutate()}
                disabled={requestResetMutation.isPending}
                data-testid="button-resend-reset-code"
              >
                Resend Code
              </Button>
            </>
          )}

          {step === "password" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="input-confirm-password"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => resetPasswordMutation.mutate()}
                disabled={!newPassword || !confirmPassword || resetPasswordMutation.isPending}
                data-testid="button-reset-password"
              >
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push("/")}
            data-testid="button-back-to-login"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
