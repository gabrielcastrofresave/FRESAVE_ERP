export type UserRole =
   | "administrador"
  | "escritorio"
  | "projeto"
  | "chefe_producao"
  | "producao";

export interface User {
  id: string;
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  numero: string;
  pin: string;
  role: UserRole;
  ativo: boolean;
  dataCriacao: string;
}


  //  SEGURO
  seguradora: string;
  nºApolice: string;


export interface Vehicle {
  id: string;
  matricula: string;
  modelo: string;
  marca: string;
  ano: number;
  kmAtual: number;
  proximaManutencaoKm: number;
  horasAtual?: number;
  proximaManutencaoHoras?: number;
  dataProximaManutencao?: string;
  status: "disponivel" | "em_uso" | "manutencao" | "avaria";
  dataInspecao: string;
  dataSeguro: string;
  emAvaria?: boolean;
  motivoAvaria?: string;
  aprovisionamento: string;
  responsavelOperacional: string;
  centroCusto: string;
  nºInternoElectrominho: string;
  tipo: string;
  nºLugares: number;
  nºQuadro: string;
  dataMatricula: string;

  // ✅ NOVOS CAMPOS - SEGURO
  seguradora: string;
  nºApolice: string;

  // ✅ NOVOS CAMPOS - GPS E VIA VERDE
  temGPS: boolean;
  identificadorViaVerde: string;

  // ✅ NOVOS CAMPOS - GRUA
  temGrua: boolean;
  gruaId?: string; // referência para tabela gruas
}

// ✅ NOVAS INTERFACES
export interface Grua {
  id: string;
  truckId?: string;
  vehicleId?: string;
  anoConstrucao: number;
  nºSerie: string;
  dataInspecao: string;
  inspecionarGruaEm: string;
  inspecaoGruaNº: string;
  status: "disponivel" | "em_uso" | "manutencao" | "avaria";
}

export interface Tacografo {
  id: string;
  camioId: string;
  dataAferacao: string;
  aferirEm: string;
  especificacoes: string;
}
export interface Machine {
  id: string;
  nome: string;
  tipo: string;
  marca: string;
  modelo: string;
  ano: number;
  numeroSerie?: string;
  kmAtual?: number;
  proximaManutencaoKm?: number;
  horasAtual?: number;
  proximaManutencaoHoras?: number;
  dataProximaManutencao?: string;
  dataInspecao: string;
  dataSeguro: string;
  status: "disponivel" | "em_uso" | "manutencao" | "avaria";
  emAvaria?: boolean;
  motivoAvaria?: string;
  responsavel?: string;
}

export interface Equipment {
  id: string;
  nome: string;
  tipo: string;
  marca: string;
  dataAquisicao: string;
  proximaManutencao: string;
  status: "disponivel" | "em_uso" | "manutencao" | "avaria";
}

export interface Maintenance {
  id: string;
  tipo: "camiao" | "equipamento";
  itemId: string;
  itemNome: string;
  descricao: string;
  data: string;
  kmRealizacao?: number;
  custo: number;
  realizado: boolean;
  mecanico?: string;
}

export interface EquipmentSchedule {
  id: string;
  equipment_id: string;
  user_id: string;
  data_inicio: string;
  data_fim: string | null;
  indefinido: boolean;
  notas: string;
  destinatario: string; // ✅ Adicione esta linha
  status: "ativo" | "concluido";
  created_at: string;
}
export interface Ticket {
  id: string;
  titulo: string;
  descricao: string;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  status: "aberto" | "em_progresso" | "resolvido" | "fechado";
  categoria:
    | "camiao"
    | "viatura"
    | "maquina"
    | "equipamento"
    | "outro";
  criadoPor: string;
  criadoEm: string;
  atribuidoA?: string;
  resposta?: string;
  respondido_por?: string;
  respondido_em?: string;
}

export interface CalendarEvent {
  id: string;
  titulo: string;
  data: string;
  hora: string;
  itemId: string;
  utilizador: string;
  local: string;
  tipo: "truck" | "vehicle" | "machine" | "equipment";
}

export interface Inspection {
  id: string;
  tipo: "camiao" | "equipamento";
  itemId: string;
  itemNome: string;
  dataInspecao: string;
  dataValidade: string;
  custo: number;
  observacoes?: string;
  realizado: boolean;
}

export interface Insurance {
  id: string;
  tipo: "camiao" | "equipamento";
  itemId: string;
  itemNome: string;
  dataContratacao: string;
  dataValidade: string;
  seguradora: string;
  apolice: string;
  custo: number;
  observacoes?: string;
  realizado: boolean;
}

export interface Notification {
  id: string;
  tipo: "aviso" | "erro" | "sucesso" | "info";
  titulo: string;
  mensagem: string;
  timestamp: string;
  lida: boolean;
  acao?: {
    label: string;
    callback: () => void;
  };
}

export interface Team {
  id: string;
  nome: string;
  descricao?: string;
  criado_em: string; // Nome exato da tua coluna na BD
  team_members?: {
    user_id: string;
    users: {
      nome: string;
    };
  }[];
}
export interface StockItem {
  id: string;
  nome: string;
  identificacao?: string; // <-- ADICIONA ESTA LINHA
  quantidade: number;
  data_aquisicao: string;
  created_at?: string;
}
export interface StockMovement {
  id: string;
  item_id: string;
  user_id: string;
  veiculo_id?: string;
  tipo: "levantamento" | "devolucao";
  quantidade: number;
  data: string;
  item_nome?: string;
  user_nome?: string;
  veiculo_matricula?: string;
}