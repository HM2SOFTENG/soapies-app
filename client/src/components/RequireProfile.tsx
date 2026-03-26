import { useProfileStatus } from "@/hooks/useProfileStatus";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { motion } from "framer-motion";

/**
 * Route guard component that redirects authenticated users
 * without a profile to the /apply page.
 * 
 * - Unauthenticated users: renders children (page handles its own auth)
 * - Admin users: always renders children (skip application)
 * - Users with profile: renders children
 * - Users without profile: redirects to /apply
 */
export function RequireProfile({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, needsApplication, isPendingApproval, isApprovedMember, isAdmin, applicationStatus } = useProfileStatus();
  const { isAuthenticated: authd } = useAuth();
  const profileQuery = trpc.profile.me.useQuery(undefined, { enabled: authd, staleTime: 5 * 60 * 1000 });
  const [, setLocation] = useLocation();

  const profile = profileQuery.data;

  // Approved-but-onboarding-incomplete: needs waiver or profile-setup
  const needsOnboarding = !isAdmin && !isPendingApproval && !needsApplication &&
    applicationStatus === "approved" &&
    (!profile?.waiverSignedAt || !profile?.profileSetupComplete);

  useEffect(() => {
    if (loading || profileQuery.isLoading) return;
    if (!isAuthenticated) return; // Let the page handle unauthenticated state
    if (isAdmin) return; // Admins skip
    if (isPendingApproval) {
      setLocation("/pending");
      return;
    }
    if (needsApplication) {
      setLocation("/join");
      return;
    }
    // Post-approval onboarding flow
    if (applicationStatus === "approved") {
      if (!profile?.waiverSignedAt) {
        setLocation("/waiver");
        return;
      }
      if (!profile?.profileSetupComplete) {
        setLocation("/profile-setup");
        return;
      }
    }
  }, [loading, profileQuery.isLoading, isAuthenticated, needsApplication, isPendingApproval, isAdmin, applicationStatus, profile, setLocation]);

  // Show loading state while checking
  if ((loading || profileQuery.isLoading) && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-4 border-pink-200 border-t-pink-500"
          />
          <p className="text-sm text-gray-500 font-medium">Checking your profile...</p>
        </motion.div>
      </div>
    );
  }

  // If not fully approved and authenticated, don't render children (redirect is happening)
  if (isAuthenticated && !isAdmin && (needsApplication || isPendingApproval || needsOnboarding)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center px-6"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-4xl"
          >
            ✨
          </motion.div>
          <h2 className="text-xl font-bold text-gray-800">Complete Your Profile</h2>
          <p className="text-gray-500 text-sm">Redirecting you...</p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
