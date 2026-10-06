import { getAutoStatus } from "./utils/validations";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import {
  User,
  UserRole,
  Vehicle,
  Equipment,
  CalendarEvent,
  Notification,
} from "./types";
import {
  authAPI,
  usersAPI,
  vehiclesAPI,
  equipmentAPI,
  calendarAPI,
  inspectionsAPI,
  insurancesAPI,
  setAuthToken,
  getAuthToken,
  equipmentSchedulesAPI,
  stockAPI,
} from "./api";
import { requestBrowserNotificationPermission } from "./utils/realtimeNotifications";
import { subscribeRealtimeNotifications } from "./utils/realtimeNotifications";

interface AppContextType {
  currentUser: User | null;
  users: User[];
  vehicles: Vehicle[];
  equipment: Equipment[];
  calendarEvents: CalendarEvent[];
  inspections: any[];
  insurances: any[];
  equipmentSchedules: any[];
  notifications: Notification[];
  permissions: Record<string, Record<string, string>>;
  loading: boolean;

  stockItems: any[];
  stockMovements: any[];
  stockItemsTotal: number;
  stockItemsPage: number;
  loadStockData: (
    page?: number,
    limit?: number,
  ) => Promise<void>;
  loadMoreStockItems: (page: number) => Promise<void>;
  addStockItem: (item: any) => Promise<void>;
  updateStockItem: (id: string, item: any) => Promise<void>;
  deleteStockItem: (id: string) => Promise<void>;
  addStockMovement: (movement: any) => Promise<void>;
  deleteStockMovement: (id: string) => Promise<void>;

  loadEquipmentSchedules: () => Promise<void>;
  addEquipmentSchedule: (data: any) => Promise<void>;
  updateEquipmentSchedule: (
    id: string,
    schedule: any,
  ) => Promise<void>;
  deleteEquipmentSchedule: (id: string) => Promise<void>;

  login: (
    identifier: string,
    senha: string,
  ) => Promise<boolean>;
  logout: () => void;

  addUser: (
    user: Omit<User, "id" | "dataCriacao">,
  ) => Promise<void>;
  updateUser: (
    id: string,
    user: Partial<User>,
  ) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  addVehicle: (vehicle: Omit<Vehicle, "id">) => Promise<void>;
  updateVehicle: (
    id: string,
    vehicle: Partial<Vehicle>,
  ) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;

  addEquipment: (
    equipment: Omit<Equipment, "id">,
  ) => Promise<void>;
  updateEquipment: (
    id: string,
    equipment: Partial<Equipment>,
  ) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;

  addCalendarEvent: (
    event: Omit<CalendarEvent, "id">,
  ) => Promise<void>;
  updateCalendarEvent: (
    id: string,
    event: Partial<CalendarEvent>,
  ) => Promise<void>;
  deleteCalendarEvent: (id: string) => Promise<void>;

  addInspection: (inspection: any) => Promise<void>;
  updateInspection: (
    id: string,
    inspection: any,
  ) => Promise<void>;
  deleteInspection: (id: string) => Promise<void>;

  addInsurance: (insurance: any) => Promise<void>;
  updateInsurance: (
    id: string,
    insurance: any,
  ) => Promise<void>;
  deleteInsurance: (id: string) => Promise<void>;

  addNotification: (
    notification: Omit<
      Notification,
      "id" | "timestamp" | "lida"
    >,
  ) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAllNotifications: () => void;

  setPermissions: (
    perms: Record<string, Record<string, string>>,
  ) => void;
  hasPermission: (
    page: string,
    level: "criar" | "editar" | "ler",
  ) => boolean;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(
  undefined,
);

export function AppProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(
    null,
  );
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<
    CalendarEvent[]
  >([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [insurances, setInsurances] = useState<any[]>([]);
  const [equipmentSchedules, setEquipmentSchedules] = useState<
    any[]
  >([]);

  const [stockItems, setStockItems] = useState<any[]>([]);
  const [stockMovements, setStockMovements] = useState<any[]>(
    [],
  );
  const [stockItemsTotal, setStockItemsTotal] = useState(0);
  const [stockItemsPage, setStockItemsPage] = useState(1);

  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);
  const [permissions, setPermissions] = useState<
    Record<string, Record<string, string>>
  >({});
  const [loading, setLoading] = useState(true);

  // ==================== STOCK DATA ====================
  // Carrega TODOS os itens em batches de 1000 para suportar 10k+ registos
  const loadStockData = useCallback(
    async (_page?: number, _limit?: number) => {
      try {
        const BATCH = 1000;
        let allItems: any[] = [];
        let currentPage = 1;
        let total = Infinity;

        // Batch loop: continua até carregar tudo
        while (allItems.length < total) {
          const res = await stockAPI
            .getItems({ page: currentPage, limit: BATCH })
            .catch(() => ({ data: [], total: 0 }));

          const batch = (res.data || []).map((item: any) => ({
            ...item,
            quantidade: item.quantidade ?? 0,
          }));

          if (currentPage === 1) {
            total = res.total || batch.length;
          }

          allItems = [...allItems, ...batch];

          // Atualiza o estado progressivamente após 1º batch
          if (currentPage === 1) {
            setStockItems(allItems);
            setStockItemsTotal(total);
          }

          if (batch.length < BATCH) break; // última página
          currentPage++;
        }

        setStockItems(allItems);
        setStockItemsTotal(allItems.length);
        setStockItemsPage(1);

        // Movimentos em paralelo com o primeiro batch
        const movsRes = await stockAPI
          .getMovements()
          .catch(() => ({ data: [] }));

        const movements = (movsRes.data || []).map((m: any) => ({
          ...m,
          item_nome: m.stock_items?.nome || m.item_nome,
          user_nome: m.users?.nome || m.user_nome,
        }));
        setStockMovements(movements);
      } catch (error) {
        console.error("Erro ao carregar stock:", error);
        setStockItems([]);
        setStockMovements([]);
        setStockItemsTotal(0);
      }
    },
    [],
  );

  const loadMoreStockItems = useCallback(async (page: number) => {
    try {
      const res = await stockAPI.getItems({ page, limit: 1000 });
      const newItems = (res.data || []).map((item: any) => ({
        ...item,
        quantidade: item.quantidade ?? 0,
      }));
      setStockItems((prev) => [...prev, ...newItems]);
      setStockItemsPage(page);
    } catch (error) {
      console.error("Erro ao carregar mais itens:", error);
    }
  }, []);

  const addStockItem = async (item: any) => {
    try {
      await stockAPI.addItem(item);
      await loadStockData();
      addNotification({
        tipo: "sucesso",
        titulo: "Stock",
        mensagem: "Artigo registado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao adicionar artigo:", error);
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao registar artigo.",
      });
      throw error;
    }
  };

  const updateStockItem = async (id: string, item: any) => {
    try {
      await stockAPI.updateItem(id, item);
      await loadStockData();
      addNotification({
        tipo: "sucesso",
        titulo: "Stock",
        mensagem: "Artigo atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao atualizar artigo:", error);
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao atualizar artigo.",
      });
      throw error;
    }
  };

  const deleteStockItem = async (id: string) => {
    try {
      await stockAPI.deleteItem(id);
      await loadStockData();
      addNotification({
        tipo: "sucesso",
        titulo: "Stock",
        mensagem: "Artigo removido com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao remover artigo:", error);
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao remover artigo.",
      });
      throw error;
    }
  };

  const addStockMovement = async (mov: any) => {
    try {
      await stockAPI.addMovement(mov);
      const item = stockItems.find((i) => i.id === mov.item_id);

      if (item) {
        const novaQtd =
          mov.tipo === "levantamento"
            ? Number(item.quantidade) - Number(mov.quantidade)
            : Number(item.quantidade) + Number(mov.quantidade);

        await stockAPI.updateItem(mov.item_id, {
          ...item,
          quantidade: Math.max(0, novaQtd),
        });
      }

      await loadStockData();
      addNotification({
        tipo: "sucesso",
        titulo: "Movimento",
        mensagem: "Movimento registado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao registar movimento:", error);
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao registar movimento.",
      });
      throw error;
    }
  };

  const deleteStockMovement = async (id: string) => {
    try {
      await stockAPI.deleteMovement(id);
      await loadStockData();
      addNotification({
        tipo: "sucesso",
        titulo: "Movimento",
        mensagem: "Registo removido com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao remover movimento:", error);
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao remover movimento.",
      });
      throw error;
    }
  };

  // ==================== AUTH ====================
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      setLoading(true);
      const token = getAuthToken();
      const savedUser = localStorage.getItem("currentUser");

      if (token && savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          await refreshData();
        } catch (e) {
          console.error("Erro ao ler cache");
          logout();
        }
      } else {
        logout();
      }

      if (mounted) setLoading(false);
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const hasPermission = (
    page: string,
    level: "criar" | "editar" | "ler",
  ): boolean => {
    if (
      currentUser?.role === "administrador" ||
      currentUser?.role === "gestor"
    ) {
      return true;
    }
    const userRole =
      (currentUser?.role as UserRole) ||
      ("colaborador" as UserRole);
    const userPermission = permissions[userRole]?.[page];

    if (!userPermission || userPermission === "nada")
      return false;
    if (level === "criar")
      return userPermission === "criar_ler";
    if (level === "editar")
      return userPermission === "ler_editar";
    if (level === "ler") return !!userPermission;
    return false;
  };

  // ==================== REFRESH DATA ====================
  const refreshData = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      setLoading(true);
      const [
        usersRes,
        vehiclesRes,
        equipmentRes,
        eventsRes,
        schedulesRes,
      ] = await Promise.all([
        usersAPI.getAll().catch(() => ({ users: [] })),
        vehiclesAPI.getAll().catch(() => ({ vehicles: [] })),
        equipmentAPI.getAll().catch(() => ({ equipment: [] })),
        calendarAPI.getAll().catch(() => ({ events: [] })),
        equipmentSchedulesAPI.getAll().catch(() => []),
      ]);

      const calendarEventsData = eventsRes.events || [];

      setEquipmentSchedules(
        Array.isArray(schedulesRes) ? schedulesRes : [],
      );

      const vehiclesWithStatus = (
        vehiclesRes.vehicles || []
      ).map((vehicle: any) => ({
        ...vehicle,
        status: getAutoStatus(
          vehicle,
          [],
          [],
          calendarEventsData,
        ),
      }));

      const equipmentWithStatus = (
        equipmentRes.equipment || []
      ).map((item: any) => ({
        ...item,
        status: getAutoStatus(
          item,
          undefined,
          undefined,
          calendarEventsData,
        ),
      }));

      setUsers(usersRes.users || []);
      setVehicles(vehiclesWithStatus);
      setEquipment(equipmentWithStatus);
      setCalendarEvents(calendarEventsData);

      await loadStockData(1, 1000);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== EQUIPMENT SCHEDULES ====================
  const loadEquipmentSchedules = useCallback(async () => {
    try {
      const data = await equipmentSchedulesAPI.getAll();
      setEquipmentSchedules(
        Array.isArray(data) ? data : data.schedules || [],
      );
    } catch (error) {
      console.error("Erro ao carregar:", error);
    }
  }, []);

  const addEquipmentSchedule = async (data: any) => {
    try {
      await equipmentSchedulesAPI.create({
        equipment_id: data.equipmentId,
        user_id: data.userId,
        data_inicio: data.dataInicio,
        data_fim: data.dataFim,
        indefinido: data.indefinido,
        notas: data.notas,
        destinatario: data.destinatario,
        status: "ativo",
      });
      addNotification({
        tipo: "sucesso",
        titulo: "Agendamento Criado",
        mensagem: "Agendamento criado com sucesso",
      });
      await loadEquipmentSchedules();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao criar agendamento",
      });
      throw error;
    }
  };

  const updateEquipmentSchedule = async (
    id: string,
    schedule: any,
  ) => {
    try {
      const dataFim = schedule.dataFim || schedule.data_fim;
      if (!dataFim || dataFim === "" || dataFim === "null")
        throw new Error("Data de devolução obrigatória");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFim))
        throw new Error(`Formato de data inválido: ${dataFim}`);

      await equipmentSchedulesAPI.update(id, {
        user_id: schedule.userId || schedule.user_id,
        data_inicio:
          schedule.dataInicio || schedule.data_inicio,
        data_fim: dataFim,
        indefinido: schedule.indefinido ?? false,
        notas: schedule.notas || "",
        destinatario: schedule.destinatario || "",
        status: schedule.status || "ativo",
      });
      addNotification({
        tipo: "sucesso",
        titulo: "Agendamento Atualizado",
        mensagem: "Agendamento atualizado com sucesso",
      });
      await loadEquipmentSchedules();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: `Erro: ${error}`,
      });
      throw error;
    }
  };

  const deleteEquipmentSchedule = async (id: string) => {
    try {
      await equipmentSchedulesAPI.delete(id);
      addNotification({
        tipo: "sucesso",
        titulo: "Agendamento Eliminado",
        mensagem: "Agendamento eliminado com sucesso",
      });
      await loadEquipmentSchedules();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao eliminar agendamento",
      });
      throw error;
    }
  };

  // ==================== AUTH ACTIONS ====================
  const login = async (
    identifier: string,
    senha: string,
  ): Promise<boolean> => {
    try {
      const response = await authAPI.login({
        identifier,
        senha,
      });
      setAuthToken(response.access_token);
      const userToSave = {
        ...response.user,
        role: response.user.role || "colaborador",
      };
      setCurrentUser(userToSave);
      localStorage.setItem(
        "currentUser",
        JSON.stringify(userToSave),
      );
      await refreshData();
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    setUsers([]);
    setVehicles([]);
    setEquipment([]);
    setCalendarEvents([]);
    setInspections([]);
    setInsurances([]);
    setEquipmentSchedules([]);
    setStockItems([]);
    setStockMovements([]);
    setStockItemsTotal(0);
    setStockItemsPage(1);
    setNotifications([]);
    setPermissions({});
  };

  // ==================== USERS ====================
  const addUser = async (
    user: Omit<User, "id" | "dataCriacao">,
  ) => {
    try {
      await authAPI.signup({
        ...user,
        senha: user.senha || "senha123",
      } as any);
      addNotification({
        tipo: "sucesso",
        titulo: "Utilizador Adicionado",
        mensagem: "Utilizador adicionado com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao adicionar utilizador",
      });
      throw error;
    }
  };

  const updateUser = async (
    id: string,
    user: Partial<User>,
  ) => {
    try {
      await usersAPI.update(id, user);
      addNotification({
        tipo: "sucesso",
        titulo: "Utilizador Atualizado",
        mensagem: "Utilizador atualizado com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao atualizar utilizador",
      });
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await usersAPI.delete(id);
      addNotification({
        tipo: "sucesso",
        titulo: "Utilizador Eliminado",
        mensagem: "Utilizador eliminado com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao eliminar utilizador",
      });
      throw error;
    }
  };

  // ==================== VEHICLES ====================
  const addVehicle = async (vehicle: Omit<Vehicle, "id">) => {
    try {
      await vehiclesAPI.create(vehicle);
      addNotification({
        tipo: "sucesso",
        titulo: "Viatura Adicionada",
        mensagem: "Viatura adicionada com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao adicionar viatura",
      });
      throw error;
    }
  };

  const updateVehicle = async (
    id: string,
    vehicle: Partial<Vehicle>,
  ) => {
    try {
      await vehiclesAPI.update(id, vehicle);
      addNotification({
        tipo: "sucesso",
        titulo: "Viatura Atualizada",
        mensagem: "Viatura atualizada com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao atualizar viatura",
      });
      throw error;
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      await vehiclesAPI.delete(id);
      addNotification({
        tipo: "sucesso",
        titulo: "Viatura Eliminada",
        mensagem: "Viatura eliminada com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao eliminar viatura",
      });
      throw error;
    }
  };

  // ==================== EQUIPMENT ====================
  const addEquipment = async (equip: Omit<Equipment, "id">) => {
    try {
      await equipmentAPI.create(equip);
      addNotification({
        tipo: "sucesso",
        titulo: "Equipamento Adicionado",
        mensagem: "Equipamento adicionado com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao adicionar equipamento",
      });
      throw error;
    }
  };

  const updateEquipment = async (
    id: string,
    equip: Partial<Equipment>,
  ) => {
    try {
      await equipmentAPI.update(id, equip);
      addNotification({
        tipo: "sucesso",
        titulo: "Equipamento Atualizado",
        mensagem: "Equipamento atualizado com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao atualizar equipamento",
      });
      throw error;
    }
  };

  const deleteEquipment = async (id: string) => {
    try {
      await equipmentAPI.delete(id);
      addNotification({
        tipo: "sucesso",
        titulo: "Equipamento Eliminado",
        mensagem: "Equipamento eliminado com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao eliminar equipamento",
      });
      throw error;
    }
  };

  // ==================== CALENDAR ====================
  const addCalendarEvent = async (
    event: Omit<CalendarEvent, "id">,
  ) => {
    try {
      await calendarAPI.create(event);
      const now = new Date();
      const offset = now.getTimezoneOffset();
      const localDate = new Date(
        now.getTime() - offset * 60 * 1000,
      );
      const todayStr = localDate.toISOString().split("T")[0];

      if (event.data === todayStr) {
        if (event.tipo === "vehicle")
          await vehiclesAPI.update(event.itemId, {
            status: "em_uso",
          });
        else if (event.tipo === "equipment")
          await equipmentAPI.update(event.itemId, {
            status: "em_uso",
          });
      }

      addNotification({
        tipo: "sucesso",
        titulo: "Evento Criado",
        mensagem: "Reserva registada.",
      });
      setTimeout(() => refreshData(), 500);
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao criar evento.",
      });
    }
  };

  const updateCalendarEvent = async (
    id: string,
    event: Partial<CalendarEvent>,
  ) => {
    try {
      await calendarAPI.update(id, event);
      addNotification({
        tipo: "sucesso",
        titulo: "Evento Atualizado",
        mensagem: "Evento atualizado com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao atualizar evento",
      });
      throw error;
    }
  };

  const deleteCalendarEvent = async (id: string) => {
    try {
      const eventToDelete = calendarEvents.find(
        (e) => e.id === id,
      );
      await calendarAPI.delete(id);

      if (eventToDelete) {
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        if (eventToDelete.data === todayStr) {
          if (eventToDelete.tipo === "vehicle")
            await vehiclesAPI.update(eventToDelete.itemId, {
              status: "disponivel",
            });
          else if (eventToDelete.tipo === "equipment")
            await equipmentAPI.update(eventToDelete.itemId, {
              status: "disponivel",
            });
        }
      }

      addNotification({
        tipo: "sucesso",
        titulo: "Evento Eliminado",
        mensagem: "Evento eliminado e status atualizado.",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao eliminar evento",
      });
      throw error;
    }
  };

  // ==================== INSPECTIONS ====================
  const addInspection = async (inspection: any) => {
    try {
      await inspectionsAPI.create(inspection);
      addNotification({
        tipo: "sucesso",
        titulo: "Inspeção Adicionada",
        mensagem: "Inspeção adicionada com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao adicionar inspeção",
      });
      throw error;
    }
  };

  const updateInspection = async (
    id: string,
    inspection: any,
  ) => {
    try {
      await inspectionsAPI.update(id, inspection);
      addNotification({
        tipo: "sucesso",
        titulo: "Inspeção Atualizada",
        mensagem: "Inspeção atualizada com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao atualizar inspeção",
      });
      throw error;
    }
  };

  const deleteInspection = async (id: string) => {
    try {
      await inspectionsAPI.delete(id);
      addNotification({
        tipo: "sucesso",
        titulo: "Inspeção Eliminada",
        mensagem: "Inspeção eliminada com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao eliminar inspeção",
      });
      throw error;
    }
  };

  // ==================== INSURANCES ====================
  const addInsurance = async (insurance: any) => {
    try {
      await insurancesAPI.create(insurance);
      addNotification({
        tipo: "sucesso",
        titulo: "Seguro Adicionado",
        mensagem: "Seguro adicionado com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao adicionar seguro",
      });
      throw error;
    }
  };

  const updateInsurance = async (
    id: string,
    insurance: any,
  ) => {
    try {
      await insurancesAPI.update(id, insurance);
      addNotification({
        tipo: "sucesso",
        titulo: "Seguro Atualizado",
        mensagem: "Seguro atualizado com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao atualizar seguro",
      });
      throw error;
    }
  };

  const deleteInsurance = async (id: string) => {
    try {
      await insurancesAPI.delete(id);
      addNotification({
        tipo: "sucesso",
        titulo: "Seguro Eliminado",
        mensagem: "Seguro eliminado com sucesso",
      });
      await refreshData();
    } catch (error) {
      addNotification({
        tipo: "erro",
        titulo: "Erro",
        mensagem: "Erro ao eliminar seguro",
      });
      throw error;
    }
  };

  // ==================== NOTIFICATIONS ====================
  const addNotification = (
    notification: Omit<
      Notification,
      "id" | "timestamp" | "lida"
    >,
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toISOString(),
      lida: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
    if (notification.tipo === "sucesso") {
      setTimeout(
        () => removeNotification(newNotification.id),
        8000,
      );
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n)),
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // ==================== REALTIME NOTIFICATIONS ====================
  useEffect(() => {
    if (!currentUser) return;
    requestBrowserNotificationPermission();
    const unsubscribe = subscribeRealtimeNotifications(
      currentUser,
      addNotification,
    );
    return () => unsubscribe();
  }, [currentUser?.id]);

  // ==================== VALUE ====================
  const value: AppContextType = {
    currentUser,
    users,
    vehicles,
    equipment,
    calendarEvents,
    inspections,
    insurances,
    equipmentSchedules,
    notifications,
    permissions,
    loading,

    stockItems,
    stockMovements,
    stockItemsTotal,
    stockItemsPage,
    loadStockData,
    loadMoreStockItems,
    addStockItem,
    updateStockItem,
    deleteStockItem,
    addStockMovement,
    deleteStockMovement,

    loadEquipmentSchedules,
    addEquipmentSchedule,
    updateEquipmentSchedule,
    deleteEquipmentSchedule,

    login,
    logout,

    addUser,
    updateUser,
    deleteUser,

    addVehicle,
    updateVehicle,
    deleteVehicle,

    addEquipment,
    updateEquipment,
    deleteEquipment,

    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,

    addInspection,
    updateInspection,
    deleteInspection,

    addInsurance,
    updateInsurance,
    deleteInsurance,

    addNotification,
    removeNotification,
    markAsRead,
    clearAllNotifications,

    setPermissions,
    hasPermission,
    refreshData,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error(
      "useApp must be used within an AppProvider",
    );
  }
  return context;
}