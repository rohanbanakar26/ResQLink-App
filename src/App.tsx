import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppDataProvider } from "./context/AppDataContext";
import AppHeader from "./components/AppHeader";
import BottomNav from "./components/BottomNav";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import EmergencyPage from "./pages/EmergencyPage";
import RequestsPage from "./pages/RequestsPage";
import MapPage from "./pages/MapPage";
import NetworkPage from "./pages/NetworkPage";
import ProfilePage from "./pages/ProfilePage";
import ResourcesPage from "./pages/ResourcesPage";
import ChatPage from "./pages/ChatPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import RewardsPage from "./pages/RewardsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppDataProvider>
          <div className="min-h-screen bg-background flex flex-col">
            <AppHeader />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/emergency" element={<EmergencyPage />} />
                <Route path="/requests" element={<RequestsPage />} />
                <Route path="/requests/:requestId/chat" element={<ChatPage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/network" element={<NetworkPage />} />
                <Route path="/resources" element={<ResourcesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/rewards" element={<RewardsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <BottomNav />
          </div>
        </AppDataProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
