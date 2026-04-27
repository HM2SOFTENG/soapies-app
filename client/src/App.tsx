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
import ProfileEdit from "./pages/ProfileEdit";
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
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminReservations from "./pages/admin/AdminReservations";
import AdminTestResults from "./pages/admin/AdminTestResults";
import Tickets from "./pages/Tickets";
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
import ToS from "./pages/ToS";
import Privacy from "./pages/Privacy";
import AcceptInvite from "./pages/AcceptInvite";
import Members from "./pages/Members";
import MemberProfile from "./pages/MemberProfile";
import CommunityPage from "./pages/CommunityPage";
import UserSettings from "./pages/UserSettings";
import { AnimatePresence } from "framer-motion";
import BottomTabNav from "./components/BottomTabNav";
import IOSInstallBanner from "./components/IOSInstallBanner";
import { FloatingBubbles } from "./components/FloatingElements";
import { AnnouncementBanner } from "./components/AnnouncementBanner";
import { useLocation as useWouterLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

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
const GuardedProfileEdit = withProfileGuard(ProfileEdit);
const GuardedMessages = withProfileGuard(Messages);
const GuardedTickets = withProfileGuard(Tickets);
const GuardedSettings = withProfileGuard(UserSettings);
const GuardedWall = withProfileGuard(Wall);
const GuardedMembers = withProfileGuard(Members);

function Router() {
  const { isAuthenticated } = useAuth();

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
        <Route path="/welcome">{() => (isAuthenticated ? <WelcomeGuide /> : <Home />)}</Route>
        <Route path="/events">{() => (isAuthenticated ? <Events /> : <Home />)}</Route>
        <Route path="/events/:id">{() => (isAuthenticated ? <EventDetail /> : <Home />)}</Route>
        <Route path="/apply" component={Apply} />
        <Route path="/tos" component={ToS} />
        <Route path="/terms" component={ToS} />
        <Route path="/terms-and-conditions" component={ToS} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/privacy-policy" component={Privacy} />
        <Route path="/invite/:token" component={AcceptInvite} />

        {/* Protected routes — require completed profile */}
        <Route path="/dashboard" component={GuardedDashboard} />
        <Route path="/profile" component={GuardedProfile} />
        <Route path="/profile/edit" component={GuardedProfileEdit} />
        <Route path="/wall" component={GuardedWall} />
        <Route path="/messages" component={GuardedMessages} />
        <Route path="/tickets" component={GuardedTickets} />
        <Route path="/members" component={GuardedMembers} />
        <Route path="/u/:userId">{(params) => <RequireProfile><MemberProfile userId={params?.userId ? parseInt(params.userId) : undefined} /></RequireProfile>}</Route>
        <Route path="/settings" component={GuardedSettings} />

        {/* Community landing pages */}
        <Route path="/c/soapies">{() => (isAuthenticated ? <CommunityPage communityId="soapies" /> : <Home />)}</Route>
        <Route path="/c/groupies">{() => (isAuthenticated ? <CommunityPage communityId="groupies" /> : <Home />)}</Route>
        <Route path="/c/gaypeez">{() => (isAuthenticated ? <CommunityPage communityId="gaypeez" /> : <Home />)}</Route>

        {/* Admin routes — obfuscated paths, all protected by adminProcedure server-side */}
        <Route path="/cp" component={AdminDashboard} />
        <Route path="/cp/ev" component={AdminEvents} />
        <Route path="/cp/ev/:id" component={AdminEventOps} />
        <Route path="/cp/mb" component={AdminUsers} />
        <Route path="/cp/rx" component={AdminApplicationReview} />
        <Route path="/cp/cfg" component={AdminSettings} />
        <Route path="/cp/rf" component={AdminReferrals} />
        <Route path="/cp/iv" component={AdminInterviewSlots} />
        <Route path="/cp/lg" component={AdminAudit} />
        <Route path="/cp/al" component={AdminAuditLogs} />
        <Route path="/cp/an" component={AdminAnnouncements} />
        <Route path="/cp/rs" component={AdminReservations} />
        <Route path="/cp/tr" component={AdminTestResults} />
        {/* Legacy redirects so old bookmarks still work */}
        <Route path="/admin">{() => { window.location.replace("/cp"); return null; }}</Route>
        <Route path="/admin/:rest*">{() => { window.location.replace("/cp"); return null; }}</Route>

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

/** Pages where bottom tab nav should be hidden */
const HIDE_TABS_PATHS = ["/login", "/register", "/join", "/verify-email", "/forgot-password", "/pending", "/schedule-interview", "/admin", "/cp"];

function AppShell() {
  const [location] = useWouterLocation();
  const hideTabs = HIDE_TABS_PATHS.some(p => location.startsWith(p));
  const { isAuthenticated } = useAuth();
  const { data: unreadCounts } = trpc.messages.unreadCounts.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5_000,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
  const totalUnread = unreadCounts ? Object.values(unreadCounts as Record<string, number>).reduce((a: number, b: number) => a + b, 0) : 0;

  return (
    <>
      <AnnouncementBanner />
      {/* Persistent animated bubble background across the entire app */}
      <FloatingBubbles count={12} className="fixed inset-0 z-0 pointer-events-none opacity-40" />
      <div className="relative z-10">
        <Router />
      </div>
      {!hideTabs && <BottomTabNav unreadMessages={totalUnread} />}
      <IOSInstallBanner />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <AppShell />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
