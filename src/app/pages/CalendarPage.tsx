// src/app/pages/CalendarPage.tsx

import { useState, useMemo, useEffect } from "react";
import { useApp } from "../AppContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  User,
  FileText,
  Car,
  Wrench,
} from "lucide-react";

type Tab = "vehicles" | "equipment";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateInput(date: Date) {
  return date.toISOString().split("T")[0];
}

function getWeekDays(date: Date) {
  const start = new Date(date);
  const day = start.getDay(); // 0 = domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const DAY_NAMES = [
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
  "Dom",
];

export function CalendarPage() {
  const {
    vehicles,
    equipment,
    calendarEvents,
    equipmentSchedules,
    users,
    currentUser,
    addCalendarEvent,
    deleteCalendarEvent,
    addEquipmentSchedule,
    updateEquipmentSchedule,
    deleteEquipmentSchedule,
    loadEquipmentSchedules,
  } = useApp();

  const [activeTab, setActiveTab] = useState<Tab>("vehicles");
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  // Modal: novo/ver evento de viatura
  const [isVehicleModalOpen, setIsVehicleModalOpen] =
    useState(false);
  const [selectedVehicle, setSelectedVehicle] =
    useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(
    null,
  );
  const [vLocal, setVLocal] = useState("");
  const [vHora, setVHora] = useState("");

  const [isEventDetailsOpen, setIsEventDetailsOpen] =
    useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Modal: novo/ver requisição de equipamento
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] =
    useState(false);
  const [selectedEquipment, setSelectedEquipment] =
    useState<any>(null);
  const [eDestinatario, setEDestinatario] = useState("");
  const [eDataInicio, setEDataInicio] = useState("");
  const [eNotas, setENotas] = useState("");

  const [isScheduleViewOpen, setIsScheduleViewOpen] =
    useState(false);
  const [selectedSchedule, setSelectedSchedule] =
    useState<any>(null);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportSearch, setReportSearch] = useState("");

  const canCreate =
    currentUser?.role === "administrador" ||
    currentUser?.role === "gestor";
  const canEdit =
    currentUser?.role === "administrador" ||
    currentUser?.role === "gestor" ||
    currentUser?.role === "mecanico";

  useEffect(() => {
    loadEquipmentSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekDays = getWeekDays(currentWeek);
  const weekStart = weekDays[0].toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "numeric",
  });
  const weekEnd = weekDays[6].toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "numeric",
  });

  const filteredVehicles = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return vehicles.filter(
      (v: any) =>
        v.matricula?.toLowerCase().includes(q) ||
        v.marca?.toLowerCase().includes(q) ||
        v.modelo?.toLowerCase().includes(q),
    );
  }, [vehicles, searchTerm]);

  const filteredEquipment = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return equipment.filter(
      (e: any) =>
        e.nome?.toLowerCase().includes(q) ||
        e.identificacao?.toLowerCase().includes(q) ||
        e.tipo?.toLowerCase().includes(q),
    );
  }, [equipment, searchTerm]);

  // ---------- VIATURAS ----------
  const getVehicleEvent = (vehicleId: string, day: Date) => {
    return calendarEvents.find(
      (ev: any) =>
        ev.tipo === "vehicle" &&
        ev.itemId === vehicleId &&
        isSameDay(new Date(ev.data), day),
    );
  };

  const openVehicleCreate = (vehicle: any, day: Date) => {
    setSelectedVehicle(vehicle);
    setSelectedDay(day);
    setVLocal("");
    setVHora("");
    setIsVehicleModalOpen(true);
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || !selectedDay) return;
    try {
      await addCalendarEvent({
        titulo: `${selectedVehicle.matricula} — ${selectedVehicle.marca} ${selectedVehicle.modelo}`,
        data: toDateInput(selectedDay),
        hora: vHora,
        itemId: selectedVehicle.id,
        utilizador: currentUser?.nome || "",
        local: vLocal,
        tipo: "vehicle",
      } as any);
      setIsVehicleModalOpen(false);
    } catch (error) {
      console.error("Erro ao criar reserva:", error);
      alert("Erro ao criar reserva.");
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (
      confirm("Tem a certeza que deseja eliminar esta reserva?")
    ) {
      try {
        await deleteCalendarEvent(selectedEvent.id);
        setIsEventDetailsOpen(false);
        setSelectedEvent(null);
      } catch (error) {
        console.error("Erro ao eliminar reserva:", error);
        alert("Erro ao eliminar a reserva.");
      }
    }
  };

  // ---------- EQUIPAMENTOS ----------
  const getEquipmentSchedule = (equipId: string, day: Date) => {
    const dayStr = toDateInput(day);
    return equipmentSchedules.find((s: any) => {
      if (s.equipment_id !== equipId) return false;
      const start = s.data_inicio;
      const end = s.data_fim;
      if (s.indefinido && !end) return dayStr >= start;
      return dayStr >= start && dayStr <= (end || "9999-12-31");
    });
  };

  const openEquipmentCreate = (item: any) => {
    setSelectedEquipment(item);
    setEDestinatario("");
    setEDataInicio(toDateInput(new Date()));
    setENotas("");
    setIsEquipmentModalOpen(true);
  };

  const handleEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    try {
      await addEquipmentSchedule({
        equipmentId: selectedEquipment.id,
        userId: currentUser?.id || "",
        dataInicio: eDataInicio,
        dataFim: null,
        indefinido: true,
        notas: eNotas,
        destinatario: eDestinatario,
      });
      setIsEquipmentModalOpen(false);
    } catch (error: any) {
      console.error("Erro ao criar requisição:", error);
      alert("Erro: " + (error.message || "erro desconhecido"));
    }
  };

  const handleFinishSchedule = async (scheduleId: string) => {
    if (confirm("Marcar este equipamento como devolvido?")) {
      await updateEquipmentSchedule(scheduleId, {
        status: "concluido",
        dataFim: toDateInput(new Date()),
      });
      setIsScheduleViewOpen(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (confirm("Eliminar este agendamento?")) {
      await deleteEquipmentSchedule(scheduleId);
      setIsScheduleViewOpen(false);
    }
  };

  const filteredReservations = useMemo(() => {
    const q = reportSearch.toLowerCase();
    return equipmentSchedules.filter((s: any) => {
      const equip = equipment.find(
        (e: any) => e.id === s.equipment_id,
      );
      const user = users.find((u: any) => u.id === s.user_id);
      return (
        equip?.nome?.toLowerCase().includes(q) ||
        user?.nome?.toLowerCase().includes(q) ||
        s.destinatario?.toLowerCase().includes(q)
      );
    });
  }, [equipmentSchedules, equipment, users, reportSearch]);

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600 dark:text-red-300">
            CALENDÁRIO
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Gestão de Recursos
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Consulte e gira reservas de viaturas e requisições
            de equipamentos.
          </p>
        </div>
        <Button
          variant="outline"
          className="h-10"
          onClick={() => setIsReportOpen(true)}
        >
          <FileText className="mr-2 h-4 w-4" />
          Relatório de Requisições
        </Button>
      </header>

      {/* Tabs */}
      <div className="flex rounded-lg bg-zinc-100 p-1 w-fit">
        <button
          onClick={() => {
            setActiveTab("vehicles");
            setSearchTerm("");
          }}
          className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "vehicles"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <Car className="h-3.5 w-3.5" />
          Viaturas
        </button>
        <button
          onClick={() => {
            setActiveTab("equipment");
            setSearchTerm("");
          }}
          className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "equipment"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <Wrench className="h-3.5 w-3.5" />
          Equipamentos
        </button>
      </div>

      {/* Painel principal */}
      <section className="overflow-hidden erp-surface">
        <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder={`Pesquisar ${activeTab === "vehicles" ? "viatura" : "equipamento"}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-600">
              {weekStart} – {weekEnd}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setCurrentWeek(
                  new Date(
                    currentWeek.getTime() - 7 * 86400000,
                  ),
                )
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setCurrentWeek(
                  new Date(
                    currentWeek.getTime() + 7 * 86400000,
                  ),
                )
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-red-600 dark:text-red-300"
              onClick={() => setCurrentWeek(new Date())}
            >
              Hoje
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                <th className="sticky left-0 z-10 w-52 bg-zinc-50 px-4 py-3">
                  {activeTab === "vehicles"
                    ? "Viatura"
                    : "Equipamento"}
                </th>
                {weekDays.map((day, i) => (
                  <th
                    key={i}
                    className={`min-w-[110px] px-2 py-3 text-center ${
                      isSameDay(day, new Date())
                        ? "bg-red-50 text-red-600 dark:text-red-300"
                        : ""
                    }`}
                  >
                    <p className="text-[10px]">
                      {DAY_NAMES[i]}
                    </p>
                    <p className="mt-0.5 text-base font-bold">
                      {day.getDate()}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {activeTab === "vehicles" ? (
                filteredVehicles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-14 text-center text-sm text-zinc-400"
                    >
                      Nenhuma viatura encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((vehicle: any) => (
                    <tr
                      key={vehicle.id}
                      className="hover:bg-zinc-50/50"
                    >
                      <td className="sticky left-0 z-10 bg-white px-4 py-3">
                        <p className="font-medium text-zinc-800">
                          {vehicle.matricula}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {vehicle.marca} {vehicle.modelo}
                        </p>
                      </td>
                      {weekDays.map((day, i) => {
                        const ev = getVehicleEvent(
                          vehicle.id,
                          day,
                        );
                        return (
                          <td
                            key={i}
                            className="p-1.5 align-top"
                          >
                            {ev ? (
                              <button
                                onClick={() => {
                                  setSelectedEvent(ev);
                                  setIsEventDetailsOpen(true);
                                }}
                                className="w-full rounded-md bg-red-600 p-1.5 text-left text-[10px] text-white shadow-sm hover:opacity-90"
                              >
                                <p className="truncate font-semibold">
                                  {ev.local || "Reservado"}
                                </p>
                                <p className="mt-0.5 truncate opacity-80">
                                  {ev.utilizador}
                                </p>
                              </button>
                            ) : canCreate ? (
                              <button
                                onClick={() =>
                                  openVehicleCreate(
                                    vehicle,
                                    day,
                                  )
                                }
                                className="h-12 w-full rounded-md border border-dashed border-zinc-200 text-[10px] text-zinc-300 hover:border-red-300 hover:bg-red-50/60 hover:text-red-600 dark:text-red-300"
                              >
                                + Reservar
                              </button>
                            ) : (
                              <div className="h-12" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )
              ) : filteredEquipment.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-14 text-center text-sm text-zinc-400"
                  >
                    Nenhum equipamento encontrado.
                  </td>
                </tr>
              ) : (
                filteredEquipment.map((item: any) => (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-50/50"
                  >
                    <td className="sticky left-0 z-10 bg-white px-4 py-3">
                      <p className="font-medium text-zinc-800">
                        {item.nome}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {item.identificacao || item.tipo}
                      </p>
                    </td>
                    {weekDays.map((day, i) => {
                      const schedule = getEquipmentSchedule(
                        item.id,
                        day,
                      );
                      const dayStr = toDateInput(day);
                      const isFirstDay =
                        schedule &&
                        dayStr === schedule.data_inicio;
                      return (
                        <td key={i} className="p-1.5 align-top">
                          {schedule ? (
                            <button
                              onClick={() => {
                                setSelectedSchedule(schedule);
                                setIsScheduleViewOpen(true);
                              }}
                              className={`w-full rounded-md p-1.5 text-left text-[10px] text-white shadow-sm hover:opacity-90 ${
                                schedule.status === "concluido"
                                  ? "bg-zinc-400"
                                  : isFirstDay
                                    ? "bg-emerald-600"
                                    : "bg-red-600"
                              }`}
                            >
                              <p className="flex items-center gap-1 truncate font-semibold">
                                <User className="h-2.5 w-2.5" />
                                {users.find(
                                  (u: any) =>
                                    u.id === schedule.user_id,
                                )?.nome || "N/D"}
                              </p>
                              <p className="mt-0.5 truncate opacity-80">
                                {isFirstDay
                                  ? "Início"
                                  : "Em uso"}
                              </p>
                            </button>
                          ) : canCreate ? (
                            <button
                              onClick={() =>
                                openEquipmentCreate(item)
                              }
                              className="h-12 w-full rounded-md border border-dashed border-zinc-200 text-[10px] text-zinc-300 hover:border-red-300 hover:bg-red-50/60 hover:text-red-600 dark:text-red-300"
                            >
                              + Requisitar
                            </button>
                          ) : (
                            <div className="h-12" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: nova reserva de viatura */}
      <Dialog
        open={isVehicleModalOpen}
        onOpenChange={setIsVehicleModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Reservar {selectedVehicle?.matricula} —{" "}
              {selectedDay?.toLocaleDateString("pt-PT")}
            </DialogTitle>
            <DialogDescription>
              Preenche os dados da reserva.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleVehicleSubmit}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Reservado por</Label>
              <Input
                value={currentUser?.nome || ""}
                disabled
                className="bg-zinc-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-local">Local / Obra *</Label>
              <Input
                id="v-local"
                value={vLocal}
                onChange={(e) => setVLocal(e.target.value)}
                placeholder="Ex: Guimarães, Obra X"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-hora">Hora</Label>
              <Input
                id="v-hora"
                type="time"
                value={vHora}
                onChange={(e) => setVHora(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVehicleModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-[#b91c1c]"
              >
                Reservar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: detalhes/eliminar reserva de viatura */}
      <Dialog
        open={isEventDetailsOpen}
        onOpenChange={setIsEventDetailsOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Reserva</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-zinc-500">
                  Data
                </Label>
                <p className="font-medium">
                  {new Date(
                    selectedEvent.data,
                  ).toLocaleDateString("pt-PT")}
                </p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500">
                  Utilizador
                </Label>
                <p className="font-medium">
                  {selectedEvent.utilizador}
                </p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500">
                  Local
                </Label>
                <p className="font-medium">
                  {selectedEvent.local || "-"}
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEventDetailsOpen(false)}
                >
                  Fechar
                </Button>
                {canEdit && (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteEvent}
                  >
                    Eliminar Reserva
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: nova requisição de equipamento */}
      <Dialog
        open={isEquipmentModalOpen}
        onOpenChange={setIsEquipmentModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Requisitar {selectedEquipment?.nome}
            </DialogTitle>
            <DialogDescription>
              Preenche os dados da requisição.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleEquipmentSubmit}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Reservado por</Label>
              <Input
                value={currentUser?.nome || ""}
                disabled
                className="bg-zinc-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-destinatario">
                Para quem *
              </Label>
              <Input
                id="e-destinatario"
                value={eDestinatario}
                onChange={(e) =>
                  setEDestinatario(e.target.value)
                }
                placeholder="Ex: João Silva, Cliente X"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-data">Data de Início *</Label>
              <Input
                id="e-data"
                type="date"
                value={eDataInicio}
                onChange={(e) => setEDataInicio(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-notas">Notas</Label>
              <Textarea
                id="e-notas"
                value={eNotas}
                onChange={(e) => setENotas(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEquipmentModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-[#b91c1c]"
              >
                Requisitar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: ver/finalizar/eliminar requisição de equipamento */}
      <Dialog
        open={isScheduleViewOpen}
        onOpenChange={setIsScheduleViewOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {
                equipment.find(
                  (e: any) =>
                    e.id === selectedSchedule?.equipment_id,
                )?.nome
              }
            </DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-zinc-500">
                  Utilizador
                </Label>
                <p className="font-medium">
                  {users.find(
                    (u: any) =>
                      u.id === selectedSchedule.user_id,
                  )?.nome || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500">
                  Para quem
                </Label>
                <p className="font-medium">
                  {selectedSchedule.destinatario || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500">
                  Início
                </Label>
                <p className="font-medium">
                  {new Date(
                    selectedSchedule.data_inicio,
                  ).toLocaleDateString("pt-PT")}
                </p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500">
                  Status
                </Label>
                <p className="font-medium text-red-600 dark:text-red-300">
                  {selectedSchedule.status === "ativo"
                    ? "Em curso"
                    : "Devolvido"}
                </p>
              </div>
              {selectedSchedule.notas && (
                <div>
                  <Label className="text-xs text-zinc-500">
                    Notas
                  </Label>
                  <p className="text-sm">
                    {selectedSchedule.notas}
                  </p>
                </div>
              )}
              <DialogFooter className="flex gap-2">
                {selectedSchedule.status === "ativo" &&
                  canEdit && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() =>
                        handleFinishSchedule(
                          selectedSchedule.id,
                        )
                      }
                    >
                      Finalizar
                    </Button>
                  )}
                {canEdit && (
                  <Button
                    variant="destructive"
                    onClick={() =>
                      handleDeleteSchedule(selectedSchedule.id)
                    }
                  >
                    Eliminar
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: relatório de requisições */}
      <Dialog
        open={isReportOpen}
        onOpenChange={setIsReportOpen}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Relatório de Requisições de Equipamentos
            </DialogTitle>
            <DialogDescription>
              Total: {filteredReservations.length}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Pesquisar por equipamento, utilizador ou destinatário..."
                value={reportSearch}
                onChange={(e) =>
                  setReportSearch(e.target.value)
                }
                className="h-9 pl-9"
              />
            </div>
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                  <tr>
                    <th className="px-4 py-2">Equipamento</th>
                    <th className="px-4 py-2">Utilizador</th>
                    <th className="px-4 py-2">Para Quem</th>
                    <th className="px-4 py-2">Início</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-zinc-400"
                      >
                        Nenhuma requisição encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((s: any) => (
                      <tr
                        key={s.id}
                        className="hover:bg-zinc-50/70"
                      >
                        <td className="px-4 py-2 font-medium text-zinc-800">
                          {equipment.find(
                            (e: any) => e.id === s.equipment_id,
                          )?.nome || "-"}
                        </td>
                        <td className="px-4 py-2 text-zinc-600">
                          {users.find(
                            (u: any) => u.id === s.user_id,
                          )?.nome || "-"}
                        </td>
                        <td className="px-4 py-2 text-zinc-600">
                          {s.destinatario || "-"}
                        </td>
                        <td className="px-4 py-2 text-zinc-600">
                          {new Date(
                            s.data_inicio,
                          ).toLocaleDateString("pt-PT")}
                        </td>
                        <td className="px-4 py-2">
                          {s.status === "ativo" ? (
                            <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-300">
                              Ativo
                            </span>
                          ) : (
                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                              Devolvido
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsReportOpen(false)}
              className="bg-red-600 hover:bg-[#b91c1c]"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}