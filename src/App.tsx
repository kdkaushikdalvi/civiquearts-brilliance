import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import ProtectedRoute from "@/components/pm/ProtectedRoute";
import Dashboard from "@/pages/pm/Dashboard";
import Assignments from "@/pages/pm/Assignments";
import ProjectMaster from "@/pages/pm/ProjectMaster";
import EmployeeMaster from "@/pages/pm/EmployeeMaster";
import DownloadInvoices from "@/pages/pm/DownloadInvoices";
import UploadCsv from "@/pages/pm/UploadCsv";
import GenerateCapProjectsList from "@/pages/pm/GenerateCapProjectsList";
import ClientInvoice from "@/pages/pm/ClientInvoice";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
              <Route
                path="/app/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/projects"
                element={
                  <ProtectedRoute>
                    <Assignments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/master/project"
                element={
                  <ProtectedRoute>
                    <ProjectMaster />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/master/employee"
                element={
                  <ProtectedRoute>
                    <EmployeeMaster />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/download-invoices"
                element={
                  <ProtectedRoute>
                    <DownloadInvoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/upload-csv"
                element={
                  <ProtectedRoute>
                    <UploadCsv />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/cap-projects-list"
                element={
                  <ProtectedRoute>
                    <GenerateCapProjectsList />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
