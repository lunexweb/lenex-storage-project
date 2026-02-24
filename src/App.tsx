import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { SettingsProvider } from "@/context/SettingsContext";
import AppLayout from "@/components/layout/AppLayout";
import InstallPrompt from "@/components/InstallPrompt";
import DashboardPage from "@/pages/DashboardPage";
import FilesPage from "@/pages/FilesPage";
import FilePage from "@/pages/FilePage";
import ProjectPage from "@/pages/ProjectPage";
import TemplatesPage from "@/pages/TemplatesPage";
import SettingsPage from "@/pages/SettingsPage";
import ClientPortal from "@/pages/ClientPortal";
import UploadRequestPage from "@/pages/UploadRequestPage";
import ViewSharePage from "@/pages/ViewSharePage";
import FormPage from "@/pages/FormPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import OnboardingPage from "@/pages/OnboardingPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function LoginRoute() {
  const { isLoggedIn, onboardingComplete } = useAuth();
  if (isLoggedIn && onboardingComplete) return <Navigate to="/" replace />;
  if (isLoggedIn) return <Navigate to="/onboarding" replace />;
  return <LoginPage />;
}

function SignupRoute() {
  const { isLoggedIn, onboardingComplete } = useAuth();
  if (isLoggedIn && onboardingComplete) return <Navigate to="/" replace />;
  if (isLoggedIn) return <Navigate to="/onboarding" replace />;
  return <SignupPage />;
}

function OnboardingRoute() {
  const { isLoggedIn, onboardingComplete } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (onboardingComplete) return <Navigate to="/" replace />;
  return <OnboardingPage />;
}

function AppRoute() {
  const { isLoggedIn, onboardingComplete } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />;
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/file/:fileId" element={<FilePage />} />
        <Route path="/file/:fileId/project/:projectId" element={<ProjectPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <SettingsProvider>
            <DataProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                  <Route path="/portal" element={<ClientPortal />} />
                  <Route path="/form" element={<FormPage />} />
                  <Route path="/request" element={<UploadRequestPage />} />
                  <Route path="/view" element={<ViewSharePage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/login" element={<LoginRoute />} />
                  <Route path="/signup" element={<SignupRoute />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/onboarding" element={<OnboardingRoute />} />
                  <Route path="/*" element={<AppRoute />} />
                </Routes>
              </BrowserRouter>
            </DataProvider>
          </SettingsProvider>
        </AuthProvider>
        <InstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
