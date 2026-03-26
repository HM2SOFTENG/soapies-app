import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, CheckCircle, Loader2 } from "lucide-react";

const WAIVER_VERSION = "1.0";

const WAIVER_TEXT = `SOAPIES COMMUNITY WAIVER & PARTICIPATION AGREEMENT

By signing below, I agree to the following terms:

1. CONSENT & CONFIDENTIALITY: I understand this is a private members-only community. I agree to maintain strict confidentiality about other members' identities, participation, and activities.

2. CODE OF CONDUCT: I agree to treat all members with respect and dignity. Harassment, non-consensual contact, or sharing of other members' information is strictly prohibited.

3. PHOTO & MEDIA POLICY: I consent to photos being taken at events for community use. I will not photograph or record other members without explicit consent.

4. WAIVER OF LIABILITY: I participate voluntarily and assume all risks. I waive any claims against Soapies, its organizers, and members arising from my participation.

5. AGE VERIFICATION: I confirm I am 21 years of age or older.

6. MEMBER RESPONSIBILITIES: I agree to follow all community guidelines and understand that violations may result in immediate removal without refund.`;

export default function Waiver() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const profileQuery = trpc.profile.me.useQuery(undefined, { enabled: isAuthenticated });
  const signWaiverMutation = trpc.profile.signWaiver.useMutation({
    onSuccess: () => {
      utils.profile.me.invalidate();
    },
  });

  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);

  const profile = profileQuery.data;

  useEffect(() => {
    if (profileQuery.isLoading) return;
    if (!isAuthenticated) { setLocation("/login"); return; }
    if (profile?.applicationStatus !== "approved") { setLocation("/pending"); return; }
    if (profile?.waiverSignedAt) {
      if (profile?.profileSetupComplete) setLocation("/dashboard");
      else setLocation("/profile-setup");
    }
  }, [profileQuery.isLoading, isAuthenticated, profile, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signature.trim()) { toast.error("Please type your full name as signature"); return; }
    if (!agreed) { toast.error("Please check the agreement checkbox"); return; }

    try {
      await signWaiverMutation.mutateAsync({ signature: signature.trim(), version: WAIVER_VERSION });
      toast.success("Waiver signed! Let's set up your profile.");
      setLocation("/profile-setup");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to sign waiver");
    }
  };

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <Loader2 className="h-8 w-8 text-pink-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 items-center justify-center mb-4 shadow-lg shadow-pink-200/40"
          >
            <FileText className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="font-display text-3xl font-black text-gray-800 mb-2">Community Waiver & Agreement</h1>
          <p className="text-gray-500 text-sm">Please read carefully and sign to complete your membership</p>
        </div>

        {/* Waiver text */}
        <div className="bg-white rounded-2xl border border-pink-100/50 shadow-sm mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 px-6 py-3 border-b border-pink-100">
            <p className="text-xs font-semibold text-pink-600 uppercase tracking-widest">Official Agreement</p>
          </div>
          <div className="p-6 max-h-72 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-600 font-sans leading-relaxed">{WAIVER_TEXT}</pre>
          </div>
        </div>

        {/* Signature form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-pink-100/50 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Full Name (Signature)
            </label>
            <Input
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="Type your full legal name"
              className="rounded-xl border-pink-200 focus:border-pink-400 focus:ring-pink-300"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => setAgreed(v => !v)}
              className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                agreed ? "bg-pink-500 border-pink-500" : "border-gray-300 group-hover:border-pink-400"
              }`}
            >
              {agreed && <CheckCircle className="h-3.5 w-3.5 text-white" />}
            </div>
            <span className="text-sm text-gray-600">
              I have read and agree to the above terms and conditions of the Soapies Community Waiver & Participation Agreement.
            </span>
          </label>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              disabled={signWaiverMutation.isPending || !signature.trim() || !agreed}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl py-3 font-semibold shadow-lg shadow-pink-200/40 disabled:opacity-50"
            >
              {signWaiverMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing...</>
              ) : (
                "Sign & Continue →"
              )}
            </Button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}
