import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TelegramAuthProvider } from "./contexts/TelegramAuthContext";
import Index from "./pages/Index";
import ExpertSelection from "./pages/ExpertSelection";
import ExpertHistory from "./pages/ExpertHistory";
import TelegramProfile from "./pages/TelegramProfile";
import AdminCRM from "./pages/AdminCRM";
import CRMDashboard from "./pages/CRMDashboard";
import CRMAdmins from "./pages/CRMAdmins";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TelegramAuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/profile" element={<TelegramProfile />} />
            <Route path="/experts" element={<ExpertSelection />} />
            <Route path="/experts/history" element={<ExpertHistory />} />
            <Route path="/admin/crm" element={<AdminCRM />} />
            <Route path="/admin/crm/dashboard" element={<CRMDashboard />} />
            <Route path="/admin/crm/admins" element={<CRMAdmins />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TelegramAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
