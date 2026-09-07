import {
  Truck,
  Vehicle,
  Machine,
  Equipment,
  Grua,
  Notification,
} from "../types";
import { isDateExpired } from "./validations";

interface GeneratedNotification {
  notification: Omit<Notification, "id" | "timestamp" | "lida">;
  shouldPush: boolean;
}

export const generateNotifications = (
  trucks: Truck[],
  vehicles: Vehicle[],
  machines: Machine[],
  equipment: Equipment[],
  gruas: Grua[],
  avarias: any[],
  tickets: any[]
): GeneratedNotification[] => {
  const notifications: GeneratedNotification[] = [];

  // ==================== CAMIÕES ====================
  trucks.forEach((truck) => {
    if (isDateExpired(truck.dataInspecao)) {
      notifications.push({
        notification: {
          tipo: "erro",
          titulo: "🚨 Inspeção Vencida - CRÍTICO",
          mensagem: `Camião ${truck.matricula} - Inspeção vencida. Operação bloqueada!`,
        },
        shouldPush: true,
      });
    } else {
      const inspecaoDate = new Date(truck.dataInspecao);
      const diasInspecao = Math.ceil(
        (inspecaoDate.getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (diasInspecao > 0 && diasInspecao <= 7) {
        notifications.push({
          notification: {
            tipo: "aviso",
            titulo: `⚠️ Inspeção Vence em ${diasInspecao} dias`,
            mensagem: `Camião ${truck.matricula} - Agende a inspeção urgentemente`,
          },
          shouldPush: diasInspecao <= 2,
        });
      }
    }

    if (isDateExpired(truck.dataSeguro)) {
      notifications.push({
        notification: {
          tipo: "erro",
          titulo: "🚨 Seguro Vencido - CRÍTICO",
          mensagem: `Camião ${truck.matricula} - Seguro vencido. Operação bloqueada!`,
        },
        shouldPush: true,
      });
    } else {
      const seguroDate = new Date(truck.dataSeguro);
      const diasSeguro = Math.ceil(
        (seguroDate.getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (diasSeguro > 0 && diasSeguro <= 7) {
        notifications.push({
          notification: {
            tipo: "aviso",
            titulo: `⚠️ Seguro Vence em ${diasSeguro} dias`,
            mensagem: `Camião ${truck.matricula} - Renove o seguro urgentemente`,
          },
          shouldPush: diasSeguro <= 2,
        });
      }
    }

    if (
      truck.aferirTacografoEm &&
      isDateExpired(truck.aferirTacografoEm)
    ) {
      notifications.push({
        notification: {
          tipo: "erro",
          titulo: "🚨 Tacógrafo Vencido",
          mensagem: `Camião ${truck.matricula} - Aferição vencida`,
        },
        shouldPush: true,
      });
    }

    if (
      truck.temAutorizacaoEspecial &&
      truck.validadeAutorizacaoEspecial &&
      isDateExpired(truck.validadeAutorizacaoEspecial)
    ) {
      notifications.push({
        notification: {
          tipo: "erro",
          titulo: "🚨 Autorização Especial Vencida",
          mensagem: `Camião ${truck.matricula} - Renove a autorização`,
        },
        shouldPush: true,
      });
    }

    if (
      truck.proximaManutencaoKm &&
      truck.kmAtual >= truck.proximaManutencaoKm
    ) {
      notifications.push({
        notification: {
          tipo: "aviso",
          titulo: "⚠️ Manutenção Vencida",
          mensagem: `Camião ${truck.matricula} - KM: ${truck.kmAtual}/${truck.proximaManutencaoKm}`,
        },
        shouldPush: true,
      });
    } else if (truck.proximaManutencaoKm) {
      const kmFaltando =
        truck.proximaManutencaoKm - truck.kmAtual;
      if (kmFaltando <= 500) {
        notifications.push({
          notification: {
            tipo: "info",
            titulo: `📊 Manutenção em ${kmFaltando} KM`,
            mensagem: `Camião ${truck.matricula}`,
          },
          shouldPush: kmFaltando <= 100,
        });
      }
    }
  });

  // ==================== VIATURAS ====================
  vehicles.forEach((vehicle) => {
    if (isDateExpired(vehicle.dataInspecao)) {
      notifications.push({
        notification: {
          tipo: "erro",
          titulo: "🚨 Inspeção Viatura Vencida",
          mensagem: `${vehicle.matricula} - Inspeção vencida`,
        },
        shouldPush: true,
      });
    }

    if (isDateExpired(vehicle.dataSeguro)) {
      notifications.push({
        notification: {
          tipo: "erro",
          titulo: "🚨 Seguro Viatura Vencido",
          mensagem: `${vehicle.matricula} - Seguro vencido`,
        },
        shouldPush: true,
      });
    }
  });

  // ==================== MÁQUINAS ====================
  machines.forEach((machine) => {
    if (isDateExpired(machine.dataInspecao)) {
      notifications.push({
        notification: {
          tipo: "erro",
          titulo: "🚨 Máquina Sem Inspeção",
          mensagem: `${machine.nome} - Inspeção vencida`,
        },
        shouldPush: true,
      });
    }
  });

  // ==================== EQUIPAMENTOS ====================
  equipment.forEach((equip) => {
    if (isDateExpired(equip.proximaManutencao)) {
      notifications.push({
        notification: {
          tipo: "aviso",
          titulo: "⚠️ Equipamento Precisa Manutenção",
          mensagem: `${equip.nome} - Manutenção vencida`,
        },
        shouldPush: true,
      });
    }
  });

  // ==================== GRUAS ====================
  gruas.forEach((grua) => {
    if (isDateExpired(grua.inspecionarGruaEm)) {
      notifications.push({
        notification: {
          tipo: "erro",
          titulo: "🚨 Inspeção de Grua Vencida",
          mensagem: `Grua ${grua.nºSerie} - Inspeção vencida`,
        },
        shouldPush: true,
      });
    }
  });

  // ==================== AVARIAS ====================
  const avariasPendentes = avarias.filter((a) => !a.resolvida);
  if (avariasPendentes.length > 0) {
    notifications.push({
      notification: {
        tipo: "erro",
        titulo: `🔧 ${avariasPendentes.length} Avaria(s) Aberta(s)`,
        mensagem: `Tem ${avariasPendentes.length} avaria(s) não resolvida(s)`,
      },
      shouldPush: avariasPendentes.length >= 3,
    });
  }

  // ==================== TICKETS ====================
  const ticketsAbertos = tickets.filter(
    (t) => t.status === "aberto" || t.status === "em_progresso"
  );
  if (ticketsAbertos.length > 0) {
    const ticketsUrgentes = ticketsAbertos.filter(
      (t) => t.prioridade === "urgente"
    );
    if (ticketsUrgentes.length > 0) {
      notifications.push({
        notification: {
          tipo: "erro",
          titulo: `🚨 ${ticketsUrgentes.length} Ticket(s) URGENTE(s)`,
          mensagem: `Tem ${ticketsUrgentes.length} ticket(s) urgente(s)`,
        },
        shouldPush: true,
      });
    }
  }

  return notifications;
};