import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { Users, Loader2, Search, Shield, User, Mail, Clock, MoreHorizontal } from "lucide-react";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminUsers() {
  const { data: users, isLoading } = trpc.admin.users.useQuery(undefined, {
    retry: false, staleTime: 15_000, refetchOnWindowFocus: false,
  });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = useMemo(() => {
    if (!users) return [];
    return users.filter((u: any) => {
      const q = search.toLowerCase();
      const matchSearch = !search || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const adminCount = users?.filter((u: any) => u.role === "admin").length || 0;
  const userCount = users?.filter((u: any) => u.role === "user").length || 0;

  return (
    <AdminLayout title="User Management">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total", value: users?.length || 0, gradient: "from-pink-400 to-rose-500" },
          { label: "Members", value: userCount, gradient: "from-purple-400 to-indigo-500" },
          { label: "Admins", value: adminCount, gradient: "from-fuchsia-400 to-pink-500" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-pink-100/50 text-center"
          >
            <p className="text-2xl font-black text-gray-800">{stat.value}</p>
            <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-pink-100 bg-white/70 text-sm outline-none focus:border-pink-300 focus:ring-1 focus:ring-pink-200/50 placeholder:text-gray-300"
          />
        </div>
        <div className="flex gap-1.5">
          {["all", "user", "admin"].map(role => (
            <motion.button
              key={role}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roleFilter === role
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md"
                  : "bg-white/70 text-gray-500 border border-pink-100"
              }`}
            >
              {role === "all" ? "All" : role.charAt(0).toUpperCase() + role.slice(1) + "s"}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
          <p className="text-sm text-gray-400">Loading users...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white/80 backdrop-blur-sm rounded-2xl border border-pink-100/50">
          <Users className="h-12 w-12 text-pink-200 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">{search ? "No users match your search" : "No users yet"}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white/80 backdrop-blur-sm rounded-2xl border border-pink-100/50 shadow-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-pink-100/50 bg-pink-50/30">
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Last Active</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u: any, i: number) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-pink-50/50 hover:bg-pink-50/30 transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center shadow-md"
                        >
                          <span className="text-xs font-black text-white">{u.name?.charAt(0)?.toUpperCase() || "?"}</span>
                        </motion.div>
                        <span className="text-sm font-bold text-gray-800">{u.name || "Anonymous"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{u.email || "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        u.role === "admin"
                          ? "bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-600 border border-purple-100"
                          : "bg-pink-50 text-pink-600 border border-pink-100"
                      }`}>
                        {u.role === "admin" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">{format(new Date(u.createdAt), "MMM d, yyyy")}</td>
                    <td className="px-5 py-4 text-xs text-gray-400">{format(new Date(u.lastSignedIn), "MMM d, h:mm a")}</td>
                    <td className="px-5 py-4">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={() => toast("User management coming soon!", { icon: "🚀" })}
                        className="p-1.5 rounded-lg hover:bg-pink-50 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((u: any, i: number) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-pink-100/50"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center shadow-md">
                    <span className="text-sm font-black text-white">{u.name?.charAt(0)?.toUpperCase() || "?"}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800">{u.name || "Anonymous"}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      u.role === "admin" ? "bg-purple-50 text-purple-600" : "bg-pink-50 text-pink-600"
                    }`}>
                      {u.role === "admin" ? <Shield className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                      {u.role}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-gray-400">
                  {u.email && (
                    <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {u.email}</p>
                  )}
                  <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Joined {format(new Date(u.createdAt), "MMM d, yyyy")}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
