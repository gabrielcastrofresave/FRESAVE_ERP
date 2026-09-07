// src/utils/calendarValidations.ts
import {
  Truck,
  Vehicle,
  Machine,
  Equipment,
} from "../app/types";

export type SchedulableItem =
  | Truck
  | Vehicle
  | Machine
  | Equipment;

interface ValidationResult {
  canSchedule: boolean;
  reason?: string;
}

/**
 * Verifica se um item pode ser marcado no calendário
 * Permite múltiplos agendamentos!
 */
export function canScheduleItem(
  item: SchedulableItem,
): ValidationResult {
  // 1. Verificar se está em avaria
  if (item.status === "avaria") {
    return {
      canSchedule: false,
      reason:
        "Item em avaria. Resolve a avaria primeiro.",
    };
  }

  // 2. Verificar se está em manutenção
  if (item.status === "manutencao") {
    return {
      canSchedule: false,
      reason:
        "Item em manutenção. Aguarde conclusão.",
    };
  }

  // 3. Verificar datas vencidas
  const expiredDateCheck = checkExpiredDates(item);
  if (!expiredDateCheck.valid) {
    return {
      canSchedule: false,
      reason: expiredDateCheck.reason,
    };
  }

  // 4. Verificar KM/Horas vencidas
  const expiredMetricsCheck = checkExpiredMetrics(item);
  if (!expiredMetricsCheck.valid) {
    return {
      canSchedule: false,
      reason: expiredMetricsCheck.reason,
    };
  }

  // ✅ Permite múltiplos agendamentos no futuro!
  return { canSchedule: true };
}

/**
 * Verifica se datas de inspeção/seguro estão vencidas
 */
function checkExpiredDates(item: SchedulableItem): {
  valid: boolean;
  reason?: string;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Verificar inspeção
  if (item.dataInspecao) {
    const inspectionDate = new Date(item.dataInspecao);
    inspectionDate.setHours(0, 0, 0, 0);

    if (inspectionDate < today) {
      return {
        valid: false,
        reason:
          "Inspeção vencida. Renova antes de agendar.",
      };
    }
  }

  // Verificar seguro
  if (item.dataSeguro) {
    const insuranceDate = new Date(item.dataSeguro);
    insuranceDate.setHours(0, 0, 0, 0);

    if (insuranceDate < today) {
      return {
        valid: false,
        reason:
          "Seguro vencido. Renova antes de agendar.",
      };
    }
  }

  return { valid: true };
}

/**
 * Verifica se KM/Horas ultrapassaram os limites
 */
function checkExpiredMetrics(item: SchedulableItem): {
  valid: boolean;
  reason?: string;
} {
  // Verificar KM
  if (
    item.kmAtual &&
    item.proximaManutencaoKm &&
    item.kmAtual >= item.proximaManutencaoKm
  ) {
    return {
      valid: false,
      reason:
        "Manutenção de KM vencida. Realiza a manutenção antes.",
    };
  }

  // Verificar Horas (para máquinas)
  if (
    "horasAtual" in item &&
    "proximaManutencaoHoras" in item
  ) {
    if (
      item.horasAtual &&
      item.proximaManutencaoHoras &&
      item.horasAtual >= item.proximaManutencaoHoras
    ) {
      return {
        valid: false,
        reason:
          "Manutenção de horas vencida. Realiza a manutenção antes.",
      };
    }
  }

  return { valid: true };
}

/**
 * Verifica se um item deveria estar em "manutenção"
 * (programação já passou)
 */
export function shouldBeInMaintenance(
  item: SchedulableItem,
  events: any[],
): boolean {
  const itemEvents = events.filter(
    (e) => e.itemId === item.id,
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Se há um evento agendado que já passou
  const pastEvent = itemEvents.find((e) => {
    const eventDate = new Date(e.data);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < today;
  });

  return !!pastEvent;
}

/**
 * Retorna até quando o item está bloqueado para agendamento
 */
export function getBlockedUntilDate(
  item: SchedulableItem,
): string | null {
  // Se está em avaria ou manutenção, indefinidamente bloqueado
  if (
    item.status === "avaria" ||
    item.status === "manutencao"
  ) {
    return "indefinidamente";
  }

  // Caso contrário, não está bloqueado
  return null;
}

/**
 * Obtém motivo do bloqueio (se houver)
 */
export function getBlockReasonForItem(
  item: SchedulableItem,
): string | null {
  const validation = canScheduleItem(item);

  if (!validation.canSchedule) {
    return validation.reason || null;
  }

  return null;
}