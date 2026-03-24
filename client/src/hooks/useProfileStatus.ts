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
        isAdmin: false,
      };
    }

    const isAdmin = user.role === "admin";
    const profile = profileQuery.data;
    const hasProfile = !!profile;
    const profileComplete = !!profile?.isProfileComplete;
    const applicationStatus = profile?.applicationStatus ?? null;

    // Admins skip the application requirement
    // Users with a completed profile (any status) don't need to re-apply
    const needsApplication = !isAdmin && !hasProfile;

    return {
      loading: false,
      isAuthenticated: true,
      hasProfile,
      profileComplete,
      applicationStatus,
      needsApplication,
      isAdmin,
    };
  }, [authLoading, isAuthenticated, user, profileQuery.isLoading, profileQuery.data]);

  return status;
}
