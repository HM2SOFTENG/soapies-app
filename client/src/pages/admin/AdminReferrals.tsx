import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { TrendingUp, Loader2 } from "lucide-react";

// Phase pipeline steps for each referred user
const PIPELINE_STEPS = [
  { key: "account_created", label: "Joined", icon: "👤" },
  { key: "submitted", label: "Applied", icon: "📝" },
  { key: "interview", label: "Interview", icon: "📞" },
  { key: "approved", label: "Approved", icon: "✅" },
  { key: "converted", label: "Credit Earned", icon: "💰" },
];

function getStep(row: any): number {
  if (row.referralConverted) return 4; // Credit earned
  const status = row.applicationStatus as string;
  const phase = row.applicationPhase as string | null;
  if (status === "approved" || phase === "final_approved") return 3;
  if (phase === "interview_scheduled" || phase === "interview_complete") return 2;
  if (status === "submitted" || status === "under_review") return 1;
  if (row.userCreatedAt) return 0; // Account created
  return -1;
}

function PipelineProgress({ row }: { row: any }) {
  const currentStep = getStep(row);
  return (
    <div className="flex items-center gap-1 mt-3">
      {PIPELINE_STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1 flex-1">
          <div className={`flex flex-col items-center flex-1`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              i <= currentStep
                ? "bg-pink-500 border-pink-500 text-white"
                : "bg-gray-100 border-gray-200 text-gray-400"
            }`}>
              {i <= currentStep ? "✓" : i + 1}
            </div>
            <p className={`text-[9px] mt-0.5 text-center leading-tight ${i <= currentStep ? "text-pink-600 font-semibold" : "text-gray-400"}`}>
              {step.label}
            </p>
          </div>
          {i < PIPELINE_STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mb-4 ${i < currentStep ? "bg-pink-500" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ReferralCard({ row, index }: { row: any; index: number }) {
  const currentStep = getStep(row);
  const stepLabel = currentStep >= 0 ? PIPELINE_STEPS[currentStep]?.label : "Pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`p-5 rounded-2xl border ${row.referralConverted ? "bg-emerald-50 border-emerald-200" : "bg-white border-pink-100"} space-y-3`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 truncate">{row.referredDisplayName ?? "—"}</p>
          <p className="text-xs text-gray-500">
            Referred by <span className="font-semibold text-pink-600">{row.referrerName ?? "—"}</span>
            {" · "}<code className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-mono">{row.referredByCode}</code>
          </p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
          row.referralConverted ? "bg-emerald-200 text-emerald-800" :
          currentStep >= 3 ? "bg-blue-100 text-blue-700" :
          currentStep >= 2 ? "bg-purple-100 text-purple-700" :
          currentStep >= 1 ? "bg-yellow-100 text-yellow-700" :
          "bg-gray-100 text-gray-600"
        }`}>
          {row.referralConverted ? "💰 Credit Earned" : stepLabel}
        </span>
      </div>

      <PipelineProgress row={row} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500 pt-1">
        <div>
          <p className="font-semibold text-gray-600 text-[10px] uppercase">Joined</p>
          <p>{row.userCreatedAt ? format(new Date(row.userCreatedAt), "MMM d, yyyy") : "—"}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-600 text-[10px] uppercase">Applied</p>
          <p>{row.applicationStatus !== "draft" ? format(new Date(row.referredAppliedAt), "MMM d, yyyy") : "—"}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-600 text-[10px] uppercase">Status</p>
          <p className="capitalize">{row.applicationStatus}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-600 text-[10px] uppercase">Credit Date</p>
          <p>{row.referralConvertedAt ? format(new Date(row.referralConvertedAt), "MMM d, yyyy") : "—"}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminReferrals() {
  const { data: pipeline, isLoading } = trpc.referrals.adminList.useQuery();

  const stats = {
    total: pipeline?.length ?? 0,
    converted: pipeline?.filter((r: any) => r.referralConverted).length ?? 0,
    approved: pipeline?.filter((r: any) => (r.applicationStatus === "approved" || r.applicationPhase === "final_approved") && !r.referralConverted).length ?? 0,
    inProgress: pipeline?.filter((r: any) => !r.referralConverted && r.applicationStatus !== "approved" && r.applicationPhase !== "final_approved").length ?? 0,
  };

  return (
    <AdminLayout title="Referral Pipeline">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Referred", value: stats.total, color: "text-pink-600", bg: "bg-pink-50" },
            { label: "In Progress", value: stats.inProgress, color: "text-yellow-700", bg: "bg-yellow-50" },
            { label: "Approved", value: stats.approved, color: "text-blue-700", bg: "bg-blue-50" },
            { label: "Credits Earned", value: stats.converted, color: "text-emerald-700", bg: "bg-emerald-50" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`${s.bg} rounded-2xl p-4 border border-white/50`}>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1 uppercase tracking-wide">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Pipeline */}
        <div>
          <h2 className="font-display text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-pink-500" /> Referral Pipeline
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-pink-400 animate-spin" /></div>
          ) : !pipeline || pipeline.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No referrals yet</div>
          ) : (
            <div className="space-y-3">
              {(pipeline as any[]).map((row: any, i: number) => (
                <ReferralCard key={row.referredProfileId} row={row} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
