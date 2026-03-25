import AdminLayout from "./AdminLayout";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Check, X, Users, DollarSign, ClipboardList, Search,
  ChevronRight, Sparkles, AlertCircle, MapPin, Calendar, Zap,
  RefreshCw, Eye, XCircle, Clock, TrendingUp, FlaskConical, ExternalLink
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── TABS ───────────────────────────────────────────────────────────────
type TabType = "reservations" | "checkin" | "staff" | "finances" | "testResults";

// ─── WRISTBAND BADGE ────────────────────────────────────────────────────
function WristbandBadge({ color, size = "sm" }: { color?: string | null; size?: "sm" | "lg" }) {
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
    <span className={`inline-flex items-center gap-1 px-${size === "lg" ? "3" : "2"} py-${size === "lg" ? "1.5" : "0.5"} rounded-full text-${size === "lg" ? "sm" : "xs"} font-bold ${c.bg} ${c.text}`}>
      {c.emoji} {c.label}
    </span>
  );
}

// ─── RESERVATIONS TAB ───────────────────────────────────────────────────
function ReservationsTab({ eventId }: { eventId: number }) {
  const [search, setSearch] = useState("");
  const { data: reservations, isLoading } = trpc.reservations.byEvent.useQuery(
    { eventId },
    { retry: false }
  );
  const updateStatus = trpc.reservations.updateStatus.useMutation({
    onSuccess: () => toast.success("Reservation updated"),
  });

  const filtered = useMemo(() => {
    if (!reservations) return [];
    return (reservations as any[]).filter((r: any) => {
      if (!search) return true;
      const name = r.displayName || r.profile?.displayName || r.user?.name || "";
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [reservations, search]);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-50 border-yellow-200",
    confirmed: "bg-green-50 border-green-200",
    checked_in: "bg-blue-50 border-blue-200",
    cancelled: "bg-red-50 border-red-200",
    no_show: "bg-gray-50 border-gray-200",
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by guest name..."
          className="pl-12 rounded-xl border-pink-100"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 className="h-8 w-8 text-pink-400" />
          </motion.div>
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No reservations found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any, i: number) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-5 rounded-2xl border ${statusColors[r.status] || statusColors.pending}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{r.displayName || r.profile?.displayName || r.user?.name || "Unknown"}</p>
                  <p className="text-xs text-gray-500">{r.user?.email}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">{r.ticketType} × {r.quantity}</span>
                    <WristbandBadge color={r.wristbandColor} />
                  </div>
                  {r.partnerUserId && (
                    <p className="text-xs text-purple-600 mt-1 font-medium">👥 Couple ticket</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{format(new Date(r.createdAt), "MMM d, yyyy h:mm a")}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-800">${parseFloat(r.totalAmount || "0").toFixed(2)}</p>
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                    r.paymentStatus === "paid" ? "bg-green-200 text-green-800" :
                    r.paymentStatus === "failed" ? "bg-red-200 text-red-800" :
                    "bg-yellow-200 text-yellow-800"
                  }`}>{r.paymentStatus}</span>
                  <br />
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full mt-1 inline-block ${
                    r.status === "confirmed" ? "bg-green-200 text-green-800" :
                    r.status === "checked_in" ? "bg-blue-200 text-blue-800" :
                    r.status === "cancelled" ? "bg-red-200 text-red-800" :
                    r.status === "no_show" ? "bg-gray-200 text-gray-800" :
                    "bg-yellow-200 text-yellow-800"
                  }`}>{r.status}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 flex-wrap">
                {r.status !== "confirmed" && r.status !== "checked_in" && (
                  <Button
                    onClick={() => updateStatus.mutate({ id: r.id, status: "confirmed" })}
                    size="sm"
                    disabled={updateStatus.isPending}
                    className="bg-green-500 text-white rounded-lg text-xs gap-1"
                  >
                    {updateStatus.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Confirm
                  </Button>
                )}
                {r.status !== "checked_in" && r.status !== "cancelled" && (
                  <Button
                    onClick={() => updateStatus.mutate({ id: r.id, status: "checked_in" })}
                    size="sm"
                    disabled={updateStatus.isPending}
                    className="bg-blue-500 text-white rounded-lg text-xs gap-1"
                  >
                    {updateStatus.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                    Check In
                  </Button>
                )}
                {r.status !== "cancelled" && (
                  <Button
                    onClick={() => updateStatus.mutate({ id: r.id, status: "cancelled" })}
                    size="sm"
                    disabled={updateStatus.isPending}
                    variant="outline"
                    className="border-red-200 text-red-600 rounded-lg text-xs gap-1 hover:bg-red-50"
                  >
                    {updateStatus.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                    Cancel
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CHECK-IN TAB ───────────────────────────────────────────────────────
function CheckInTab({ eventId }: { eventId: number }) {
  const [search, setSearch] = useState("");
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);
  const { data: reservations } = trpc.reservations.byEvent.useQuery({ eventId });
  const updateStatus = trpc.reservations.updateStatus.useMutation({
    onSuccess: (_, variables) => {
      const res = reservations?.find((r: any) => r.id === variables.id);
      if (res) {
        setRecentCheckIns(prev => [{ ...res, checkedInAt: new Date() }, ...prev.slice(0, 9)]);
      }
      toast.success("Guest checked in!");
    },
  });

  const attendees = useMemo(() => {
    if (!reservations) return [];
    return reservations.filter((r: any) => r.status === "checked_in").length;
  }, [reservations]);

  const matching = useMemo(() => {
    if (!search || !reservations) return [];
    return (reservations as any[]).filter((r: any) => {
      const name = r.displayName || r.profile?.displayName || r.user?.name || "";
      return name.toLowerCase().includes(search.toLowerCase()) &&
        r.status !== "checked_in" &&
        r.status !== "cancelled";
    });
  }, [search, reservations]);

  return (
    <div className="space-y-6">
      {/* Live Attendee Count */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200"
      >
        <p className="text-sm font-bold text-blue-600 uppercase mb-1">Live Attendee Count</p>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl font-black text-blue-700">{attendees}</span>
          <span className="text-blue-600 font-semibold">guests checked in</span>
        </div>
      </motion.div>

      {/* Search & Check In */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-gray-700">Quick Check In</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type guest name..."
            className="pl-12 rounded-xl border-pink-100"
            autoComplete="off"
          />
        </div>

        {/* Matching Guests */}
        {search && (
          <motion.div className="space-y-2">
            {matching.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No matching guests</p>
            ) : (
              matching.map((r: any, i: number) => (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => updateStatus.mutate({ id: r.id, status: "checked_in" })}
                  className="w-full p-4 rounded-xl bg-white border border-pink-100 hover:border-pink-300 text-left transition-all"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{r.displayName || r.profile?.displayName || r.user?.name}</p>
                    <p className="text-xs text-gray-500">{r.ticketType} × {r.quantity}</p>
                    <div className="mt-1"><WristbandBadge color={r.wristbandColor} size="lg" /></div>
                  </div>
                </motion.button>
              ))
            )}
          </motion.div>
        )}
      </div>

      {/* Recent Check Ins */}
      {recentCheckIns.length > 0 && (
        <div className="pt-6 border-t border-gray-200">
          <h3 className="font-bold text-gray-800 mb-3">Recent Check Ins</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentCheckIns.map((r: any, i: number) => (
              <motion.div
                key={`${r.id}-${i}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-100"
              >
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{r.displayName || r.profile?.displayName || r.user?.name}</p>
                  <p className="text-xs text-gray-500">{format(new Date(r.checkedInAt || Date.now()), "h:mm a")}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STAFF TAB ──────────────────────────────────────────────────────────
function StaffTab({ eventId }: { eventId: number }) {
  const { data: operators } = trpc.operators.list.useQuery({ eventId });
  const { data: shifts } = trpc.shifts.list.useQuery({ eventId });
  const { data: checklist } = trpc.checklist.list.useQuery({ eventId });
  const removeOperator = trpc.operators.remove.useMutation({
    onSuccess: () => toast.success("Operator removed"),
  });
  const updateChecklistItem = trpc.checklist.update.useMutation({
    onSuccess: () => toast.success("Checklist updated"),
  });

  return (
    <div className="space-y-8">
      {/* Event Operators */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="font-display text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-pink-500" /> Event Operators
        </h3>
        {!operators || operators.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No operators assigned</p>
        ) : (
          <div className="space-y-2">
            {operators.map((op: any, i: number) => (
              <motion.div
                key={op.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl bg-white border border-pink-100"
              >
                <div>
                  <p className="font-semibold text-gray-800">{op.user?.name}</p>
                  <p className="text-xs text-gray-500">{op.role || "Operator"}</p>
                </div>
                <Button
                  onClick={() => removeOperator.mutate({ id: op.id })}
                  disabled={removeOperator.isPending}
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Shifts */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h3 className="font-display text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-pink-500" /> Volunteer Shifts
        </h3>
        {!shifts || shifts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No shifts created</p>
        ) : (
          <div className="space-y-2">
            {shifts.map((shift: any, i: number) => (
              <motion.div
                key={shift.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl bg-white border border-pink-100"
              >
                <p className="font-semibold text-gray-800">{shift.name}</p>
                <p className="text-xs text-gray-500">{format(new Date(shift.startTime), "h:mm a")} - {format(new Date(shift.endTime), "h:mm a")}</p>
                <p className="text-xs text-gray-600 mt-1">{shift.description}</p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Setup Checklist */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h3 className="font-display text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-pink-500" /> Setup Checklist
        </h3>
        {!checklist || checklist.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No checklist items</p>
        ) : (
          <div className="space-y-2">
            {checklist.map((item: any, i: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-4 rounded-xl border ${
                  item.isCompleted
                    ? "bg-green-50 border-green-200"
                    : "bg-white border-pink-100 hover:border-pink-300"
                }`}
              >
                <button
                  onClick={() => updateChecklistItem.mutate({ id: item.id, isCompleted: !item.isCompleted })}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    item.isCompleted
                      ? "bg-green-500 border-green-500"
                      : "border-gray-300 hover:border-pink-500"
                  }`}
                >
                  {item.isCompleted && <Check className="h-4 w-4 text-white" />}
                </button>
                <span className={`flex-1 ${item.isCompleted ? "line-through text-gray-400" : "text-gray-800 font-medium"}`}>
                  {item.task}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── FINANCES TAB ───────────────────────────────────────────────────────
function FinancesTab({ eventId }: { eventId: number }) {
  const { data: reservations } = trpc.reservations.byEvent.useQuery({ eventId });

  const stats = useMemo(() => {
    if (!reservations) return { total: 0, confirmed: 0, count: 0 };
    return {
      total: reservations.reduce((sum, r: any) => sum + parseFloat(r.totalAmount || "0"), 0),
      confirmed: reservations.filter((r: any) => r.status === "confirmed" || r.status === "checked_in").reduce((sum, r: any) => sum + parseFloat(r.totalAmount || "0"), 0),
      count: reservations.filter((r: any) => r.status === "confirmed" || r.status === "checked_in").length,
    };
  }, [reservations]);

  return (
    <div className="space-y-6">
      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200"
        >
          <p className="text-sm font-bold text-green-600 uppercase mb-2">Total Revenue</p>
          <div className="text-3xl font-black text-green-700">${stats.total.toFixed(2)}</div>
          <p className="text-xs text-green-600 mt-1">All reservations</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200"
        >
          <p className="text-sm font-bold text-blue-600 uppercase mb-2">Confirmed Revenue</p>
          <div className="text-3xl font-black text-blue-700">${stats.confirmed.toFixed(2)}</div>
          <p className="text-xs text-blue-600 mt-1">{stats.count} confirmed guests</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200"
        >
          <p className="text-sm font-bold text-purple-600 uppercase mb-2">Average Per Guest</p>
          <div className="text-3xl font-black text-purple-700">
            ${stats.count > 0 ? (stats.confirmed / stats.count).toFixed(2) : "0.00"}
          </div>
          <p className="text-xs text-purple-600 mt-1">Per confirmed reservation</p>
        </motion.div>
      </div>

      {/* Revenue Breakdown */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <h3 className="font-bold text-gray-800 mb-4">Reservation Breakdown</h3>
        <div className="space-y-2">
          {reservations && reservations.length > 0 ? (
            ["confirmed", "checked_in", "pending", "cancelled"].map((status) => {
              const items = reservations.filter((r: any) => r.status === status);
              const amount = items.reduce((sum, r: any) => sum + parseFloat(r.totalAmount || "0"), 0);
              return (
                <motion.div
                  key={status}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-100"
                >
                  <div>
                    <p className="font-semibold text-gray-800 capitalize">{status}</p>
                    <p className="text-xs text-gray-500">{items.length} reservations</p>
                  </div>
                  <p className="font-bold text-gray-800">${amount.toFixed(2)}</p>
                </motion.div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No reservations</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── TEST RESULTS TAB ───────────────────────────────────────────────────
function TestResultsTab({ eventId }: { eventId: number }) {
  const utils = trpc.useUtils();
  const { data: submissions, isLoading } = trpc.testResults.pending.useQuery({ eventId });
  const reviewMutation = trpc.testResults.review.useMutation({
    onSuccess: () => {
      toast.success("Review submitted");
      utils.testResults.pending.invalidate();
      utils.reservations.byEvent.invalidate({ eventId });
    },
    onError: (e: any) => toast.error(e.message || "Failed to review"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 text-pink-400 animate-spin" />
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <FlaskConical className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No pending test results</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((s: any, i: number) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="p-5 rounded-2xl border bg-cyan-50 border-cyan-200"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800">{s.user?.name || "Unknown"}</p>
              <p className="text-xs text-gray-500">{s.user?.email}</p>
              <p className="text-xs text-gray-500 mt-1">
                Submitted: {format(new Date(s.submittedAt), "MMM d, yyyy h:mm a")}
              </p>
              <a
                href={s.resultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-3 w-3" /> View Result
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => reviewMutation.mutate({ id: s.id, status: "approved" })}
                disabled={reviewMutation.isPending}
                size="sm"
                className="bg-green-500 text-white rounded-lg text-xs gap-1"
              >
                {reviewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Approve 💙
              </Button>
              <Button
                onClick={() => reviewMutation.mutate({ id: s.id, status: "rejected" })}
                disabled={reviewMutation.isPending}
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 rounded-lg text-xs gap-1 hover:bg-red-50"
              >
                {reviewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                Reject
              </Button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────
export default function AdminEventOps() {
  const { id } = useParams<{ id: string }>();
  const eventId = parseInt(id || "0");
  const [activeTab, setActiveTab] = useState<TabType>("reservations");

  const { data: event, isLoading } = trpc.events.byId.useQuery(
    { id: eventId },
    { retry: false }
  );

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: "reservations", label: "Reservations", icon: Users },
    { id: "checkin", label: "Check-In", icon: Eye },
    { id: "testResults", label: "Test Results", icon: FlaskConical },
    { id: "staff", label: "Staff", icon: Sparkles },
    { id: "finances", label: "Finances", icon: DollarSign },
  ];

  if (isLoading) {
    return (
      <AdminLayout title="Event Operations">
        <div className="flex justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 className="h-10 w-10 text-pink-400" />
          </motion.div>
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout title="Event Operations">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold text-gray-800 mb-2">Event Not Found</h2>
        </motion.div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`${event.title} - Operations`}>
      {/* Event Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold text-gray-800">{event.title}</h1>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-pink-500" />
                {format(new Date(event.startDate), "MMM d, yyyy")}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-pink-500" />
                {event.venue}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-pink-500" />
                {event.capacity} capacity
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "border-pink-500 text-pink-600"
                    : "border-transparent text-gray-600 hover:text-gray-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "reservations" && <ReservationsTab eventId={eventId} />}
          {activeTab === "checkin" && <CheckInTab eventId={eventId} />}
          {activeTab === "testResults" && <TestResultsTab eventId={eventId} />}
          {activeTab === "staff" && <StaffTab eventId={eventId} />}
          {activeTab === "finances" && <FinancesTab eventId={eventId} />}
        </motion.div>
      </AnimatePresence>
    </AdminLayout>
  );
}
