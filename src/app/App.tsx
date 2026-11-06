import { useState, useEffect } from "react";
import { Layout } from "./components/Layout";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { MyActivityPage } from "./pages/MyActivityPage";
import LoginPage from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { EquipmentPage } from "./pages/EquipmentPage";
import { CalendarPage } from "./pages/CalendarPage";
import { AccountingPage } from "./pages/AccountingPage";
import { EquipmentDataPage } from "./pages/EquipmentDataPage";
import { TrackingPublicPage } from "./pages/TrackingPublicPage";
import { UsersPage } from "./pages/UsersPage";
import { InsurancePage } from "./pages/InsurancePage";
import { InspectionPage } from "./pages/InspectionPage";
import { ServiceReportsPage } from "./pages/ServiceReportsPage";
import { OthersPage } from "./pages/OthersPage";
import { JobsPage } from "./pages/JobsPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { ProductionCalendarPage } from "./pages/ProductionCalendarPage";
import { useApp } from "./AppContext";
import { AppProvider } from "./AppContext";
import { ThemeProvider } from "next-themes";

function AppContent() {
  const { currentUser, loading } = useApp();
  const [currentPage, setCurrentPage] = useState("dashboard");
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-lg">A carregar...</p>
      </div>
    );
  }
  
  if (!currentUser) {
    return <LoginPage />;
  }
  
  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "atividade":
        return <MyActivityPage />;
      case "vehicles":
        return <VehiclesPage />;
      case "equipment":
        return <EquipmentPage />;
      case "calendar":
        return <CalendarPage />;
      case "jobs":
        return <JobsPage />;
      case "schedules":
        return <SchedulesPage />;
      case "contabilidade":
        return <AccountingPage />;
      case "producao":
        return <ProductionCalendarPage />;
      case "insurance":
        return <InsurancePage />;
      case "inspection":
        return <InspectionPage />;
      case "service-reports":
        return <ServiceReportsPage />;
      case "users":
        return <UsersPage />;
      case "documentacao":
        return <EquipmentDataPage />;
      case "outros":
        return <OthersPage />;
      default:
        return <DashboardPage />;
    }
  };
  
  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
    >
      {renderPage()}
    </Layout>
  );
}

function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) =>
          console.log("[PWA] SW registered:", reg.scope),
        )
        .catch((err) =>
          console.warn("[PWA] SW registration failed:", err),
        );
    }
  }, []);

  // Rota pública de rastreio — funciona mesmo sem login,
  // ex: https://a-tua-app/?rastreio=AB12CD34
  const trackingCode = new URLSearchParams(
    window.location.search,
  ).get("rastreio");
  if (trackingCode) {
    return <TrackingPublicPage code={trackingCode} />;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AppProvider>
        <AppContent />
        <PWAInstallBanner />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;