import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminReferrals() {
  const { data: pipeline, isLoading } = trpc.referrals.adminList.useQuery();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Referral Pipeline</h1>
      <p className="text-gray-500 mb-6">Track referred members from application to first reservation.</p>

      {isLoading ? (
        <div className="text-gray-400 py-12 text-center">Loading referral data…</div>
      ) : !pipeline || pipeline.length === 0 ? (
        <div className="text-gray-400 py-12 text-center">No referrals yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Referrer</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Referred Member</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Applied</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Converted</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Conversion Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pipeline.map((row) => (
                <tr key={row.referredProfileId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.referrerName ?? <span className="text-gray-400 italic">Unknown</span>}
                  </td>
                  <td className="px-4 py-3">
                    <code className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">
                      {row.referredByCode}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row.referredDisplayName ?? <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {row.referredAppliedAt
                      ? format(new Date(row.referredAppliedAt), "MMM d, yyyy")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.referralConverted ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">✓ Converted</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-400">Pending</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {row.referralConvertedAt
                      ? format(new Date(row.referralConvertedAt), "MMM d, yyyy")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
