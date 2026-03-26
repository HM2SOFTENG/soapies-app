import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Check, X, DollarSign, User, Calendar, Ticket,
  RefreshCw, AlertCircle, Clock, BadgeCheck, Download, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── STATUS BADGE ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    paid: { label: "Paid", cls: "bg-green-100 text-green-700 border-green-200" },
    failed: { label: "Failed", cls: "bg-red-100 text-red-700 border-red-200" },
    refunded: { label: "Refunded", cls: "bg-gray-100 text-gray-700 border-gray-200" },
    confirmed: { label: "Confirmed", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    cancelled: { label: "Cancelled", cls: "bg-red-50 text-red-600 border-red-100" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── TICKET TYPE LABEL ───────────────────────────────────────────────────────
function ticketLabel(type: string | null | undefined) {
  const map: Record<string, string> = {
    single_female: "👩 Single Woman",
    single_male: "👨 Single Man",
    couple: "💑 Couple",
    volunteer: "⭐ Volunteer",
  };
  return type ? (map[type] ?? type) : "—";
}

// ─── RESERVATION CARD (Venmo tab) ────────────────────────────────────────────
function ReservationCard({
  reservation,
  onConfirm,
  onReject,
  isConfirming,
  isRejecting,
}: {
  reservation: any;
  onConfirm: () => void;
  onReject: () => void;
  isConfirming: boolean;
  isRejecting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-5 rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-800">{reservation.user?.name ?? "Unknown"}</p>
            <p className="text-xs text-gray-500">{reservation.user?.email}</p>
          </div>
        </div>
        <StatusBadge status={reservation.paymentStatus} />
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="h-4 w-4 text-pink-400 flex-shrink-0" />
          <span className="truncate">{reservation.event?.title ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Ticket className="h-4 w-4 text-purple-400 flex-shrink-0" />
          <span>{ticketLabel(reservation.ticketType)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <DollarSign className="h-4 w-4 text-green-500 flex-shrink-0" />
          <span className="font-bold text-gray-800">${parseFloat(reservation.totalAmount || "0").toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-xs">{reservation.createdAt ? format(new Date(reservation.createdAt), "MMM d, h:mm a") : "—"}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
        <DollarSign className="h-4 w-4 text-blue-500" />
        <span className="text-sm text-blue-700 font-medium">Venmo payment — awaiting verification</span>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onReject}
          disabled={isRejecting || isConfirming}
          variant="outline"
          className="flex-1 border-red-200 text-red-600 hover:bg-red-50 rounded-xl gap-1"
        >
          {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Reject
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isConfirming || isRejecting}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl gap-1 shadow-lg shadow-green-200/50"
        >
          {isConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Confirm Payment
        </Button>
      </div>
    </motion.div>
  );
}

// ─── ALL RESERVATIONS TAB ────────────────────────────────────────────────────
function AllReservationsTab() {
  const [page, setPage] = useState(0);
  const [eventId, setEventId] = useState<number | undefined>();
  const [status, setStatus] = useState<string>("");
  const utils = trpc.useUtils();

  const { data: reservations, isLoading } = trpc.admin.allReservations.useQuery(
    { eventId, status: status || undefined, page },
    { retry: false, staleTime: 30_000 }
  );
  const { data: events } = trpc.events.all.useQuery(undefined, { retry: false });

  const confirm = trpc.admin.confirmReservation.useMutation({
    onSuccess: () => { toast.success("Confirmed ✅"); utils.admin.allReservations.invalidate(); },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });
  const reject = trpc.admin.rejectReservation.useMutation({
    onSuccess: () => { toast.success("Cancelled"); utils.admin.allReservations.invalidate(); },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  function exportCSV() {
    if (!reservations || reservations.length === 0) return;
    const headers = ["ID", "Member", "Event", "Ticket Type", "Payment Method", "Payment Status", "Check-in", "Amount", "Date"];
    const rows = reservations.map((r: any) => [
      r.id,
      r.displayName ?? "",
      r.eventTitle ?? "",
      r.ticketType ?? "",
      r.paymentMethod ?? "",
      r.paymentStatus ?? "",
      r.status === "checked_in" ? "Yes" : "No",
      r.totalAmount ?? "0",
      r.createdAt ? format(new Date(r.createdAt), "yyyy-MM-dd HH:mm") : "",
    ]);
    const csv = [headers, ...rows].map(row => row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservations-page${page + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white rounded-xl border border-pink-100/50 p-4 shadow-sm">
        <select
          value={eventId ?? ""}
          onChange={(e) => { setEventId(e.target.value ? Number(e.target.value) : undefined); setPage(0); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
        >
          <option value="">All Events</option>
          {(events ?? []).map((ev: any) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="confirmed">Confirmed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          className="ml-auto border-green-200 text-green-700 hover:bg-green-50 gap-1.5"
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-pink-400 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-pink-100/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-pink-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Member</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Event</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Ticket Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Method</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Payment</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Check-in</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(!reservations || reservations.length === 0) ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">No reservations found</td>
                  </tr>
                ) : (
                  reservations.map((r: any, i: number) => (
                    <tr
                      key={r.id}
                      className={`border-b border-gray-50 hover:bg-pink-50/20 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{r.displayName ?? `User #${r.userId}`}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{r.eventTitle ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{ticketLabel(r.ticketType)}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{r.paymentMethod ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.paymentStatus} /></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${r.status === "checked_in" ? "text-green-600" : "text-gray-400"}`}>
                          {r.status === "checked_in" ? "✅ Yes" : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">${parseFloat(r.totalAmount || "0").toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {r.paymentStatus !== "paid" && r.paymentStatus !== "confirmed" && (
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs bg-green-500 hover:bg-green-600 text-white"
                              onClick={() => confirm.mutate({ id: r.id })}
                            >
                              <Check className="h-3 w-3 mr-1" />Confirm
                            </Button>
                          )}
                          {r.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => reject.mutate({ id: r.id })}
                            >
                              <X className="h-3 w-3 mr-1" />Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">Page {page + 1}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="h-8 px-3">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={(reservations?.length ?? 0) < 20} onClick={() => setPage(p => p + 1)} className="h-8 px-3">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function AdminReservations() {
  const [tab, setTab] = useState<"venmo" | "all">("venmo");
  const [processingId, setProcessingId] = useState<{ id: number; action: "confirm" | "reject" } | null>(null);

  const { data: reservations, isLoading, refetch } = trpc.admin.pendingVenmoReservations.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const confirm = trpc.admin.confirmReservation.useMutation({
    onSuccess: () => {
      toast.success("Payment confirmed! User notified. ✅");
      setProcessingId(null);
      refetch();
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to confirm");
      setProcessingId(null);
    },
  });

  const reject = trpc.admin.rejectReservation.useMutation({
    onSuccess: () => {
      toast.success("Reservation rejected. User notified.");
      setProcessingId(null);
      refetch();
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to reject");
      setProcessingId(null);
    },
  });

  return (
    <AdminLayout title="Reservations">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-black text-gray-800">🎟 Reservations</h1>
            <p className="text-gray-500 text-sm mt-1">Manage all event reservations</p>
          </div>
          {tab === "venmo" && (
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="rounded-xl border-pink-200 text-pink-600 hover:bg-pink-50 gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
          {[
            { key: "venmo", label: "💳 Pending Venmo" },
            { key: "all", label: "📋 All Reservations" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as "venmo" | "all")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === t.key
                  ? "bg-white shadow text-gray-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "venmo" && (
          <>
            {/* Stats bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">
                    {isLoading ? "—" : `${reservations?.length ?? 0} pending`}
                  </p>
                  <p className="text-xs text-gray-500">Venmo payments awaiting verification</p>
                </div>
                {!isLoading && reservations && reservations.length > 0 && (
                  <div className="ml-auto">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold border border-yellow-200">
                      <AlertCircle className="h-3 w-3" />
                      Needs Review
                    </span>
                  </div>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Loader2 className="h-10 w-10 text-pink-400" />
                </motion.div>
                <p className="text-sm text-gray-400">Loading reservations...</p>
              </div>
            ) : !reservations || reservations.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mb-4">
                  <BadgeCheck className="h-10 w-10 text-green-500" />
                </div>
                <h3 className="font-bold text-gray-700 text-lg mb-1">All clear!</h3>
                <p className="text-gray-400 text-sm">No pending Venmo reservations to review.</p>
              </motion.div>
            ) : (
              <AnimatePresence>
                <div className="space-y-4">
                  {reservations.map((r: any) => (
                    <ReservationCard
                      key={r.id}
                      reservation={r}
                      isConfirming={processingId?.id === r.id && processingId?.action === "confirm"}
                      isRejecting={processingId?.id === r.id && processingId?.action === "reject"}
                      onConfirm={() => {
                        setProcessingId({ id: r.id, action: "confirm" });
                        confirm.mutate({ id: r.id });
                      }}
                      onReject={() => {
                        setProcessingId({ id: r.id, action: "reject" });
                        reject.mutate({ id: r.id });
                      }}
                    />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </>
        )}

        {tab === "all" && <AllReservationsTab />}
      </div>
    </AdminLayout>
  );
}
