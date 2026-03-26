import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMemo } from "react";

/**
 * Hook to check if the current user has a completed profile/application.
 * Returns profile status and whether the user needs to complete the application form.
 */
export function useProfileStatus() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const profileQuery = trpc.profile.me.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchOnWindowFocus: false,
    retry: false,
  });

  const status = useMemo(() => {
    // Still loading auth or profile
    if (authLoading || (isAuthenticated && profileQuery.isLoading)) {
      return {
        loading: true,
        isAuthenticated,
        hasProfile: false,
        profileComplete: false,
        applicationStatus: null as string | null,
        needsApplication: false,
        isPendingApproval: false,
        isApprovedMember: false,
        isAdmin: false,
      };
    }

    // Not logged in — no redirect needed
    if (!isAuthenticated || !user) {
      return {
        loading: false,
        isAuthenticated: false,
        hasProfile: false,
        profileComplete: false,
        applicationStatus: null as string | null,
        needsApplication: false,
        isPendingApproval: false,
        isApprovedMember: false,
        isAdmin: false,
      };
    }

    const isAdmin = user.role === "admin";
    const profile = profileQuery.data;
    const hasProfile = !!profile;
    const profileComplete = !!profile?.isProfileComplete;
    const applicationStatus = profile?.applicationStatus ?? null;

    // Fully approved member: admin OR (approved + waiver + profile setup complete)
    const isApprovedMember = isAdmin || (
      applicationStatus === "approved" &&
      !!profile?.waiverSignedAt &&
      !!profile?.profileSetupComplete
    );

    // Needs to complete application: no profile at all, or profile is in draft state (never submitted)
    const needsApplication = !isAdmin && (!hasProfile || applicationStatus === null || applicationStatus === "draft");

    // Pending/rejected — redirected to /pending
    const isPendingApproval = !isAdmin && hasProfile && !needsApplication && applicationStatus !== "approved";

    return {
      loading: false,
      isAuthenticated: true,
      hasProfile,
      profileComplete,
      applicationStatus,
      needsApplication,
      isPendingApproval,
      isApprovedMember,
      isAdmin,
    };
  }, [authLoading, isAuthenticated, user, profileQuery.isLoading, profileQuery.data]);

  return status;
}
