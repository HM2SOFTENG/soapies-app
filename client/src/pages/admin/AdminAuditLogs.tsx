import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { ScrollText, Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format } from "date-fns";

const ACTION_OPTIONS = [
  "All",
  "reservation_confirmed",
  "reservation_rejected",
  "user_approved",
  "user_rejected",
  "user_suspended",
  "event_created",
  "event_updated",
  "setting_updated",
  "application_approved",
  "application_rejected",
];

export default function AdminAuditLogs() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: logs, isLoading } = trpc.admin.auditLogs.useQuery(
    { page, action: actionFilter || undefined },
    { retry: false, staleTime: 30_000, refetchOnWindowFocus: false }
  );

  const filtered = (logs ?? []).filter((log) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.action?.toLowerCase().includes(s) ||
      log.adminName?.toLowerCase().includes(s) ||
      log.targetType?.toLowerCase().includes(s) ||
      String(log.targetId ?? "").includes(s)
    );
  });

  return (
    <AdminLayout title="Audit Logs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-md">
            <ScrollText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-black text-gray-800">Audit Logs</h2>
            <p className="text-sm text-gray-400">Admin actions and activity history</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-white rounded-xl border border-pink-100/50 p-4 shadow-sm">
          {/* Action dropdown */}
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value === "All" ? "" : e.target.value); setPage(0); }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a === "All" ? "" : a}>{a}</option>
            ))}
          </select>

          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[180px] border border-gray-200 rounded-lg px-3 py-2 bg-white">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search logs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm text-gray-700 bg-transparent outline-none w-full"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-pink-400 animate-spin" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-pink-100/50 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-pink-50 to-purple-50 border-b border-pink-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Timestamp</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Admin</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Target</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400">
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((log, i) => (
                      <tr
                        key={log.id}
                        className={`border-b border-gray-50 hover:bg-pink-50/30 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                      >
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {log.createdAt ? format(new Date(log.createdAt), "MMM d, yyyy HH:mm") : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-medium">
                          {log.adminName ?? `Admin #${log.adminId}`}
                          {log.adminEmail && (
                            <div className="text-xs text-gray-400">{log.adminEmail}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-mono font-semibold border border-purple-100">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {log.targetType && (
                            <span className="text-xs">
                              {log.targetType}
                              {log.targetId ? <span className="text-gray-400"> #{log.targetId}</span> : null}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px]">
                          {log.details ? (
                            <span className="font-mono truncate block" title={JSON.stringify(log.details)}>
                              {JSON.stringify(log.details).slice(0, 80)}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Page {page + 1} · Showing {filtered.length} entries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="h-8 px-3"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(logs?.length ?? 0) < 20}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 px-3"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}
