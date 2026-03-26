import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import MemberProfile from "./MemberProfile";
import PageWrapper from "@/components/PageWrapper";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Profile() {
  const { user, loading } = useAuth();

  const { data: profile, isLoading: profileLoading } = trpc.profile.me.useQuery(undefined, {
    retry: false,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  if (loading || profileLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
            <Loader2 className="h-8 w-8 text-pink-400" />
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  if (!user || !profile) {
    return (
      <PageWrapper>
        <div className="text-center py-20">
          <p className="text-gray-400">Profile not found</p>
        </div>
      </PageWrapper>
    );
  }

  return <MemberProfile userId={user.id} isOwnProfile={true} />;
}
