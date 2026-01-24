import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TelegramAuthProvider } from "./contexts/TelegramAuthContext";
import Index from "./pages/Index";
import AISeller from "./pages/AISeller";
import AISellerResult from "./pages/AISellerResult";
import AISellerPlans from "./pages/AISellerPlans";
import AISellerPlanDetails from "./pages/AISellerPlanDetails";
import CalculatorStep1 from "./pages/CalculatorStep1";
import CalculatorStep2 from "./pages/CalculatorStep2";
import CalculatorStep3 from "./pages/CalculatorStep3";
import CalculatorStep4 from "./pages/CalculatorStep4";
import CalculatorStep5 from "./pages/CalculatorStep5";
import CalculatorStep6 from "./pages/CalculatorStep6";
import CalculatorStep7 from "./pages/CalculatorStep7";
import CalculatorStep8 from "./pages/CalculatorStep8";
import ExpertSelection from "./pages/ExpertSelection";
import ExpertHistory from "./pages/ExpertHistory";
import TelegramProfile from "./pages/TelegramProfile";
import AdminCRM from "./pages/AdminCRM";
import CRMDashboard from "./pages/CRMDashboard";
import CRMAdmins from "./pages/CRMAdmins";
import CRMMessageConstructor from "./pages/CRMMessageConstructor";
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
            <Route path="/profile/:telegramId" element={<TelegramProfile />} />
            {/* AI Seller Flow */}
            <Route path="/ai-seller" element={<AISeller />} />
            <Route path="/ai-seller/result" element={<AISellerResult />} />
            <Route path="/ai-seller/plans" element={<AISellerPlans />} />
            <Route path="/ai-seller/plan/:planLevel" element={<AISellerPlanDetails />} />
            {/* Calculator Flow - Multi-page */}
            <Route path="/calculator" element={<CalculatorStep1 />} />
            <Route path="/calculator/step1" element={<CalculatorStep1 />} />
            <Route path="/calculator/step2" element={<CalculatorStep2 />} />
            <Route path="/calculator/step3" element={<CalculatorStep3 />} />
            <Route path="/calculator/step4" element={<CalculatorStep4 />} />
            <Route path="/calculator/step5" element={<CalculatorStep5 />} />
            <Route path="/calculator/step6" element={<CalculatorStep6 />} />
            <Route path="/calculator/step7" element={<CalculatorStep7 />} />
            <Route path="/calculator/step8" element={<CalculatorStep8 />} />
            {/* Experts */}
            <Route path="/experts" element={<ExpertSelection />} />
            <Route path="/experts/history" element={<ExpertHistory />} />
            {/* Admin CRM */}
            <Route path="/admin/crm" element={<AdminCRM />} />
            <Route path="/admin/crm/dashboard" element={<CRMDashboard />} />
            <Route path="/admin/crm/admins" element={<CRMAdmins />} />
            <Route path="/admin/crm/messages" element={<CRMMessageConstructor />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TelegramAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
