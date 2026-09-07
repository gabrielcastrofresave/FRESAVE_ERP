// src/app/utils/validations.ts

import {
  Truck,
  Vehicle,
  Machine,
  Equipment,
  Grua,
  Tacografo,
  CalendarEvent,
} from "../types";

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Verifica se uma data está vencida
 */
export const isDateExpired = (date: string): boolean => {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
};

// ==================== VALIDAÇÕES SIMPLES ====================

/**
 * Valida camiões/viaturas/máquinas
 */
export const isTruckValid = (
  truck: Truck | Vehicle | Machine,
): boolean => {
  if (truck.status === "avaria") return false;
  if (isDateExpired(truck.dataInspecao)) return false;
  if (isDateExpired(truck.dataSeguro)) return false;
  if (
    truck.proximaManutencaoKm &&
    truck.kmAtual >= truck.proximaManutencaoKm
  )
    return false;

  // ✅ Validação do tacógrafo
  if (
    truck.aferirTacografoEm &&
    isDateExpired(truck.aferirTacografoEm)
  )
    return false;

  // ✅ Validação da autorização especial
  if (
    truck.temAutorizacaoEspecial &&
    truck.validadeAutorizacaoEspecial &&
    isDateExpired(truck.validadeAutorizacaoEspecial)
  )
    return false;

  return true;
};

/**
 * Valida equipamentos
 */
export const isEquipmentValid = (
  equipment: Equipment,
): boolean => {
  if (equipment.status === "avaria") return false;
  if (isDateExpired(equipment.proximaManutencao)) return false;
  return true;
};

// ==================== TACÓGRAFOS ====================

/**
 * Valida tacógrafo
 */
export const isTacografoValid = (
  tacografo: Tacografo,
): boolean => {
  if (!tacografo.aferirem) return true;
  return !isDateExpired(tacografo.aferirem);
};

/**
 * Obtém motivo do bloqueio do tacógrafo
 */
export const getTacografoBlockReason = (
  tacografo: Tacografo,
): string | null => {
  if (!tacografo.aferirem) return null;

  if (isDateExpired(tacografo.aferirem)) {
    return `Aferição vencida desde ${new Date(
      tacografo.aferirem,
    ).toLocaleDateString("pt-PT")}`;
  }

  return null;
};

// ==================== GRUAS ====================

/**
 * Verifica se inspeção da grua está vencida
 */
export const isGruaInspectionExpired = (
  gruaInspecaoData: string,
): boolean => {
  if (!gruaInspecaoData) return false;
  return isDateExpired(gruaInspecaoData);
};

/**
 * Verifica se a grua está expirada (inspeção vencida)
 */
export const isGruaExpired = (grua: Grua): boolean => {
  if (!grua.inspecionargruaem) return false;
  return isDateExpired(grua.inspecionargruaem);
};

/**
 * Status da grua (apenas baseado na própria grua)
 */
export const getGruaAutoStatus = (
  grua: Grua,
): "disponivel" | "em_uso" | "manutencao" | "avaria" => {
  // 1️⃣ Se a grua tem status próprio de avaria
  if (grua.status === "avaria") {
    return "avaria";
  }

  // 2️⃣ Verifica a inspeção própria da grua
  if (isGruaExpired(grua)) {
    return "manutencao";
  }

  // 3️⃣ Retorna o status atual ou disponível
  return grua.status || "disponivel";
};

/**
 * Motivo do bloqueio da grua
 */
export const getGruaBlockReason = (
  grua: Grua,
): string | null => {
  if (grua.status === "avaria") {
    const motivoAvaria = (grua as any).motivoAvaria;
    return `Em avaria: ${motivoAvaria || "Motivo não especificado"}`;
  }

  if (isGruaExpired(grua)) {
    return `Inspeção vencida desde ${new Date(
      grua.inspecionargruaem,
    ).toLocaleDateString("pt-PT")}`;
  }

  return null;
};

// ==================== STATUS AUTOMÁTICO ====================

export const getAutoStatus = (
  item: Truck | Vehicle | Machine | Equipment,
  gruas?: Grua[],
  tacografos?: Tacografo[],
  calendarEvents?: CalendarEvent[]
): "disponivel" | "em_uso" | "manutencao" | "avaria" => {
  
  // 1. Avaria (Prioridade Máxima)
  if (item.status === "avaria") return "avaria";

  // 2. Manutenção / Documentos (Prioridade Alta)
  const isEquip = "dataAquisicao" in item;
  if (isEquip) {
    if (!isEquipmentValid(item as Equipment)) return "manutencao";
  } else {
    const vehicle = item as Truck | Vehicle;
    if (isDateExpired(vehicle.dataInspecao)) return "manutencao";
    if (isDateExpired(vehicle.dataSeguro)) return "manutencao";
    
    // Validações extra
    if (tacografos && tacografos.length > 0) {
      const tac = tacografos.find((t) => t.camioid === vehicle.id);
      if (tac && !isTacografoValid(tac)) return "manutencao";
    }
    if (vehicle.aferirTacografoEm && isDateExpired(vehicle.aferirTacografoEm)) return "manutencao";
    if (vehicle.temAutorizacaoEspecial && vehicle.validadeAutorizacaoEspecial && isDateExpired(vehicle.validadeAutorizacaoEspecial)) return "manutencao";
    if (vehicle.proximaManutencaoKm && vehicle.kmAtual >= vehicle.proximaManutencaoKm) return "manutencao";
  }

  // 3. Calendário (A VERIFICAÇÃO CRUCIAL)
  if (calendarEvents && calendarEvents.length > 0) {
    
    // 🔥 PASSO A: Gerar a data de hoje localmente (YYYY-MM-DD)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`; // Ex: "2024-01-29"

    // 🔥 PASSO B: Encontrar evento
    const hasEventToday = calendarEvents.some((event) => {
      if (event.itemId !== item.id) return false;

      // Log para debug (abre a consola F12 para ver isto se falhar)
      // Se a tua data no evento for "2024-01-29T00:00:00", vamos cortar o tempo
      const eventDateOnly = event.data.split('T')[0]; 
      
      const isMatch = eventDateOnly === todayStr;
      
      if (isMatch) {
         // console.log(`🎯 ENCONTRADO! Item: ${item.id} | Evento: ${eventDateOnly} | Hoje: ${todayStr}`);
      }
      
      return isMatch;
    });

    if (hasEventToday) {
      return "em_uso";
    }
  }

  // 4. Default: Se chegou aqui, deve ser 'disponivel'.
  // Se a BD diz 'em_uso' mas o código acima não encontrou evento hoje, 
  // o AppContext vai encarregar-se de mudar para 'disponivel'.
  return "disponivel";
};
// ==================== MOTIVOS DE BLOQUEIO ====================

/**
 * Obtém motivo do bloqueio (COM AVISOS DE GRUAS/TACÓGRAFOS)
 */
export const getBlockReason = (
  item: Truck | Vehicle | Machine | Equipment,
  gruas?: Grua[],
  tacografos?: Tacografo[],
): string | null => {
  // ✅ VERIFICAÇÃO PRÓPRIA DO ITEM
  if (item.status === "avaria") {
    return `Em avaria`;
  }

  const isEquip = "dataAquisicao" in item;

  if (isEquip) {
    const equipment = item as Equipment;
    if (isDateExpired(equipment.proximaManutencao))
      return "Manutenção vencida";
  } else {
    const vehicle = item as Truck | Vehicle;

    if (isDateExpired(vehicle.dataInspecao))
      return `Inspeção vencida desde ${new Date(vehicle.dataInspecao).toLocaleDateString("pt-PT")}`;

    if (isDateExpired(vehicle.dataSeguro))
      return `Seguro vencido desde ${new Date(vehicle.dataSeguro).toLocaleDateString("pt-PT")}`;

    // ✅ VERIFICAÇÃO DO TACÓGRAFO NA TABELA SEPARADA (PRIORIDADE)
    if (tacografos && tacografos.length > 0) {
      const tacografoAssociado = tacografos.find(
        (t) => t.camioid === vehicle.id,
      );

      if (
        tacografoAssociado &&
        !isTacografoValid(tacografoAssociado)
      ) {
        return `Aferição de Tacógrafo expirada desde ${new Date(
          tacografoAssociado.aferirem,
        ).toLocaleDateString("pt-PT")}`;
      }
    }

    // ✅ VERIFICAÇÃO DO TACÓGRAFO NO PRÓPRIO VEÍCULO (FALLBACK)
    if (
      vehicle.aferirTacografoEm &&
      isDateExpired(vehicle.aferirTacografoEm)
    )
      return `Aferição de Tacógrafo expirada desde ${new Date(vehicle.aferirTacografoEm).toLocaleDateString("pt-PT")}`;

    // ✅ VERIFICAÇÃO DA AUTORIZAÇÃO ESPECIAL
    if (
      vehicle.temAutorizacaoEspecial &&
      vehicle.validadeAutorizacaoEspecial &&
      isDateExpired(vehicle.validadeAutorizacaoEspecial)
    )
      return `Autorização Especial de Trânsito expirada desde ${new Date(vehicle.validadeAutorizacaoEspecial).toLocaleDateString("pt-PT")}`;

    if (
      vehicle.proximaManutencaoKm &&
      vehicle.kmAtual >= vehicle.proximaManutencaoKm
    )
      return "Manutenção expirada (KM atingido)";
  }

  return null;
};

/**
 * Obtém avisos de gruas e tacógrafos (SEPARADO)
 */
export const getRelatedWarnings = (
  item: Truck | Vehicle | Machine,
  gruas?: Grua[],
  tacografos?: Tacografo[],
): string[] => {
  const warnings: string[] = [];

  // ⚠️ AVISOS DE GRUAS
  if (gruas && gruas.length > 0) {
    const gruasAssociadas = gruas.filter(
      (g) => g.veiculoId === item.id,
    );

    gruasAssociadas.forEach((grua) => {
      if (grua.status === "avaria") {
        warnings.push(`Grua ${grua.n_serie} em avaria`);
      } else if (isGruaExpired(grua)) {
        warnings.push(
          `Grua ${grua.n_serie} com inspeção expirada desde ${new Date(
            grua.inspecionargruaem,
          ).toLocaleDateString("pt-PT")}`,
        );
      }
    });
  }

  // ⚠️ AVISOS DE TACÓGRAFOS (TABELA SEPARADA)
  if (tacografos && tacografos.length > 0) {
    const tacografoAssociado = tacografos.find(
      (t) => t.camioid === item.id,
    );

    if (
      tacografoAssociado &&
      !isTacografoValid(tacografoAssociado)
    ) {
      warnings.push(
        `Tacógrafo expirado desde ${new Date(
          tacografoAssociado.aferirem,
        ).toLocaleDateString("pt-PT")}`,
      );
    }
  }

  return warnings;
};

// ==================== PRÓXIMA DATA DE EXPIRAÇÃO ====================

/**
 * Obtém a próxima data de expiração
 */
export const getNextExpiryDate = (
  item: Truck | Vehicle | Machine | Equipment,
  tacografos?: Tacografo[],
): { type: string; date: string } | null => {
  const dates: { type: string; date: Date }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isEquip = "dataAquisicao" in item;

  if (isEquip) {
    const equipment = item as Equipment;
    const manutencaoDate = new Date(
      equipment.proximaManutencao,
    );
    if (manutencaoDate >= today)
      dates.push({ type: "Manutenção", date: manutencaoDate });
  } else {
    const vehicle = item as Truck | Vehicle | Machine;

    // ✅ INSPEÇÃO
    const inspecaoDate = new Date(vehicle.dataInspecao);
    if (inspecaoDate >= today)
      dates.push({ type: "Inspeção", date: inspecaoDate });

    // ✅ SEGURO
    const seguroDate = new Date(vehicle.dataSeguro);
    if (seguroDate >= today)
      dates.push({ type: "Seguro", date: seguroDate });

    // ✅ TACÓGRAFO (TABELA SEPARADA - PRIORIDADE)
    if (tacografos && tacografos.length > 0) {
      const tacografoAssociado = tacografos.find(
        (t) => t.camioid === vehicle.id,
      );

      if (tacografoAssociado && tacografoAssociado.aferirem) {
        const tacDate = new Date(tacografoAssociado.aferirem);
        if (tacDate >= today)
          dates.push({
            type: "Aferição Tacógrafo",
            date: tacDate,
          });
      }
    }

    // ✅ TACÓGRAFO (PRÓPRIO VEÍCULO - FALLBACK)
    if (vehicle.aferirTacografoEm) {
      const tacDate = new Date(vehicle.aferirTacografoEm);
      if (tacDate >= today)
        dates.push({
          type: "Aferição Tacógrafo",
          date: tacDate,
        });
    }

    // ✅ AUTORIZAÇÃO ESPECIAL
    if (
      vehicle.temAutorizacaoEspecial &&
      vehicle.validadeAutorizacaoEspecial
    ) {
      const authDate = new Date(
        vehicle.validadeAutorizacaoEspecial,
      );
      if (authDate >= today)
        dates.push({
          type: "Autorização Especial",
          date: authDate,
        });
    }

    // ✅ PRÓXIMA MANUTENÇÃO (PARA MÁQUINAS)
    if (
      "proximaManutencaoData" in vehicle &&
      vehicle.proximaManutencaoData
    ) {
      const manutencaoDate = new Date(
        vehicle.proximaManutencaoData,
      );
      if (manutencaoDate >= today)
        dates.push({
          type: "Manutenção",
          date: manutencaoDate,
        });
    }
  }

  if (dates.length === 0) return null;
  dates.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    type: dates[0].type,
    date: dates[0].date.toISOString().split("T")[0],
  };
};

// ==================== VERIFICAÇÃO DE AGENDAMENTO ====================

/**
 * Verifica se um item pode ser agendado para uma data
 */
export const canScheduleForDate = (
  item: Truck | Vehicle | Machine | Equipment,
  targetDate: string,
  tacografos?: Tacografo[],
): { canSchedule: boolean; reason?: string } => {
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  // ❌ Verificação 1: Se está em avaria
  if (item.status === "avaria") {
    return {
      canSchedule: false,
      reason: "O item está em avaria e não pode ser agendado",
    };
  }

  // ❌ Verificação 2: Se está em manutenção
  const autoStatus = getAutoStatus(item, undefined, tacografos);
  if (autoStatus === "manutencao") {
    return {
      canSchedule: false,
      reason:
        "O item está em manutenção ou com documentação vencida",
    };
  }

  const isEquip = "dataAquisicao" in item;

  if (!isEquip) {
    const vehicle = item as Truck | Vehicle | Machine;

    // ❌ Verificação 3: Data de inspeção
    if (vehicle.dataInspecao) {
      const inspecaoDate = new Date(vehicle.dataInspecao);
      inspecaoDate.setHours(0, 0, 0, 0);
      if (target > inspecaoDate) {
        return {
          canSchedule: false,
          reason: `Não é possível agendar após ${inspecaoDate.toLocaleDateString(
            "pt-PT",
          )} (data de inspeção)`,
        };
      }
    }

    // ❌ Verificação 4: Data de seguro
    if (vehicle.dataSeguro) {
      const seguroDate = new Date(vehicle.dataSeguro);
      seguroDate.setHours(0, 0, 0, 0);
      if (target > seguroDate) {
        return {
          canSchedule: false,
          reason: `Não é possível agendar após ${seguroDate.toLocaleDateString(
            "pt-PT",
          )} (data de seguro)`,
        };
      }
    }

    // ❌ Verificação 5: Tacógrafo
    if (tacografos && tacografos.length > 0) {
      const tacografoAssociado = tacografos.find(
        (t) => t.camioid === vehicle.id,
      );

      if (
        tacografoAssociado &&
        tacografoAssociado.aferirem &&
        target > new Date(tacografoAssociado.aferirem)
      ) {
        return {
          canSchedule: false,
          reason: `Não é possível agendar após ${new Date(
            tacografoAssociado.aferirem,
          ).toLocaleDateString(
            "pt-PT",
          )} (aferição de tacógrafo)`,
        };
      }
    }

    // ❌ Verificação 6: Tacógrafo no próprio veículo
    if (
      vehicle.aferirTacografoEm &&
      target > new Date(vehicle.aferirTacografoEm)
    ) {
      return {
        canSchedule: false,
        reason: `Não é possível agendar após ${new Date(
          vehicle.aferirTacografoEm,
        ).toLocaleDateString("pt-PT")} (aferição de tacógrafo)`,
      };
    }

    // ❌ Verificação 7: Autorização especial
    if (
      vehicle.temAutorizacaoEspecial &&
      vehicle.validadeAutorizacaoEspecial &&
      target > new Date(vehicle.validadeAutorizacaoEspecial)
    ) {
      return {
        canSchedule: false,
        reason: `Não é possível agendar após ${new Date(
          vehicle.validadeAutorizacaoEspecial,
        ).toLocaleDateString("pt-PT")} (autorização especial)`,
      };
    }

    // ❌ Verificação 8: Próxima manutenção por data (para máquinas)
    if (
      "proximaManutencaoData" in vehicle &&
      vehicle.proximaManutencaoData
    ) {
      const manutencaoDate = new Date(
        vehicle.proximaManutencaoData,
      );
      manutencaoDate.setHours(0, 0, 0, 0);
      if (target > manutencaoDate) {
        return {
          canSchedule: false,
          reason: `Não é possível agendar após ${manutencaoDate.toLocaleDateString(
            "pt-PT",
          )} (próxima manutenção)`,
        };
      }
    }
  } else {
    const equipment = item as Equipment;

    if (equipment.proximaManutencao) {
      const manutencaoDate = new Date(
        equipment.proximaManutencao,
      );
      manutencaoDate.setHours(0, 0, 0, 0);
      if (target > manutencaoDate) {
        return {
          canSchedule: false,
          reason: `Não é possível agendar após ${manutencaoDate.toLocaleDateString(
            "pt-PT",
          )} (próxima manutenção)`,
        };
      }
    }
  }

  return { canSchedule: true };
};