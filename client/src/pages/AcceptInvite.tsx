import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Heart, Loader2, AlertCircle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BackButton from '@/components/BackButton';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const { data: invitation, isLoading, error } = trpc.partners.getInvitation.useQuery(
    { token: token ?? '' },
    { enabled: !!token, retry: false }
  );

  const accept = trpc.partners.acceptInvitation.useMutation({
    onSuccess: () => {
      toast.success("You're now partners! 🎉");
      setLocation('/dashboard');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to accept invitation');
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-8 w-8 text-pink-500" />
        </motion.div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-3xl p-8 max-w-md w-full text-center border border-pink-100/50 shadow-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Invitation</h1>
          <p className="text-gray-500 mb-6">This invitation link is invalid or has expired. Please ask your partner to send a new invitation.</p>
          <Button onClick={() => setLocation('/')} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl">
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  if (invitation.status !== 'pending') {
    const statusMsg = invitation.status === 'accepted'
      ? 'This invitation has already been accepted.'
      : invitation.status === 'cancelled'
      ? 'This invitation has been cancelled.'
      : 'This invitation has expired.';

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-3xl p-8 max-w-md w-full text-center border border-pink-100/50 shadow-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invitation Unavailable</h1>
          <p className="text-gray-500 mb-6">{statusMsg}</p>
          <Button onClick={() => setLocation('/')} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl">
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-3xl p-8 max-w-md w-full text-center border border-pink-100/50 shadow-xl"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mx-auto mb-4"
          >
            <Heart className="h-8 w-8 text-pink-500" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Partner Invitation</h1>
          <p className="text-gray-600 mb-1">
            <span className="font-semibold text-pink-600">{invitation.inviterName}</span> has invited you to be their partner on Soapies.
          </p>
          <p className="text-gray-400 text-sm mb-6">Please log in or create an account to accept this invitation.</p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setLocation(`/login?redirect=/invite/${token}`)}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2"
            >
              <LogIn className="h-4 w-4" /> Log In to Accept
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation(`/join?redirect=/invite/${token}`)}
              className="w-full rounded-xl"
            >
              Create Account
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <BackButton variant="glass" fallback="/" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong rounded-3xl p-8 max-w-md w-full text-center border border-pink-100/50 shadow-xl"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mx-auto mb-6"
        >
          <Heart className="h-8 w-8 text-pink-500" />
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-800 mb-3">Partner Invitation 💕</h1>
        <p className="text-gray-600 mb-2">
          <span className="font-semibold text-pink-600">{invitation.inviterName}</span> has invited you to be their partner on Soapies.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Accepting will link your profiles together as partners.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => accept.mutate({ token: token ?? '' })}
            disabled={accept.isPending}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl gap-2 py-3"
          >
            {accept.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Accepting…
              </>
            ) : (
              <>
                <Heart className="h-4 w-4" /> Accept Invitation
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation('/')}
            className="w-full rounded-xl"
          >
            Decline
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
