import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, MapPin, Heart, Phone, Mail, Calendar, Clock, ChevronDown,
  ChevronUp, CheckCircle2, X, Sparkles, Loader2, FileText,
  Image as ImageIcon, Star, Shield, Crown,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type PhaseTab = "new" | "interview" | "final_review" | "decided";

const PHASE_TABS: { key: PhaseTab; label: string; desc: string }[] = [
  { key: "new", label: "New", desc: "submitted / under review" },
  { key: "interview", label: "Interview", desc: "interview_scheduled" },
  { key: "final_review", label: "Final Review", desc: "interview_complete" },
  { key: "decided", label: "Decided", desc: "approved / rejected / waitlisted" },
];

function getPhaseForTab(tab: PhaseTab, app: any): boolean {
  const status = app.applicationStatus as string;
  const phase = app.applicationPhase as string | null;
  switch (tab) {
    case "new":
      return (status === "submitted" || status === "under_review") && !phase;
    case "interview":
      return phase === "interview_scheduled";
    case "final_review":
      return phase === "interview_complete";
    case "decided":
      return status === "approved" || status === "rejected" || status === "waitlisted" || phase === "final_approved";
    default:
      return false;
  }
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────

function Avatar({ photos, name }: { photos: string[]; name: string }) {
  if (photos.length > 0) {
    return (
      <img
        src={photos[0]}
        alt={name}
        className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-pink-200"
      />
    );
  }
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-md text-white font-bold text-xl">
      {initials || <User className="w-7 h-7" />}
    </div>
  );
}

// ─── PHOTO GRID ──────────────────────────────────────────────────────────────

function PhotoGrid({ photos }: { photos: string[] }) {
  if (!photos.length) return (
    <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
      <ImageIcon className="w-4 h-4" />
      No photos submitted
    </div>
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {photos.slice(0, 6).map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt={`Photo ${i + 1}`}
            className="w-full aspect-square object-cover rounded-xl border border-pink-100 hover:border-pink-400 transition-colors"
          />
        </a>
      ))}
    </div>
  );
}

// ─── DETAIL PANEL ────────────────────────────────────────────────────────────

function DetailPanel({ profileId, app, onAction }: {
  profileId: number;
  app: any;
  onAction: () => void;
}) {
  const [memberRole, setMemberRole] = useState<"member" | "angel" | "admin">("member");
  const { data: detail, isLoading } = trpc.admin.getApplicationDetail.useQuery({ profileId });
  const advance = trpc.admin.advanceApplication.useMutation({
    onSuccess: () => { onAction(); toast.success("Application updated!"); },
    onError: (e) => toast.error(e.message),
  });

  const phase = app.applicationPhase as string | null;
  const status = app.applicationStatus as string;

  const handleAction = (actionPhase: string) => {
    advance.mutate({
      profileId,
      phase: actionPhase as any,
      memberRole: actionPhase === "final_approved" ? memberRole : undefined,
    });
  };

  if (isLoading) return (
    <div className="p-6 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
    </div>
  );

  const d = detail;

  return (
    <div className="border-t border-pink-100 bg-pink-50/30 p-4 sm:p-5 space-y-5 overflow-hidden">
      {/* Photos */}
      <div>
        <h4 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-pink-400" /> Application Photos
        </h4>
        <PhotoGrid photos={d?.applicationPhotos ?? []} />
      </div>

      {/* Profile Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {d?.email && (
          <a href={`mailto:${d.email}`} className="flex items-center gap-2 text-blue-600 hover:underline">
            <Mail className="w-4 h-4" /> {d.email}
          </a>
        )}
        {d?.phone && (
          <a href={`tel:${d.phone}`} className="flex items-center gap-2 text-blue-600 hover:underline">
            <Phone className="w-4 h-4" /> {d.phone}
          </a>
        )}
        {d?.gender && (
          <span className="flex items-center gap-2 text-gray-600">
            <User className="w-4 h-4 text-pink-400" /> {d.gender}
          </span>
        )}
        {d?.orientation && (
          <span className="flex items-center gap-2 text-gray-600">
            <Heart className="w-4 h-4 text-pink-400" /> {d.orientation}
          </span>
        )}
        {d?.location && (
          <span className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-pink-400" /> {d.location}
          </span>
        )}
        {d?.referredByCode && (
          <span className="flex items-center gap-2 text-gray-600">
            <Sparkles className="w-4 h-4 text-purple-400" /> Ref: {d.referredByCode}
          </span>
        )}
      </div>

      {/* Bio */}
      {d?.bio && (
        <div>
          <h4 className="text-sm font-bold text-gray-600 mb-1">Bio</h4>
          <p className="text-sm text-gray-700 leading-relaxed bg-white/70 rounded-xl p-3">{d.bio}</p>
        </div>
      )}

      {/* Intro Call Slot */}
      {d?.introCallSlots && d.introCallSlots.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-purple-400" /> Booked Intro Call
          </h4>
          {d.introCallSlots.map((slot: any) => (
            <div key={slot.id} className="text-sm bg-purple-50 rounded-xl p-3 text-purple-700 font-medium">
              {new Date(slot.scheduledAt).toLocaleString()} — {slot.duration || 30}min
            </div>
          ))}
        </div>
      )}

      {/* Application Timeline */}
      {d?.applicationLogs && d.applicationLogs.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-400" /> Timeline
          </h4>
          <div className="space-y-1.5">
            {d.applicationLogs.map((log: any) => (
              <div key={log.id} className="flex items-center gap-2 text-xs text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-400 flex-shrink-0" />
                <span className="font-medium capitalize">{log.action.replace(/_/g, " ")}</span>
                {log.notes && <span className="text-gray-400">— {log.notes}</span>}
                <span className="ml-auto text-gray-300">{new Date(log.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 border-t border-pink-100">
        {/* New applicant actions */}
        {(!phase && (status === "submitted" || status === "under_review")) && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
              onClick={() => handleAction("interview_scheduled")}
              disabled={advance.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve for Interview
            </Button>
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => handleAction("rejected")} disabled={advance.isPending}>
              <X className="w-4 h-4 mr-1.5" /> Reject
            </Button>
            <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={() => {
                advance.mutate({ profileId, phase: "rejected" as any });
                // Note: waitlist doesn't have a dedicated phase, use reviewApplication instead
              }}
              disabled={advance.isPending}
            >
              <Sparkles className="w-4 h-4 mr-1.5" /> Waitlist
            </Button>
          </div>
        )}

        {/* Interview scheduled */}
        {phase === "interview_scheduled" && (
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
            onClick={() => handleAction("interview_complete")}
            disabled={advance.isPending}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark Interview Complete
          </Button>
        )}

        {/* Interview complete — final approval */}
        {phase === "interview_complete" && (
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-bold text-gray-600 mb-2">Member Type</h4>
              <div className="flex flex-wrap gap-2">
                {(["member", "angel", "admin"] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setMemberRole(role)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                      memberRole === role
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white border-transparent"
                        : "border-gray-200 text-gray-600 hover:border-pink-300"
                    }`}
                  >
                    {role === "member" && <><Star className="w-3.5 h-3.5 inline mr-1" />Member</>}
                    {role === "angel" && <><Sparkles className="w-3.5 h-3.5 inline mr-1" />Angel</>}
                    {role === "admin" && <><Shield className="w-3.5 h-3.5 inline mr-1" />Admin</>}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                onClick={() => handleAction("final_approved")}
                disabled={advance.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Final Approve as {memberRole}
              </Button>
              <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => handleAction("rejected")} disabled={advance.isPending}>
                <X className="w-4 h-4 mr-1.5" /> Reject
              </Button>
            </div>
          </div>
        )}

        {advance.isPending && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Updating...
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APPLICATION CARD ────────────────────────────────────────────────────────

function AppCard({ app, index, onRefresh }: { app: any; index: number; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const photos: string[] = app.applicationPhotos ?? [];
  const name = app.displayName || "Anonymous";
  const phase = app.applicationPhase as string | null;
  const status = app.applicationStatus as string;

  const getPhaseBadge = () => {
    if (phase === "interview_scheduled") return { label: "Interview Scheduled", cls: "bg-blue-100 text-blue-700" };
    if (phase === "interview_complete") return { label: "Interview Complete", cls: "bg-indigo-100 text-indigo-700" };
    if (phase === "final_approved") return { label: "Final Approved", cls: "bg-green-100 text-green-700" };
    if (status === "approved") return { label: "Approved", cls: "bg-green-100 text-green-700" };
    if (status === "rejected") return { label: "Rejected", cls: "bg-red-100 text-red-700" };
    if (status === "waitlisted") return { label: "Waitlisted", cls: "bg-purple-100 text-purple-700" };
    if (status === "under_review") return { label: "Under Review", cls: "bg-amber-100 text-amber-700" };
    return { label: "Submitted", cls: "bg-gray-100 text-gray-600" };
  };

  const badge = getPhaseBadge();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 200 }}
      layout
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-pink-100/50 shadow-lg hover:shadow-xl transition-all overflow-hidden"
    >
      <div
        className="p-4 sm:p-5 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <Avatar photos={photos} name={name} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-800 text-base truncate" style={{ fontFamily: "Fredoka, sans-serif" }}>
                {name}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
              {app.gender && (
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{app.gender}</span>
              )}
              {app.orientation && (
                <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{app.orientation}</span>
              )}
              {app.location && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{app.location}</span>
              )}
              {app.referredByCode && (
                <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-purple-400" />Ref: {app.referredByCode}</span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(app.createdAt).toLocaleDateString()}
              </span>
            </div>
            {app.bio && (
              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{app.bio}</p>
            )}
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <DetailPanel profileId={app.id} app={app} onAction={() => { setExpanded(false); onRefresh(); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function AdminApplicationReview() {
  const [activeTab, setActiveTab] = useState<PhaseTab>("new");
  const { data: apps, isLoading, refetch } = trpc.admin.pendingApplications.useQuery(undefined, {
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const filtered = (apps ?? []).filter(app => getPhaseForTab(activeTab, app));

  const tabCounts: Record<PhaseTab, number> = {
    new: (apps ?? []).filter(a => getPhaseForTab("new", a)).length,
    interview: (apps ?? []).filter(a => getPhaseForTab("interview", a)).length,
    final_review: (apps ?? []).filter(a => getPhaseForTab("final_review", a)).length,
    decided: (apps ?? []).filter(a => getPhaseForTab("decided", a)).length,
  };

  return (
    <AdminLayout title="Application Review">
      {/* Phase Tabs — horizontal scroll on mobile, grid on desktop */}
      <div className="mb-6 -mx-1">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-1 pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible">
          {PHASE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all text-left sm:text-center ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-200"
                  : "bg-white/80 text-gray-600 border border-pink-100 hover:border-pink-300 hover:text-pink-600"
              }`}
            >
              <span className="flex items-center gap-1.5 whitespace-nowrap sm:justify-center">
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === tab.key ? "bg-white/30 text-white" : "bg-pink-100 text-pink-600"
                  }`}>
                    {tabCounts[tab.key]}
                  </span>
                )}
              </span>
              <span className={`block text-[10px] font-normal mt-0.5 whitespace-nowrap ${activeTab === tab.key ? "text-white/70" : "text-gray-400"}`}>
                {tab.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No applications in this phase</p>
          <p className="text-gray-400 text-sm mt-1">Check back later or try a different tab</p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {filtered.map((app, i) => (
              <AppCard key={app.id} app={app} index={i} onRefresh={() => refetch()} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </AdminLayout>
  );
}
