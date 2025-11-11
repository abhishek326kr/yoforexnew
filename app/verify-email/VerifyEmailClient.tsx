"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Mail, ArrowLeft } from "lucide-react";

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const { toast } = useToast();
  const [otp, setOtp] = useState("");

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/auth/verify-email-otp", { email, code });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Email Verified!",
        description: data.message || "Your email has been verified successfully.",
      });
      // Redirect to home or dashboard
      setTimeout(() => router.push("/"), 1500);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message,
      });
      setOtp(""); // Clear OTP on error
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/resend-verification-otp", { email });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Code Sent",
        description: "A new verification code has been sent to your email.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Resend",
        description: error.message,
      });
    },
  });

  const handleComplete = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      verifyMutation.mutate(value);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a 6-digit code to<br />
            <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              onComplete={handleComplete}
              data-testid="input-otp-verification"
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

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending || verifyMutation.isPending}
              className="w-full"
              data-testid="button-resend-code"
            >
              {resendMutation.isPending ? "Sending..." : "Resend Code"}
            </Button>

            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="w-full"
              data-testid="button-back-to-login"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Didn't receive the code? Check your spam folder or resend.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
