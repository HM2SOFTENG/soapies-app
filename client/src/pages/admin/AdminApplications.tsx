import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Loader2, Check, X, Clock, Sparkles, MapPin,
  Heart, User, ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function ApplicationCard({ app, index, onReview, isPending }: {
  app: any; index: number; onReview: (id: number, status: string) => void; isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
      layout
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-pink-100/50 shadow-lg hover:shadow-xl transition-all overflow-hidden"
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {/* Avatar */}
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center shadow-lg shrink-0"
          >
            <span className="text-lg font-black text-white">{app.displayName?.charAt(0)?.toUpperCase() || "?"}</span>
          </motion.div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-bold text-gray-800 text-lg">{app.displayName || `Applicant #${app.userId}`}</h3>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {app.gender && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-pink-50 rounded-lg text-[10px] font-bold text-pink-600 border border-pink-100">
                  <User className="h-2.5 w-2.5" /> {app.gender}
                </span>
              )}
              {app.location && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 rounded-lg text-[10px] font-bold text-purple-600 border border-purple-100">
                  <MapPin className="h-2.5 w-2.5" /> {app.location}
                </span>
              )}
              {app.orientation && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-fuchsia-50 rounded-lg text-[10px] font-bold text-fuchsia-600 border border-fuchsia-100">
                  <Heart className="h-2.5 w-2.5" /> {app.orientation}
                </span>
              )}
            </div>
            {app.bio && (
              <p className={`text-sm text-gray-500 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>{app.bio}</p>
            )}
            {app.bio && app.bio.length > 100 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-pink-500 font-semibold mt-1 flex items-center gap-0.5 cursor-pointer hover:text-pink-600"
              >
                {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-5 sm:px-6 py-3 bg-pink-50/30 border-t border-pink-100/30 flex flex-wrap gap-2 justify-end">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            size="sm"
            onClick={() => onReview(app.id, "approved")}
            disabled={isPending}
            className="bg-gradient-to-r from-emerald-400 to-green-500 text-white rounded-xl gap-1.5 shadow-md shadow-emerald-100/50"
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReview(app.id, "waitlisted")}
            disabled={isPending}
            className="rounded-xl border-amber-200 text-amber-600 gap-1.5 hover:bg-amber-50"
          >
            <Clock className="h-3.5 w-3.5" /> Waitlist
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReview(app.id, "rejected")}
            disabled={isPending}
            className="rounded-xl border-red-200 text-red-500 gap-1.5 hover:bg-red-50"
          >
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function AdminApplications() {
  const { data: applications, isLoading } = trpc.admin.pendingApplications.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });
  const utils = trpc.useUtils();
  const review = trpc.admin.reviewApplication.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Application ${vars.status}!`, { icon: vars.status === "approved" ? "✅" : vars.status === "waitlisted" ? "⏳" : "❌" });
      utils.admin.pendingApplications.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminLayout title="Applications">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-sm">
            {applications?.length || 0} pending application{(applications?.length || 0) !== 1 ? "s" : ""} to review
          </p>
        </div>
        {applications && applications.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-100">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-amber-400"
            />
            <span className="text-xs font-bold text-amber-600">Needs Review</span>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
          <p className="text-sm text-gray-400">Loading applications...</p>
        </div>
      ) : !applications || applications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border border-pink-100/50"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 items-center justify-center mb-4"
          >
            <Sparkles className="h-10 w-10 text-emerald-400" />
          </motion.div>
          <h3 className="font-display text-xl font-bold text-gray-600 mb-2">All caught up!</h3>
          <p className="text-gray-400 text-sm">No pending applications to review.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {applications.map((app: any, i: number) => (
              <ApplicationCard
                key={app.id}
                app={app}
                index={i}
                onReview={(id, status) => review.mutate({ profileId: id, status: status as any })}
                isPending={review.isPending}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </AdminLayout>
  );
}
