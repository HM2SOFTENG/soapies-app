import AdminLayout from "./AdminLayout";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  Users, Calendar, CreditCard, Activity, Zap,
  ArrowUpRight, BarChart3, Clock, Sparkles, Target,
  FileText, Share2, ClipboardList, ScrollText, ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";

// ─── ANIMATED COUNTER ──────────────────────────────────────────────────────
function AnimatedCounter({ target, duration = 1.5 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{count.toLocaleString()}</>;
}

// ─── MINI SPARKLINE ────────────────────────────────────────────────────────
function MiniSparkline({ color }: { color: string }) {
  const points = Array.from({ length: 12 }, () => 20 + Math.random() * 60);
  const max = Math.max(...points);
  const min = Math.min(...points);
  const norm = points.map(p => ((p - min) / (max - min || 1)) * 30);
  const d = norm.map((y, i) => `${i === 0 ? "M" : "L"} ${i * 10} ${35 - y}`).join(" ");

  return (
    <svg width="110" height="35" viewBox="0 0 110 35" className="opacity-40">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L 110 35 L 0 35 Z`} fill={`url(#spark-${color})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminDashboard() {
  const { data: stats } = trpc.admin.stats.useQuery(undefined, {
    retry: false, staleTime: 30_000, refetchOnWindowFocus: false,
  });
  const { data: pendingApps } = trpc.admin.pendingApplications.useQuery(undefined, {
    retry: false, staleTime: 30_000, refetchOnWindowFocus: false,
  });

  const pendingCount = pendingApps?.length ?? 0;

  const statCards = [
    { label: "Total Members", value: stats?.totalUsers ?? 0, icon: Users, gradient: "from-pink-400 to-rose-500", sparkColor: "#ec4899", change: "+12%" },
    { label: "Total Events", value: stats?.totalEvents ?? 0, icon: Calendar, gradient: "from-purple-400 to-indigo-500", sparkColor: "#a855f7", change: "+8%" },
    { label: "Reservations", value: stats?.totalReservations ?? 0, icon: CreditCard, gradient: "from-fuchsia-400 to-pink-500", sparkColor: "#d946ef", change: "+24%" },
    { label: "Pending Apps", value: stats?.pendingApplications ?? 0, icon: Clock, gradient: "from-violet-400 to-purple-500", sparkColor: "#8b5cf6", change: "Review" },
  ];

  const quickLinks = [
    { label: "Applications", desc: "Review applicants", href: "/admin/applications", icon: FileText, gradient: "from-pink-500 to-rose-500", badge: pendingCount },
    { label: "Referrals", desc: "Referral pipeline", href: "/admin/referrals", icon: Share2, gradient: "from-purple-500 to-indigo-500" },
    { label: "Event Ops", desc: "Manage operations", href: "/admin/events", icon: ClipboardList, gradient: "from-fuchsia-500 to-pink-500" },
    { label: "Audit Log", desc: "Admin activity", href: "/admin/settings", icon: ScrollText, gradient: "from-violet-500 to-purple-500" },
  ];

  const quickActions = [
    { label: "Create Event", desc: "Schedule a new party", href: "/admin/events", icon: Calendar, gradient: "from-pink-500 to-rose-500" },
    { label: "Manage Users", desc: "View all members", href: "/admin/users", icon: Users, gradient: "from-purple-500 to-indigo-500" },
    { label: "Applications", desc: "Review new signups", href: "/admin/applications", icon: Target, gradient: "from-fuchsia-500 to-pink-500" },
    { label: "Interview Slots", desc: "Manage call availability", href: "/admin/interview-slots", icon: Clock, gradient: "from-blue-500 to-cyan-500" },
    { label: "Referrals", desc: "Track referral pipeline", href: "/admin/referrals", icon: Share2, gradient: "from-emerald-500 to-teal-500" },
    { label: "Settings", desc: "Configure platform", href: "/admin/settings", icon: Zap, gradient: "from-violet-500 to-purple-500" },
  ];

  return (
    <AdminLayout title="Dashboard">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 p-6 sm:p-8 mb-8"
      >
        <div className="absolute inset-0 opacity-10">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -20, 0], x: [0, 10, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.5 }}
              className="absolute w-32 h-32 rounded-full bg-white"
              style={{ left: `${15 + i * 20}%`, top: `${10 + (i % 3) * 30}%` }}
            />
          ))}
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-6 w-6 text-white/80" />
            <h2 className="font-display text-2xl sm:text-3xl font-black text-white">Welcome back, Admin</h2>
          </div>
          <p className="text-white/70 text-sm sm:text-base max-w-lg">
            Here's what's happening with your Soapies community today. Keep the vibes going!
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-8">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-pink-100/50 shadow-lg shadow-pink-50/30 overflow-hidden group"
          >
            {/* Background sparkline */}
            <div className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <MiniSparkline color={card.sparkColor} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <motion.div
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  className={`p-2.5 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}
                >
                  <card.icon className="h-5 w-5 text-white" />
                </motion.div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                  <ArrowUpRight className="h-2.5 w-2.5" /> {card.change}
                </span>
              </div>
              <p className="text-3xl font-black text-gray-800 mb-1">
                <AnimatedCounter target={card.value} />
              </p>
              <p className="text-sm text-gray-400 font-medium">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {quickLinks.map((link, i) => (
          <Link key={link.label} href={link.href}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.06, type: "spring", stiffness: 200 }}
              whileHover={{ y: -3, scale: 1.02 }}
              className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-pink-100/50 shadow-md hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
            >
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${link.gradient} shadow-md w-fit mb-3`}>
                <link.icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm font-bold text-gray-800">{link.label}</p>
              <p className="text-[11px] text-gray-400">{link.desc}</p>
              {link.badge && link.badge > 0 && (
                <span className="absolute top-3 right-3 bg-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {link.badge > 9 ? "9+" : link.badge}
                </span>
              )}
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6">
        {/* Pending Applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-3 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-pink-100/50 shadow-lg shadow-pink-50/30"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-bold text-gray-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-pink-500" /> Pending Applications
            </h3>
            <Link href="/admin/applications">
              <span className="text-xs text-pink-500 hover:text-pink-700 font-semibold flex items-center gap-1 cursor-pointer">
                View All <ChevronRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
          {!pendingApps || pendingApps.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No pending applications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApps.slice(0, 3).map((app: any, i: number) => {
                const name = app.displayName || "Anonymous";
                const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                const phase = app.applicationPhase;
                const phaseLabel = phase ? phase.replace(/_/g, " ") : app.applicationStatus;
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.06 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-pink-50/50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-sm text-white text-xs font-bold flex-shrink-0">
                      {initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">{name}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{phaseLabel} · {new Date(app.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Link href="/admin/applications">
                      <span className="text-xs text-pink-500 font-semibold hover:text-pink-700 cursor-pointer whitespace-nowrap">Review →</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
          {pendingApps && pendingApps.length > 3 && (
            <Link href="/admin/applications">
              <p className="text-xs text-center text-pink-400 hover:text-pink-600 pt-4 border-t border-pink-50 mt-4 cursor-pointer font-medium">
                +{pendingApps.length - 3} more applications → Review All
              </p>
            </Link>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-pink-100/50 shadow-lg shadow-pink-50/30"
        >
          <h3 className="font-display text-lg font-bold text-gray-800 flex items-center gap-2 mb-5">
            <Zap className="h-5 w-5 text-purple-500" /> Quick Actions
          </h3>
          <div className="space-y-3">
            {quickActions.map((action, i) => (
              <Link key={action.label} href={action.href}>
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.06 }}
                  whileHover={{ x: 4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-pink-100/30 hover:border-pink-200 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${action.gradient} shadow-md group-hover:shadow-lg transition-shadow`}>
                    <action.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900">{action.label}</p>
                    <p className="text-[10px] text-gray-400">{action.desc}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-pink-500 transition-colors" />
                </motion.div>
              </Link>
            ))}
          </div>

          {/* Platform Health */}
          <div className="mt-6 pt-5 border-t border-pink-50">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3" /> Platform Health
            </h4>
            <div className="space-y-3">
              {[
                { label: "Server Uptime", value: 99.9, color: "bg-emerald-400" },
                { label: "Response Time", value: 85, color: "bg-pink-400" },
                { label: "User Satisfaction", value: 92, color: "bg-purple-400" },
              ].map(metric => (
                <div key={metric.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 font-medium">{metric.label}</span>
                    <span className="text-gray-700 font-bold">{metric.value}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.value}%` }}
                      transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${metric.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
