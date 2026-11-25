import DashboardLoading from "@/components/dashboard/dashboard-loading";
import DashboardLoadingSelector from "@/components/dashboard/dashboard-loading-selector";

export default function DashboardLoadingPage() {
  return (
    <DashboardLoadingSelector
      administration={
        <DashboardLoading
          title="Administrative dashboard"
          variant="administration"
        />
      }
      personal={
        <DashboardLoading title="Dashboard" variant="personal" />
      }
    />
  );
}
