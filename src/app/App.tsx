import { lazy, Suspense, useState, useEffect } from "react";
import { Layout } from "./components/Layout";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
const MyActivityPage = lazy(() => import("./pages/MyActivityPage").then((m) => ({ default: m.MyActivityPage })));
import LoginPage from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
const VehiclesPage = lazy(() => import("./pages/VehiclesPage").then((m) => ({ default: m.VehiclesPage })));
const EquipmentPage = lazy(() => import("./pages/EquipmentPage").then((m) => ({ default: m.EquipmentPage })));
const CalendarPage = lazy(() => import("./pages/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const AccountingPage = lazy(() => import("./pages/AccountingPage").then((m) => ({ default: m.AccountingPage })));
const EquipmentDataPage = lazy(() => import("./pages/EquipmentDataPage").then((m) => ({ default: m.EquipmentDataPage })));
const TrackingPublicPage = lazy(() => import("./pages/TrackingPublicPage").then((m) => ({ default: m.TrackingPublicPage })));
const UsersPage = lazy(() => import("./pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const InsurancePage = lazy(() => import("./pages/InsurancePage").then((m) => ({ default: m.InsurancePage })));
const InspectionPage = lazy(() => import("./pages/InspectionPage").then((m) => ({ default: m.InspectionPage })));
const ServiceReportsPage = lazy(() => import("./pages/ServiceReportsPage").then((m) => ({ default: m.ServiceReportsPage })));
const OthersPage = lazy(() => import("./pages/OthersPage").then((m) => ({ default: m.OthersPage })));
const JobsPage = lazy(() => import("./pages/JobsPage").then((m) => ({ default: m.JobsPage })));
const SchedulesPage = lazy(() => import("./pages/SchedulesPage").then((m) => ({ default: m.SchedulesPage })));
const ProductionCalendarPage = lazy(() => import("./pages/ProductionCalendarPage").then((m) => ({ default: m.ProductionCalendarPage })));
import { useApp } from "./AppContext";
import { AppProvider } from "./AppContext";
import { ThemeProvider } from "next-themes";
import { PageTransition } from "./components/PageTransition";
import { ErrorBoundary } from "./components/ErrorBoundary";

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
      <PageTransition key={currentPage}>
        <Suspense
          fallback={
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
              A carregar…
            </div>
          }
        >
          {renderPage()}
        </Suspense>
      </PageTransition>
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
    return (
      <Suspense fallback={null}>
        <TrackingPublicPage code={trackingCode} />
      </Suspense>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AppProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
        <PWAInstallBanner />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;