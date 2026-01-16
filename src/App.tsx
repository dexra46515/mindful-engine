import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Test from "./pages/Test";
import MobileApp from "./pages/MobileApp";
import Onboarding from "./pages/Onboarding";
import ParentDashboard from "./pages/ParentDashboard";
import { NativeAppProvider } from "./components/NativeAppProvider";

const queryClient = new QueryClient();

// Detect if running in native Capacitor app
const isNative = Capacitor.isNativePlatform();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {isNative ? (
          <NativeAppProvider>
            <Routes>
              <Route path="/" element={<MobileApp />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/parent" element={<ParentDashboard />} />
              <Route path="*" element={<MobileApp />} />
            </Routes>
          </NativeAppProvider>
        ) : (
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/parent" element={<ParentDashboard />} />
            <Route path="/test" element={<Test />} />
            <Route path="/mobile" element={<MobileApp />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
