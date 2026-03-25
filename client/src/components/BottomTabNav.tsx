import { useAuth } from "@/_core/hooks/useAuth";
import { motion } from "framer-motion";
import {
  Home,
  Calendar,
  Users,
  MessageCircle,
  User,
  Sparkles,
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface TabItem {
  icon: typeof Home;
  label: string;
  path: string;
  badge?: number;
  /** Renders as a larger, prominent center button */
  isCenter?: boolean;
}

interface BottomTabNavProps {
  unreadMessages?: number;
}

export default function BottomTabNav({ unreadMessages = 0 }: BottomTabNavProps) {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  const loggedOutTabs: TabItem[] = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Calendar, label: "Events", path: "/events" },
    { icon: Sparkles, label: "Join", path: "/join", isCenter: true },
    { icon: Users, label: "Community", path: "/wall" },
    { icon: User, label: "Login", path: "/login" },
  ];

  const loggedInTabs: TabItem[] = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Calendar, label: "Events", path: "/events" },
    { icon: MessageCircle, label: "Messages", path: "/messages", badge: unreadMessages || undefined },
    { icon: Users, label: "Community", path: "/wall" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const tabs = isAuthenticated ? loggedInTabs : loggedOutTabs;

  const isTabActive = (tab: TabItem): boolean => {
    if (tab.path === "/") return location === "/";
    if (tab.path === "/dashboard") return location === "/" || location === "/dashboard";
    return location === tab.path || location.startsWith(tab.path + "/");
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      role="tablist"
    >
      <div
        className="glass-strong border-t border-pink-100/30 bg-white/80 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const active = isTabActive(tab);
            const Icon = tab.icon;

            // ── Prominent center "Join" button ──
            if (tab.isCenter) {
              return (
                <Link key={tab.path} href={tab.path}>
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center justify-center relative cursor-pointer -mt-5"
                    role="tab"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-300/40 border-4 border-white"
                    >
                      <Icon size={24} className="text-white" strokeWidth={2.5} />
                    </motion.div>
                    <span className="text-[10px] mt-1 font-bold text-pink-600">
                      {tab.label}
                    </span>
                  </motion.div>
                </Link>
              );
            }

            // ── Standard tab ──
            return (
              <Link key={tab.path} href={tab.path}>
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className="flex flex-col items-center justify-center relative cursor-pointer py-1.5 px-2 min-w-[56px]"
                  role="tab"
                  aria-selected={active}
                >
                  <div className="relative">
                    <Icon
                      size={22}
                      className={`transition-colors duration-200 ${
                        active ? "text-pink-600" : "text-gray-400"
                      }`}
                      strokeWidth={active ? 2.5 : 2}
                    />

                    {/* Notification badge */}
                    {tab.badge && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-bold shadow-lg"
                      >
                        {tab.badge > 9 ? "9+" : tab.badge}
                      </motion.span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] mt-1 font-semibold transition-colors duration-200 ${
                      active ? "text-pink-600" : "text-gray-400"
                    }`}
                  >
                    {tab.label}
                  </span>

                  {/* Active indicator dot */}
                  {active && (
                    <motion.div
                      layoutId="bottomtab-active"
                      className="absolute -bottom-0.5 w-5 h-[3px] rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
