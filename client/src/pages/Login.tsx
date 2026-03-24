import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Mail, Phone } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("email");

  // Email login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [phoneToVerify, setPhoneToVerify] = useState("");

  // Mutations
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Logged in successfully!");
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error.message || "Login failed");
    },
  });

  const sendPhoneOtpMutation = trpc.auth.sendPhoneOtp.useMutation({
    onSuccess: (data) => {
      setIsNewUser(data.isNewUser);
      setPhoneToVerify(phone);
      setShowOtpInput(true);
      toast.success("Verification code sent to your phone");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send verification code");
    },
  });

  const verifyPhoneOtpMutation = trpc.auth.verifyPhoneOtp.useMutation({
    onSuccess: () => {
      toast.success("Phone verified successfully!");
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error.message || "Verification failed");
    },
  });

  // Email login handler
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  // Phone OTP handler - send code
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error("Please enter a phone number");
      return;
    }
    sendPhoneOtpMutation.mutate({ phone });
  };

  // Phone OTP handler - verify
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    verifyPhoneOtpMutation.mutate({
      phone: phoneToVerify,
      code: otpCode,
      name: isNewUser ? newUserName : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="Soapies" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 text-sm mt-1">Sign in to your Soapies account</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone
            </TabsTrigger>
          </TabsList>

          {/* Email Tab */}
          <TabsContent value="email" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loginMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loginMutation.isPending}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-premium"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>

                <div className="mt-4 space-y-2 text-center text-sm">
                  <Link href="/forgot-password">
                    <span className="text-pink-600 hover:text-pink-700 cursor-pointer font-medium">
                      Forgot password?
                    </span>
                  </Link>
                  <div className="text-gray-600">
                    Don't have an account?{" "}
                    <Link href="/register">
                      <span className="text-pink-600 hover:text-pink-700 cursor-pointer font-medium">
                        Sign up
                      </span>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Phone Tab */}
          <TabsContent value="phone" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                {!showOtpInput ? (
                  <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={sendPhoneOtpMutation.isPending}
                      />
                      <p className="text-xs text-gray-500">Include country code (e.g., +1 for US)</p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full btn-premium"
                      disabled={sendPhoneOtpMutation.isPending}
                    >
                      {sendPhoneOtpMutation.isPending ? "Sending..." : "Send Code"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
                    <div className="text-center mb-4">
                      <p className="text-sm text-gray-600">
                        We sent a code to <span className="font-semibold">{phoneToVerify}</span>
                      </p>
                    </div>

                    {isNewUser && (
                      <div className="space-y-2">
                        <Label htmlFor="name">Your Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="John Doe"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          disabled={verifyPhoneOtpMutation.isPending}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="otp">Verification Code</Label>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={otpCode}
                          onChange={setOtpCode}
                          disabled={verifyPhoneOtpMutation.isPending}
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
                      disabled={verifyPhoneOtpMutation.isPending}
                    >
                      {verifyPhoneOtpMutation.isPending ? "Verifying..." : "Verify"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setShowOtpInput(false);
                        setOtpCode("");
                        setNewUserName("");
                      }}
                    >
                      Back
                    </Button>
                  </form>
                )}

                <div className="mt-4 text-center text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link href="/register">
                    <span className="text-pink-600 hover:text-pink-700 cursor-pointer font-medium">
                      Sign up
                    </span>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
