import { motion } from "framer-motion";
import { useLocation } from "wouter";
import Navbar from "./Navbar";
import BackButton from "./BackButton";

const pageVariants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(2px)" },
};

// Pages that are top-level — no back button needed
const TOP_LEVEL_PATHS = [
  "/",
  "/dashboard",
  "/events",
  "/wall",
  "/messages",
  "/members",
  "/login",
  "/register",
  "/join",
  "/pending",
  "/verify-email",
  "/forgot-password",
];

function isTopLevel(location: string): boolean {
  return TOP_LEVEL_PATHS.some(p => location === p);
}

export default function PageWrapper({
  children,
  className = "",
  withNavbar = true,
  withPadding = true,
}: {
  children: React.ReactNode;
  className?: string;
  withNavbar?: boolean;
  withPadding?: boolean;
}) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50/60 via-purple-50/30 to-pink-50/40 page-bg relative overflow-x-hidden">
      {withNavbar && <Navbar />}
      {withNavbar && !isTopLevel(location) && (
        <div className="absolute top-[68px] left-4 z-50">
          <BackButton variant="glass" />
        </div>
      )}
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className={`relative z-10 ${withNavbar ? "pt-16" : ""} ${withPadding ? "pb-20 md:pb-20 max-md:pb-28" : ""} ${className}`}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="text-center mb-12"
    >
      <h2 className="font-display text-3xl md:text-5xl font-black text-gradient">
        {children}
      </h2>
      {subtitle && <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-base leading-relaxed">{subtitle}</p>}
    </motion.div>
  );
}
