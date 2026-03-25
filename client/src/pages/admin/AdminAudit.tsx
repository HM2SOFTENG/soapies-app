import { trpc } from "@/lib/trpc";
import AdminLayout from "./AdminLayout";
import { motion } from "framer-motion";
import { ScrollText, Loader2 } from "lucide-react";

export default function AdminAudit() {
  const { data: logs, isLoading } = trpc.admin.auditLogs.useQuery();

  return (
    <AdminLayout title="Audit Log">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-md">
            <ScrollText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-black text-gray-800">Audit Log</h2>
            <p className="text-sm text-gray-400">Admin actions and activity history</p>
          </div>
        </div>

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
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Target Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Target ID</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Admin ID</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(!logs || logs.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400">
                        No audit logs yet
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, i) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-gray-50 hover:bg-pink-50/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-800">
                          <span className="px-2 py-1 rounded-lg bg-pink-50 text-pink-700 text-xs font-semibold">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{log.targetType ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{log.targetId ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{log.adminId}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  );
}
