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
import AdminUsers from "./pages/admin/AdminUsers";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminSettings from "./pages/admin/AdminSettings";
import Apply from "./pages/Apply";
import JoinFlow from "./pages/JoinFlow";
import PendingApproval from "./pages/PendingApproval";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import WelcomeGuide from "./pages/WelcomeGuide";
import { AnimatePresence } from "framer-motion";

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
const GuardedWall = withProfileGuard(Wall);
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

        {/* Public routes */}
        <Route path="/" component={Home} />
        <Route path="/welcome" component={WelcomeGuide} />
        <Route path="/events" component={Events} />
        <Route path="/events/:id" component={EventDetail} />
        <Route path="/apply" component={Apply} />

        {/* Protected routes — require completed profile */}
        <Route path="/dashboard" component={GuardedDashboard} />
        <Route path="/profile" component={GuardedProfile} />
        <Route path="/wall" component={GuardedWall} />
        <Route path="/messages" component={GuardedMessages} />

        {/* Admin routes — admins skip profile check via RequireProfile logic */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/events" component={AdminEvents} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/applications" component={AdminApplications} />
        <Route path="/admin/settings" component={AdminSettings} />

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
