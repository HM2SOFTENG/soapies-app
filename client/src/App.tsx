import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { RequireProfile } from "./components/RequireProfile";
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Wall from "./pages/Wall";
import Messages from "./pages/Messages";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminEventOps from "./pages/admin/AdminEventOps";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminApplicationReview from "./pages/admin/AdminApplicationReview";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminInterviewSlots from "./pages/admin/AdminInterviewSlots";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import Apply from "./pages/Apply";
import JoinFlow from "./pages/JoinFlow";
import PendingApproval from "./pages/PendingApproval";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import WelcomeGuide from "./pages/WelcomeGuide";
import ScheduleInterview from "./pages/ScheduleInterview";
import Waiver from "./pages/Waiver";
import ProfileSetup from "./pages/ProfileSetup";
import { AnimatePresence } from "framer-motion";
import BottomTabNav from "./components/BottomTabNav";
import { FloatingBubbles } from "./components/FloatingElements";
import { AnnouncementBanner } from "./components/AnnouncementBanner";
import { useLocation as useWouterLocation } from "wouter";

/** Wraps a component with the RequireProfile guard */
function withProfileGuard(Component: React.ComponentType<any>) {
  return function GuardedComponent(props: any) {
    return (
      <RequireProfile>
        <Component {...props} />
      </RequireProfile>
    );
  };
}

// Guarded versions of protected pages
const GuardedDashboard = withProfileGuard(Dashboard);
const GuardedProfile = withProfileGuard(Profile);
const GuardedMessages = withProfileGuard(Messages);

function Router() {
  return (
    <AnimatePresence mode="wait">
      <Switch>
        {/* Auth routes */}
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/join" component={JoinFlow} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/pending" component={PendingApproval} />
        <Route path="/schedule-interview" component={ScheduleInterview} />
        <Route path="/waiver" component={Waiver} />
        <Route path="/profile-setup" component={ProfileSetup} />

        {/* Public routes */}
        <Route path="/" component={Home} />
        <Route path="/welcome" component={WelcomeGuide} />
        <Route path="/events" component={Events} />
        <Route path="/events/:id" component={EventDetail} />
        <Route path="/apply" component={Apply} />

        {/* Protected routes — require completed profile */}
        <Route path="/dashboard" component={GuardedDashboard} />
        <Route path="/profile" component={GuardedProfile} />
        <Route path="/wall" component={Wall} />
        <Route path="/messages" component={GuardedMessages} />

        {/* Admin routes — admins skip profile check via RequireProfile logic */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/events" component={AdminEvents} />
        <Route path="/admin/events/:id" component={AdminEventOps} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/applications" component={AdminApplicationReview} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/referrals" component={AdminReferrals} />
        <Route path="/admin/interview-slots" component={AdminInterviewSlots} />
        <Route path="/admin/audit" component={AdminAudit} />
        <Route path="/admin/announcements" component={AdminAnnouncements} />

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

/** Pages where bottom tab nav should be hidden */
const HIDE_TABS_PATHS = ["/login", "/register", "/join", "/verify-email", "/forgot-password", "/pending", "/schedule-interview", "/admin"];

function AppShell() {
  const [location] = useWouterLocation();
  const hideTabs = HIDE_TABS_PATHS.some(p => location.startsWith(p));

  return (
    <>
      <AnnouncementBanner />
      {/* Persistent animated bubble background across the entire app */}
      <FloatingBubbles count={12} className="fixed inset-0 z-0 pointer-events-none opacity-40" />
      <div className="relative z-10">
        <Router />
      </div>
      {!hideTabs && <BottomTabNav />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <AppShell />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
