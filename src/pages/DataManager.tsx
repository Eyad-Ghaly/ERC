import { DepartmentDashboardContent } from "./DepartmentDashboard";
import { AppLayout } from "@/components/AppLayout";

export default function DataManager() {
  return (
    <AppLayout title="مسؤول إدارة وتحليل البيانات">
      <DepartmentDashboardContent />
    </AppLayout>
  );
}
