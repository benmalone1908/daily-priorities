import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SupabaseProvider } from "@/contexts/SupabaseContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import RenewalsStatusPage from "./pages/RenewalsStatusPage";
import LaunchStatusPage from "./pages/LaunchStatusPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SupabaseProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/renewals-status"
                element={
                  <ProtectedRoute>
                    <RenewalsStatusPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/launch-status"
                element={
                  <ProtectedRoute>
                    <LaunchStatusPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Index />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SupabaseProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
