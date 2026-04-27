import { trpc } from './trpc';
import { useAuth } from './auth';

export function useAdminAccess() {
  const { user } = useAuth();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const meData = meQuery.data as any;
  const isAdmin = user?.role === 'admin' || meData?.role === 'admin';
  const isCheckingAdmin = !isAdmin && meQuery.isLoading;

  return {
    isAdmin,
    isCheckingAdmin,
    meData,
    refetchAdminAccess: meQuery.refetch,
  };
}
