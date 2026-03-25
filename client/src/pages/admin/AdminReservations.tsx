import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Check, X, DollarSign, User, Calendar, Ticket,
  RefreshCw, AlertCircle, Clock, BadgeCheck,
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

// ─── RESERVATION CARD ────────────────────────────────────────────────────────
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

      {/* Payment method indicator */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
        <DollarSign className="h-4 w-4 text-blue-500" />
        <span className="text-sm text-blue-700 font-medium">
          Venmo payment — awaiting verification
        </span>
      </div>

      {/* Actions */}
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

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function AdminReservations() {
  const [processingId, setProcessingId] = useState<{ id: number; action: "confirm" | "reject" } | null>(null);
  const utils = trpc.useUtils();

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
    <AdminLayout title="Venmo Reservations">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-black text-gray-800">Venmo Reservations</h1>
            <p className="text-gray-500 text-sm mt-1">Review and confirm pending Venmo payments</p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="rounded-xl border-pink-200 text-pink-600 hover:bg-pink-50 gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

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

        {/* Content */}
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
      </div>
    </AdminLayout>
  );
}
