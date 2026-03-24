import { useProfileStatus } from "@/hooks/useProfileStatus";
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
  const { loading, isAuthenticated, needsApplication, isAdmin } = useProfileStatus();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return; // Let the page handle unauthenticated state
    if (isAdmin) return; // Admins skip
    if (needsApplication) {
      setLocation("/apply");
    }
  }, [loading, isAuthenticated, needsApplication, isAdmin, setLocation]);

  // Show loading state while checking
  if (loading && isAuthenticated) {
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

  // If needs application and authenticated, don't render children (redirect is happening)
  if (isAuthenticated && needsApplication && !isAdmin) {
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
          <p className="text-gray-500 text-sm">Redirecting you to the application form...</p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
