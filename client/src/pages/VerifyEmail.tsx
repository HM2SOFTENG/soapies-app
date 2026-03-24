import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { trpc } from "@/lib/trpc";
import { Mail } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Extract email from URL query params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam));
      }
    }
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendCountdown === 0 && !canResend && email) {
      setCanResend(true);
    }
  }, [resendCountdown, canResend, email]);

  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      toast.success("Email verified successfully!");
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error.message || "Verification failed");
    },
  });

  const resendEmailMutation = trpc.auth.resendEmailVerification.useMutation({
    onSuccess: () => {
      toast.success("Verification code sent!");
      setCanResend(false);
      setResendCountdown(60);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to resend code");
    },
  });

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    if (!email) {
      toast.error("Email is required");
      return;
    }
    verifyEmailMutation.mutate({ email, code: otpCode });
  };

  const handleResendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Email is required");
      return;
    }
    resendEmailMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="Soapies" className="h-16 mx-auto mb-4" />
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center mx-auto mb-4">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Your Email</h1>
          <p className="text-gray-600 text-sm mt-1">
            {email && `We sent a code to ${email}`}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <div className="flex justify-center py-4">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={setOtpCode}
                    disabled={verifyEmailMutation.isPending}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full btn-premium"
                disabled={verifyEmailMutation.isPending}
              >
                {verifyEmailMutation.isPending ? "Verifying..." : "Verify Email"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Didn't receive a code?</p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendCode}
                disabled={!canResend || resendEmailMutation.isPending}
              >
                {resendEmailMutation.isPending
                  ? "Sending..."
                  : canResend
                    ? "Resend Code"
                    : `Resend in ${resendCountdown}s`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
