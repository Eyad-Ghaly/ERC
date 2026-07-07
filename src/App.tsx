import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import DepartmentDashboard from "./pages/DepartmentDashboard.tsx";
import DepartmentEntry from "./pages/DepartmentEntry.tsx";
import TeamTargets from "./pages/TeamTargets.tsx";
import MissionFeedback from "./pages/MissionFeedback.tsx";
import OperationsRoom from "./pages/OperationsRoom.tsx";
import Joker from "./pages/Joker.tsx";
import Supervisor from "./pages/Supervisor.tsx";
import Youth from "./pages/Youth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import DataManager from "./pages/DataManager.tsx";
import Admin from "./pages/Admin.tsx";
import MissionDetail from "./pages/MissionDetail.tsx";
import BeneficiariesRegistration from "./pages/BeneficiariesRegistration.tsx";
import VolunteersDatabase from "./pages/VolunteersDatabase.tsx";
import BranchYouthDashboard from "./pages/BranchYouthDashboard.tsx";
import TeamBeneficiaries from "./pages/TeamBeneficiaries.tsx";
import VolunteerSupplyRequestNew from "./pages/VolunteerSupplyRequestNew.tsx";
import YouthSupplyRequests from "@/pages/YouthSupplyRequests";
import YouthSupplyReview from "@/pages/YouthSupplyReview";
import PublicSupplyForm from "./pages/PublicSupplyForm.tsx";
import TeamSupplyReview from "./pages/TeamSupplyReview.tsx";
import ManagementSupplyRequests from "@/pages/ManagementSupplyRequests";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" richColors closeButton />
      <HashRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/department-dashboard" element={<ProtectedRoute roles={["department_entry"]}><DepartmentDashboard /></ProtectedRoute>} />
            <Route path="/department-entry" element={<ProtectedRoute roles={["department_entry"]}><DepartmentEntry /></ProtectedRoute>} />
            <Route path="/department-entry/:id" element={<ProtectedRoute roles={["department_entry"]}><DepartmentEntry /></ProtectedRoute>} />
            <Route path="/team-targets" element={<ProtectedRoute roles={["department_entry", "data_manager"]}><TeamTargets /></ProtectedRoute>} />
            <Route path="/mission-feedback" element={<ProtectedRoute roles={["department_entry", "data_manager"]}><MissionFeedback /></ProtectedRoute>} />
            <Route path="/beneficiaries-registration" element={<ProtectedRoute roles={["department_entry"]}><BeneficiariesRegistration /></ProtectedRoute>} />
            <Route path="/management-supply-requests" element={<ProtectedRoute roles={["management", "admin"]}><ManagementSupplyRequests /></ProtectedRoute>} />
            <Route path="/operations-room" element={<ProtectedRoute roles={["operations_room", "operations_supervisor"]}><OperationsRoom /></ProtectedRoute>} />
            <Route path="/joker" element={<ProtectedRoute roles={["joker"]}><Joker /></ProtectedRoute>} />
            <Route path="/supervisor" element={<ProtectedRoute roles={["operations_supervisor"]}><Supervisor /></ProtectedRoute>} />
            <Route path="/youth" element={<ProtectedRoute roles={["youth_room"]}><Youth /></ProtectedRoute>} />
            <Route path="/youth-supply-requests" element={<ProtectedRoute roles={["youth_management", "admin"]}><YouthSupplyRequests /></ProtectedRoute>} />
            <Route path="/youth-supply-review/:form_id" element={<ProtectedRoute roles={["youth_management", "admin"]}><YouthSupplyReview /></ProtectedRoute>} />
            <Route path="/team-supply-review/:request_id" element={<ProtectedRoute roles={["department_entry", "management"]}><TeamSupplyReview /></ProtectedRoute>} />
            <Route path="/apply/:public_link_uuid" element={<PublicSupplyForm />} />
            <Route path="/volunteers-database" element={<ProtectedRoute roles={["youth_room", "admin"]}><VolunteersDatabase /></ProtectedRoute>} />
            <Route path="/branch-youth" element={<ProtectedRoute roles={["branch_youth"]}><BranchYouthDashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute roles={["stakeholder", "data_manager"]}><Dashboard /></ProtectedRoute>} />
            <Route path="/data-manager" element={<ProtectedRoute roles={["data_manager"]}><DataManager /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><Admin /></ProtectedRoute>} />
            <Route path="/team-beneficiaries" element={<ProtectedRoute roles={["department_entry"]}><TeamBeneficiaries /></ProtectedRoute>} />
            <Route path="/volunteer-supply-request/new" element={<ProtectedRoute roles={["department_entry", "management"]}><VolunteerSupplyRequestNew /></ProtectedRoute>} />
            <Route path="/missions/:id" element={<ProtectedRoute><MissionDetail /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
