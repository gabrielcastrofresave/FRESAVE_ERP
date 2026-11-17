import image_logo_2 from "./logo.png";
import { ReactNode, useState } from "react";
import { useApp } from "../AppContext";
import { NotificationCenter } from "./NotificationCenter";
import {
  LayoutDashboard,
  Truck,
  Car,
  Settings2,
  Package,
  Users,
  Wrench,
  Ticket,
  Calendar,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  FileText,
  AlertTriangle,
  CheckSquare,
  Hammer,
  Clock,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Link,
  ClipboardList,
  Calculator,
  CalendarClock,
} from "lucide-react";
import { useTheme } from "next-themes";

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  items: MenuItem[];
  section?: string;
}

const SECTIONS = [
  "Geral",
  "Frota",
  "Operações",
  "Documentação",
  "Administração",
];

export function Layout({
  children,
  currentPage,
  onNavigate,
}: LayoutProps) {
  const { currentUser, logout, loading } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<
    string | null
  >("pesados");
  const { theme, setTheme } = useTheme();

  const menuGroups: MenuGroup[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      section: "Geral",
      roles: [
        "administrador",
        "escritorio",
        "projeto",
        "chefe_producao",
      ],
      items: [],
    },
    {
      id: "atividade",
      label: "A Minha Atividade",
      icon: ClipboardList,
      section: "Geral",
      roles: [
        "administrador",
        "escritorio",
        "projeto",
        "chefe_producao",
        "producao",
      ],
      items: [],
    },
    {
      id: "Viaturas",
      label: "Viaturas",
      icon: Car,
      section: "Frota",
      roles: ["administrador", "escritorio"],
      items: [{ id: "vehicles", label: "Viaturas", icon: Car }],
    },

    {
      id: "stock",
      label: "Stock e Movimentos",
      icon: Package,
      section: "Operações",
      roles: ["administrador", "escritorio", "projeto"],
      items: [
        {
          id: "outros",
          label: "Stock e Movimentos",
          icon: Package,
        },
      ],
    },
    {
      id: "trabalhos",
      label: "Trabalhos",
      icon: Hammer,
      section: "Operações",
      roles: [
        "administrador",
        "escritorio",
        "projeto",
        "chefe_producao",
      ],
      items: [
        {
          id: "jobs",
          label: "Trabalhos e Relatórios",
          icon: Hammer,
        },
      ],
    },
    {
      id: "planeamentos",
      label: "Planeamentos",
      icon: CalendarClock,
      section: "Operações",
      roles: [
        "administrador",
        "escritorio",
        "projeto",
        "chefe_producao",
      ],
      items: [
        {
          id: "schedules",
          label: "Planeamentos de Trabalho",
          icon: CalendarClock,
        },
      ],
    },
    {
      id: "service-reports",
      label: "Assistências Técnicas",
      icon: Wrench,
      section: "Operações",
      roles: [
        "administrador",
        "escritorio",
        "projeto",
        "chefe_producao",
      ],
      items: [],
    },
    {
      id: "producao",
      label: "Calendário de Produção",
      icon: Clock,
      section: "Operações",
      roles: ["administrador", "escritorio"],
      items: [],
    },
    {
      id: "contabilidade",
      label: "Contabilidade",
      icon: Calculator,
      section: "Administração",
      roles: ["administrador", "escritorio"],
      items: [
        {
          id: "contabilidade",
          label: "Custos de Projetos",
          icon: Calculator,
        },
      ],
    },
    {
      id: "utilizadores",
      label: "Utilizadores",
      icon: Users,
      section: "Administração",
      roles: ["administrador"],
      items: [
        {
          id: "users",
          label: "Gestão Utilizadores",
          icon: Users,
        },
      ],
    },
  ];

  const filteredGroups = currentUser
    ? menuGroups.filter((g) =>
        g.roles.includes(currentUser.role),
      )
    : [];
  const mobileNavItems = filteredGroups
    .map((group) => ({
      id: group.items.length === 1 ? group.items[0].id : group.id,
      label: group.items.length === 1 ? group.items[0].label : group.label,
      icon: group.items.length === 1 ? group.items[0].icon : group.icon,
    }))
    .slice(0, 4);

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      administrador: "Administrador",
      escritorio: "Escritório",
      projeto: "Projeto",
      chefe_producao: "Chefe de Produção",
      producao: "Produção",
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      administrador: "#ef4444",
      escritorio: "#3b82f6",
      projeto: "#8b5cf6",
      chefe_producao: "#f59e0b",
      producao: "#10b981",
    };
    return colors[role] || "#64748b";
  };

  const getInitials = (nome: string) =>
    nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const toggleGroup = (groupId: string) => {
    setExpandedGroup(
      expandedGroup === groupId ? null : groupId,
    );
  };

  const SidebarContent = ({
    dark = false,
  }: {
    dark?: boolean;
  }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img
              src={image_logo_2}
              alt="Fresave"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">
              Fresave ERP
            </p>
            <p className="text-xs text-zinc-400 leading-tight">
              Gestão de Empresa
            </p>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-white/5 border border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{
              background: getRoleColor(currentUser?.role || ""),
            }}
          >
            {getInitials(currentUser?.nome || "U")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">
              {currentUser?.nome}
            </p>
            <p
              className="text-xs leading-tight"
              style={{
                color: getRoleColor(currentUser?.role || ""),
              }}
            >
              {getRoleLabel(currentUser?.role || "")}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {filteredGroups.map((group, idx) => {
          const GroupIcon = group.icon;

          // Section header
          const prevSection =
            idx > 0 ? filteredGroups[idx - 1].section : null;
          const showSection =
            group.section && group.section !== prevSection;

          const isDirectPage = group.items.length === 0;
          const isSingleItem = group.items.length === 1;
          const targetId = isDirectPage
            ? group.id
            : isSingleItem
              ? group.items[0].id
              : null;
          const isActive = targetId
            ? currentPage === targetId
            : group.items.some((i) => currentPage === i.id);
          const isExpanded = expandedGroup === group.id;

          return (
            <div key={group.id}>
              {showSection && (
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 pt-3 pb-1 mt-1">
                  {group.section}
                </p>
              )}

              {/* Direct or single-item group */}
              {(isDirectPage || isSingleItem) && (
                <button
                  onClick={() => {
                    onNavigate(targetId!);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    isActive
                      ? "bg-red-600 text-white shadow-[0_8px_18px_rgba(220,38,38,0.25)]"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.08] hover:translate-x-0.5"
                  }`}
                >
                  <GroupIcon
                    className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`}
                  />
                  <span className="flex-1 text-left truncate">
                    {group.label}
                  </span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-red-300 flex-shrink-0" />
                  )}
                </button>
              )}

              {/* Multi-item group */}
              {!isDirectPage && !isSingleItem && (
                <div>
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                      isActive || isExpanded
                        ? "text-white bg-white/[0.08]"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <GroupIcon
                      className={`w-4 h-4 flex-shrink-0 ${isActive || isExpanded ? "text-red-400" : "text-zinc-500 group-hover:text-zinc-300"}`}
                    />
                    <span className="flex-1 text-left truncate">
                      {group.label}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="ml-3 mt-0.5 pl-3 border-l border-white/10 space-y-0.5">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const itemActive =
                          currentPage === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onNavigate(item.id);
                              setIsSidebarOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                              itemActive
                                ? "bg-red-600/90 text-white font-medium shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                            }`}
                          >
                            <ItemIcon
                              className={`w-3.5 h-3.5 flex-shrink-0 ${itemActive ? "text-white" : "text-zinc-600"}`}
                            />
                            <span className="flex-1 text-left truncate">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t border-white/10 flex-shrink-0 space-y-1">
        <button
          onClick={() =>
            setTheme(theme === "dark" ? "light" : "dark")
          }
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-white/8 transition-all"
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-4 h-4" />
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4" />
              <span>Modo Escuro</span>
            </>
          )}
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Terminar Sessão</span>
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        className="h-screen w-full flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">
            A carregar sistema...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div
        className="h-screen w-full flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <p className="text-zinc-500 text-sm animate-pulse">
          A verificar sessão...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col w-64 xl:w-72 sticky top-0 h-screen flex-shrink-0 shadow-[12px_0_40px_rgba(0,0,0,0.08)]"
        style={{ background: "var(--sidebar)" }}
      >
        <SidebarContent dark />
      </aside>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          onClick={() => setIsSidebarOpen(false)}
        >
          <aside
            className="w-72 h-full flex flex-col overflow-hidden"
            style={{ background: "var(--sidebar)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-3 flex-shrink-0">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent dark />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Desktop topbar */}
        <header className="hidden lg:flex bg-card/80 backdrop-blur-md border-b border-border px-6 py-3 items-center justify-between gap-4 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-muted-foreground">
              {currentUser.nome}
              <span className="mx-1 text-border">·</span>
              <span
                style={{
                  color: getRoleColor(currentUser.role),
                }}
              >
                {getRoleLabel(currentUser.role)}
              </span>
            </span>
          </div>
          <NotificationCenter />
        </header>

        {/* Mobile topbar */}
        <header className="lg:hidden bg-card/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="erp-touch-target -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src={image_logo_2}
              alt="Fresave"
              className="w-6 h-6 rounded"
            />
            <span className="text-sm font-semibold">
              Fresave ERP
            </span>
          </div>
          <NotificationCenter />
        </header>

        <main className="flex-1 p-3 pb-20 sm:p-5 sm:pb-20 md:p-6 md:pb-20 lg:p-7 lg:pb-7 xl:p-8 bg-background">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
        <nav aria-label="Navegação rápida" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-card/95 px-2 py-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return <button key={item.id} type="button" onClick={() => onNavigate(item.id)} className={`erp-touch-target flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] transition-colors ${active ? "text-red-600 dark:text-red-300" : "text-muted-foreground"}`} aria-current={active ? "page" : undefined}><Icon className={`h-4 w-4 ${active ? "text-red-500" : ""}`} /><span className="max-w-full truncate">{item.label}</span></button>;
          })}
        </nav>
      </div>
    </div>
  );
}