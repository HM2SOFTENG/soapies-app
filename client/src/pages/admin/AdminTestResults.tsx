import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Loader2, Check, X, FlaskConical, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function WristbandBadge({ color }: { color?: string | null }) {
  if (!color) return <span className="text-gray-400">—</span>;
  const config: Record<string, { emoji: string; label: string; bg: string; text: string }> = {
    rainbow: { emoji: "🌈", label: "Rainbow", bg: "bg-purple-100", text: "text-purple-800" },
    purple: { emoji: "💜", label: "Purple", bg: "bg-purple-100", text: "text-purple-700" },
    blue: { emoji: "💙", label: "Blue", bg: "bg-blue-100", text: "text-blue-700" },
    pink: { emoji: "🩷", label: "Pink", bg: "bg-pink-100", text: "text-pink-700" },
  };
  const c = config[color];
  if (!c) return <span className="text-gray-400">—</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
      {c.emoji} {c.label}
    </span>
  );
}

export default function AdminTestResults() {
  const utils = trpc.useUtils();
  const { data: submissions, isLoading } = trpc.testResults.pending.useQuery({});
  const reviewMutation = trpc.testResults.review.useMutation({
    onSuccess: () => {
      toast.success("Review submitted");
      utils.testResults.pending.invalidate();
    },
    onError: (e: any) => toast.error(e.message || "Failed to review"),
  });

  const pendingCount = submissions?.length ?? 0;

  return (
    <AdminLayout title={`Test Results${pendingCount > 0 ? ` (${pendingCount})` : ""}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-200/50">
              <FlaskConical className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-black text-gray-800">Test Results</h1>
              <p className="text-gray-500 text-sm">Review submitted STI test results across all events</p>
            </div>
          </div>

          {pendingCount > 0 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-100 to-blue-100 border border-cyan-200 mt-4"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-sm font-bold text-cyan-700">{pendingCount} pending review{pendingCount !== 1 ? "s" : ""}</span>
            </motion.div>
          )}
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="h-10 w-10 text-pink-400" />
            </motion.div>
          </div>
        ) : !submissions || submissions.length === 0 ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center mb-4">
              <FlaskConical className="h-10 w-10 text-cyan-400" />
            </div>
            <h2 className="font-display text-xl font-bold text-gray-700 mb-2">All clear!</h2>
            <p className="text-gray-400">No pending test results to review.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {submissions.map((s: any, i: number) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-2xl bg-white border border-cyan-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="font-bold text-gray-800 text-lg">{s.user?.name || "Unknown"}</p>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        {s.event?.title || "Unknown Event"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{s.user?.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted {format(new Date(s.submittedAt), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                    <a
                      href={s.resultUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" /> View Test Result
                    </a>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => reviewMutation.mutate({ id: s.id, status: "approved" })}
                        disabled={reviewMutation.isPending}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl gap-2 shadow-lg shadow-green-200/50"
                      >
                        {reviewMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Approve 💙
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => reviewMutation.mutate({ id: s.id, status: "rejected" })}
                        disabled={reviewMutation.isPending}
                        variant="outline"
                        className="border-red-200 text-red-600 rounded-xl gap-2 hover:bg-red-50"
                      >
                        {reviewMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Reject
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
