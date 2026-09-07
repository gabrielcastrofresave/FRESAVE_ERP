import { supabase } from "../api";

export type NotificationPayload = {
  tipo: "aviso" | "erro" | "sucesso" | "info";
  titulo: string;
  mensagem: string;
};

type AddNotificationFn = (n: NotificationPayload) => void;

// Fire a native browser Notification if permission is granted and page is hidden
function fireBrowserNotification(titulo: string, mensagem: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!document.hidden) return; // only when tab is in background
  try {
    new Notification(titulo, {
      body: mensagem,
      icon: "https://media.licdn.com/dms/image/v2/D4D0BAQE5TclqZAO2YA/company-logo_200_200/company-logo_200_200/0/1687771286669?e=2147483647&v=beta&t=d-4KNKnwa9oNStJhSusNNJyfWPYCOWl1-Ufrllnj3x0",
      tag: titulo,
    });
  } catch (_) {}
}

// Request permission once (non-blocking)
export function requestBrowserNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

/**
 * Subscribe to Supabase Realtime for events relevant to the current user.
 * Returns a cleanup function.
 */
export function subscribeRealtimeNotifications(
  currentUser: { id: string; nome: string; role: string } | null,
  addNotification: AddNotificationFn,
): () => void {
  if (!currentUser) return () => {};

  const isAdmin = currentUser.role === "administrador";
  const isGestor = currentUser.role === "gestor";
  const isAdminOrGestor = isAdmin || isGestor;

  const notify = (n: NotificationPayload) => {
    addNotification(n);
    fireBrowserNotification(n.titulo, n.mensagem);
  };

  // ── Channel 1: Tickets ─────────────────────────────────────────
  // - Non-admins: get notified when their ticket gets a reply
  // - Admins/Gestores: get notified when any NEW ticket is created
  const ticketsChannel = supabase
    .channel("realtime-tickets")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tickets" },
      (payload) => {
        const newRow = payload.new as any;
        const oldRow = payload.old as any;

        if (payload.eventType === "INSERT") {
          // New ticket — notify admins/gestores
          if (isAdminOrGestor && newRow.criado_por !== currentUser.nome) {
            const prioridade = newRow.prioridade?.toUpperCase() || "";
            const tipo: NotificationPayload["tipo"] =
              newRow.prioridade === "urgente" ? "erro" :
              newRow.prioridade === "alta" ? "aviso" : "info";
            notify({
              tipo,
              titulo: `Novo Ticket${prioridade === "URGENTE" ? " 🚨 URGENTE" : ""}`,
              mensagem: `"${newRow.titulo}" criado por ${newRow.criado_por}`,
            });
          }
        }

        if (payload.eventType === "UPDATE") {
          // Reply added — notify ticket creator (if not admin replying)
          const gotReply =
            newRow.resposta_admin &&
            newRow.resposta_admin !== oldRow?.resposta_admin;
          if (gotReply && newRow.criado_por === currentUser.nome) {
            notify({
              tipo: "sucesso",
              titulo: "Resposta ao seu Ticket",
              mensagem: `O seu ticket "${newRow.titulo}" foi respondido`,
            });
          }

          // Status changed — notify ticket creator
          if (
            newRow.status !== oldRow?.status &&
            newRow.criado_por === currentUser.nome &&
            !isAdmin
          ) {
            const statusMap: Record<string, string> = {
              em_progresso: "Em Progresso",
              resolvido: "Resolvido",
              fechado: "Fechado",
            };
            const label = statusMap[newRow.status];
            if (label) {
              notify({
                tipo: newRow.status === "resolvido" ? "sucesso" : "info",
                titulo: "Ticket Atualizado",
                mensagem: `O seu ticket "${newRow.titulo}" passou a "${label}"`,
              });
            }
          }
        }
      },
    )
    .subscribe();

  // ── Channel 2: Avarias ────────────────────────────────────────
  // Admins/gestores get notified of new avarias
  const avariasChannel = supabase
    .channel("realtime-avarias")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "avarias" },
      (payload) => {
        if (!isAdminOrGestor) return;
        const newRow = payload.new as any;
        notify({
          tipo: "erro",
          titulo: "Nova Avaria Registada",
          mensagem: `${newRow.item_nome || "Equipamento"} (${newRow.tipo || ""}) — ${newRow.motivo_avaria || ""}`,
        });
      },
    )
    .subscribe();

  // ── Channel 3: Truck schedules ────────────────────────────────
  // Notify the assigned user when a schedule is created for them
  const truckSchedulesChannel = supabase
    .channel("realtime-truck-schedules")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "truck_schedules" },
      (payload) => {
        const newRow = payload.new as any;
        // Notify the person it was booked for (utilizador field)
        if (
          newRow.utilizador === currentUser.nome &&
          newRow.user_id !== currentUser.id
        ) {
          notify({
            tipo: "info",
            titulo: "Novo Agendamento — Camião",
            mensagem: `Agendamento para ${newRow.data} em ${newRow.local || "local não definido"}`,
          });
        }
        // Notify admins of any new booking
        if (isAdminOrGestor && newRow.user_id !== currentUser.id) {
          notify({
            tipo: "info",
            titulo: "Reserva de Camião",
            mensagem: `${newRow.utilizador} agendou para ${newRow.data}`,
          });
        }
      },
    )
    .subscribe();

  // ── Channel 4: Machine schedules ─────────────────────────────
  const machineSchedulesChannel = supabase
    .channel("realtime-machine-schedules")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "machine_schedules" },
      (payload) => {
        if (!isAdminOrGestor) return;
        const newRow = payload.new as any;
        if (newRow.user_id === currentUser.id) return; // own action
        notify({
          tipo: "info",
          titulo: "Nova Reserva de Máquina",
          mensagem: `Máquina agendada de ${newRow.data_inicio} — OT: ${newRow.ordem_trabalho || "—"}`,
        });
      },
    )
    .subscribe();

  // ── Channel 5: Trucks status changes ─────────────────────────
  const trucksChannel = supabase
    .channel("realtime-trucks")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "trucks" },
      (payload) => {
        const newRow = payload.new as any;
        const oldRow = payload.old as any;
        if (newRow.status === oldRow?.status) return;

        const statusMap: Record<string, { label: string; tipo: NotificationPayload["tipo"] }> = {
          manutencao: { label: "em Manutenção", tipo: "aviso" },
          avaria: { label: "em Avaria", tipo: "erro" },
          disponivel: { label: "Disponível", tipo: "sucesso" },
        };
        const info = statusMap[newRow.status];
        if (!info) return;

        if (isAdminOrGestor) {
          notify({
            tipo: info.tipo,
            titulo: `Camião ${newRow.matricula} — ${info.label}`,
            mensagem: `O estado do camião ${newRow.matricula} foi atualizado`,
          });
        }
      },
    )
    .subscribe();

  // ── Channel 6: Vehicles status changes ───────────────────────
  const vehiclesChannel = supabase
    .channel("realtime-vehicles")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "vehicles" },
      (payload) => {
        const newRow = payload.new as any;
        const oldRow = payload.old as any;
        if (newRow.status === oldRow?.status) return;

        if (isAdminOrGestor) {
          const statusMap: Record<string, string> = {
            manutencao: "em Manutenção",
            avaria: "em Avaria",
            disponivel: "Disponível",
          };
          const label = statusMap[newRow.status] || newRow.status;
          notify({
            tipo: newRow.status === "avaria" ? "erro" : newRow.status === "manutencao" ? "aviso" : "sucesso",
            titulo: `Viatura ${newRow.matricula} — ${label}`,
            mensagem: `O estado da viatura ${newRow.matricula} foi atualizado`,
          });
        }
      },
    )
    .subscribe();

  // ── Channel 7: Maintenances ───────────────────────────────────
  const maintenancesChannel = supabase
    .channel("realtime-maintenances")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "maintenances" },
      (payload) => {
        if (!isAdminOrGestor) return;
        const newRow = payload.new as any;
        notify({
          tipo: "aviso",
          titulo: "Nova Manutenção Agendada",
          mensagem: `${newRow.item_nome || "Item"} — ${newRow.descricao || ""}`,
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(ticketsChannel);
    supabase.removeChannel(avariasChannel);
    supabase.removeChannel(truckSchedulesChannel);
    supabase.removeChannel(machineSchedulesChannel);
    supabase.removeChannel(trucksChannel);
    supabase.removeChannel(vehiclesChannel);
    supabase.removeChannel(maintenancesChannel);
  };
}
