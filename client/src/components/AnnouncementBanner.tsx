import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const DISMISSED_KEY = "soapies_dismissed_announcements";

function getDismissedLocal(): number[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function addDismissedLocal(id: number) {
  const current = getDismissedLocal();
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...new Set([...current, id])]));
}

export function AnnouncementBanner() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: announcements } = trpc.announcements.active.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });
  const dismissMutation = trpc.announcements.dismiss.useMutation({
    onSuccess: () => utils.announcements.active.invalidate(),
  });

  const [localDismissed, setLocalDismissed] = useState<number[]>(getDismissedLocal);
  const [visible, setVisible] = useState(true);

  // Find first announcement that hasn't been locally dismissed
  const announcement = announcements?.find(a => !localDismissed.includes(a.id));

  const handleDismiss = () => {
    if (!announcement) return;
    addDismissedLocal(announcement.id);
    setLocalDismissed(prev => [...prev, announcement.id]);
    if (isAuthenticated && announcement.dismissible) {
      dismissMutation.mutate({ announcementId: announcement.id });
    }
    setVisible(false);
    // Allow next announcement to show after animation
    setTimeout(() => setVisible(true), 300);
  };

  if (!announcement) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={announcement.id}
          initial={{ opacity: 0, y: -48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -48 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative z-50 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 shadow-md"
        >
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {announcement.title && (
                <span className="font-bold text-white text-sm mr-2">{announcement.title}:</span>
              )}
              <span className="text-white/90 text-sm">{announcement.content}</span>
            </div>
            {announcement.dismissible !== false && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDismiss}
                className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Dismiss announcement"
              >
                <X className="h-4 w-4 text-white" />
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
