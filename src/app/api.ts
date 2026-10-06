// src/app/api.ts (COMPLETO)
import { createClient } from "@supabase/supabase-js";
import {
  projectId,
  publicAnonKey,
} from "../../utils/supabase/info";
const WINTOUCH_BASE_URL =
  "https://o-teu-servidor-wintouch.com/api/v1";
const WINTOUCH_ENTERPRISE = "O-TEU-ID-DE-EMPRESA";

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(
  supabaseUrl,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true, // ✅ Obrigatório para ler o link do email
    },
  },
);

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem("authToken", token);
  } else {
    localStorage.removeItem("authToken");
  }
}

export function getAuthToken() {
  if (!authToken) {
    authToken = localStorage.getItem("authToken");
  }
  return authToken;
}

export const documentosEntregaAPI = {
  getAll: async () => [],
  upload: async () => null,
  delete: async () => true,
};
// Auth API - Completo com Supabase Auth
export const authAPI = {
  signup: async (data: {
    email: string;
    senha: string;
    nome: string;
    numero: string;
    role: string;
  }) => {
    const { data: user, error } = await supabase
      .from("users")
      .insert([
        {
          nome: data.nome,
          email: data.email || null,
          numero: data.numero,
          senha: data.senha,
          role: data.role,
          ativo: true,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { user };
  },

  // Login por número OU email + senha
  login: async (data: {
    identifier: string;
    senha: string;
  }) => {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .or(
        `numero.eq.${data.identifier},email.eq.${data.identifier}`,
      )
      .eq("senha", data.senha)
      .maybeSingle();

    if (error || !user)
      throw new Error("Credenciais inválidas");
    if (!user.ativo) throw new Error("Utilizador inativo");

    return { access_token: user.id, user };
  },

  logout: async () => {
    setAuthToken(null);
  },

  updateUser: async (
    userId: string,
    data: {
      nome?: string;
      numero?: string;
      role?: string;
      ativo?: boolean;
    },
  ) => {
    const { error } = await supabase
      .from("users")
      .update(data)
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return true;
  },

  deleteUser: async (userId: string) => {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return true;
  },
};

// Users API
export const usersAPI = {
  async updatePassword(userId: string, newPassword: string) {
    const { data, error } =
      await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
    if (error) throw error;
    return data;
  },

  getAll: async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*");
    if (error) throw error;
    return { users: data || [] };
  },

  update: async (id: string, data: any) => {
    const { error } = await supabase
      .from("users")
      .update(data)
      .eq("id", id);
    if (error) throw error;
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

//Vehicles API
export const vehiclesAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    const vehicles = (data || []).map((veh: any) => ({
      id: veh.id,
      matricula: veh.matricula,
      marca: veh.marca,
      modelo: veh.modelo,
      ano: veh.ano,
      status: veh.status,
      seguradora: veh.seguradora,
      dataSeguro: veh.data_seguro,
      dataInspecao: veh.data_inspecao,
      especificacoes: veh.especificacoes,
    }));
    return { vehicles };
  },

  create: async (data: any) => {
    const payload = {
      matricula: data.matricula,
      marca: data.marca,
      modelo: data.modelo,
      ano: data.ano,
      status: data.status || "disponivel",
      seguradora: data.seguradora,
      data_seguro: data.dataSeguro,
      data_inspecao: data.dataInspecao,
      especificacoes: data.especificacoes,
    };

    const { error } = await supabase
      .from("vehicles")
      .insert([payload]);
    if (error) throw error;
  },

  update: async (id: string, vehicle: Partial<any>) => {
    const payload: any = {};

    if (vehicle.matricula !== undefined)
      payload.matricula = vehicle.matricula;
    if (vehicle.marca !== undefined)
      payload.marca = vehicle.marca;
    if (vehicle.modelo !== undefined)
      payload.modelo = vehicle.modelo;
    if (vehicle.ano !== undefined) payload.ano = vehicle.ano;
    if (vehicle.status !== undefined)
      payload.status = vehicle.status;
    if (vehicle.seguradora !== undefined)
      payload.seguradora = vehicle.seguradora;
    if (vehicle.dataSeguro !== undefined)
      payload.data_seguro = vehicle.dataSeguro;
    if (vehicle.dataInspecao !== undefined)
      payload.data_inspecao = vehicle.dataInspecao;
    if (vehicle.especificacoes !== undefined)
      payload.especificacoes = vehicle.especificacoes;

    if (Object.keys(payload).length === 0) return;

    const { error } = await supabase
      .from("vehicles")
      .update(payload)
      .eq("id", id);

    if (error) throw error;
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// Equipment API
export const equipmentAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from("equipment")
      .select("*");
    if (error) throw error;
    const equipment = (data || []).map((item: any) => ({
      id: item.id,
      identificacao: item.identificacao || "",
      nome: item.nome,
      tipo: item.tipo,
      marca: item.marca,
      numeroSerie: item.numero_serie || "",
      categoria: item.categoria || "",
      status: item.status,
      observacoes: item.observacoes || "",
    }));
    return { equipment };
  },

  create: async (data: any) => {
    const payload = {
      identificacao: data.identificacao,
      nome: data.nome,
      tipo: data.tipo,
      marca: data.marca,
      categoria: data.categoria,
      numero_serie: data.numeroSerie,
      observacoes: data.observacoes,
      status: data.status || "disponivel",
    };
    const { error } = await supabase
      .from("equipment")
      .insert([payload]);
    if (error) throw error;
  },

  update: async (id: string, data: any) => {
    const payload: any = {};
    if (data.identificacao !== undefined)
      payload.identificacao = data.identificacao;
    if (data.nome) payload.nome = data.nome;
    if (data.tipo) payload.tipo = data.tipo;
    if (data.marca) payload.marca = data.marca;
    if (data.categoria) payload.categoria = data.categoria;
    if (data.numeroSerie !== undefined)
      payload.numero_serie = data.numeroSerie;
    if (data.observacoes !== undefined)
      payload.observacoes = data.observacoes;
    if (data.status) payload.status = data.status;

    const { error } = await supabase
      .from("equipment")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from("equipment")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
// Calendar Events API
export const calendarAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*");
    if (error) throw error;

    const events = (data || []).map((event: any) => ({
      id: event.id,
      titulo: event.titulo,
      data: event.data,
      hora: event.hora,
      itemId: event.recurso_id,
      utilizador: event.utilizador,
      local: event.local,
      tipo: event.tipo,
    }));

    return { events };
  },

  create: async (data: any) => {
    const payload = {
      id: `event-${Date.now()}`,
      titulo: data.titulo,
      data: data.data,
      hora: data.hora,
      recurso_id: data.itemId,
      utilizador: data.utilizador,
      local: data.local,
      tipo: data.tipo || "event",
    };
    const { error } = await supabase
      .from("calendar_events")
      .insert([payload]);
    if (error) throw error;
  },

  update: async (id: string, data: any) => {
    const payload: any = {};
    if (data.titulo) payload.titulo = data.titulo;
    if (data.data) payload.data = data.data;
    if (data.hora) payload.hora = data.hora;
    if (data.itemId) payload.recurso_id = data.itemId;
    if (data.utilizador) payload.utilizador = data.utilizador;
    if (data.local) payload.local = data.local;
    if (data.tipo) payload.tipo = data.tipo;

    const { error } = await supabase
      .from("calendar_events")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// Equipment Schedules API
export const equipmentSchedulesAPI = {
  async create(data: any) {
    // 🔥 DEBUG: Ver o que chega realmente à API
    console.log(
      "🔥 API create recebeu:",
      JSON.stringify(data, null, 2),
    );

    // ✅ CORREÇÃO: Aceitar equipmentId (React) OU equipment_id (BD)
    const equipmentId = data.equipmentId || data.equipment_id;
    const userId = data.userId || data.user_id;
    const dataInicio = data.dataInicio || data.data_inicio;
    const dataFim = data.dataFim || data.data_fim;

    // Validação usando as variáveis resolvidas
    if (!equipmentId) {
      console.error(
        "❌ Falha: ID do equipamento não encontrado nos dados:",
        data,
      );
      throw new Error("equipmentId é obrigatório");
    }
    if (!userId) {
      throw new Error("userId é obrigatório");
    }
    if (!dataInicio) {
      throw new Error("dataInicio é obrigatório");
    }

    const mappedData = {
      equipment_id: equipmentId, // Usa a variável resolvida
      user_id: userId,
      data_inicio: dataInicio,
      data_fim: data.indefinido ? null : dataFim,
      indefinido: Boolean(data.indefinido),
      notas: data.notas || null,
      destinatario: data.destinatario || null,
      status: data.status || "ativo",
    };

    console.log(
      "📤 Enviando equipment schedule para BD:",
      JSON.stringify(mappedData, null, 2),
    );

    const { data: result, error } = await supabase
      .from("equipment_schedule")
      .insert([mappedData])
      .select();

    if (error) {
      console.error(
        "❌ Error adding equipment schedule:",
        JSON.stringify(error, null, 2),
      );
      throw error;
    }

    console.log("✅ Equipment schedule criado:", result);
    return result;
  },

  async update(id: string, data: any) {
    const mappedData: any = {};

    if (data.userId !== undefined)
      mappedData.user_id = data.userId;
    if (data.user_id !== undefined)
      mappedData.user_id = data.user_id;

    if (data.dataInicio !== undefined)
      mappedData.data_inicio = data.dataInicio;
    if (data.data_inicio !== undefined)
      mappedData.data_inicio = data.data_inicio;

    if (data.dataFim !== undefined)
      mappedData.data_fim = data.dataFim;
    if (data.data_fim !== undefined)
      mappedData.data_fim = data.data_fim; // ✅ ADICIONA ISTO

    if (data.indefinido !== undefined)
      mappedData.indefinido = data.indefinido;
    if (data.notas !== undefined) mappedData.notas = data.notas;
    if (data.destinatario !== undefined)
      mappedData.destinatario = data.destinatario;
    if (data.status !== undefined)
      mappedData.status = data.status;

    console.log(
      "📤 Atualizando equipment schedule:",
      JSON.stringify(mappedData, null, 2),
    );

    const { data: result, error } = await supabase
      .from("equipment_schedule")
      .update(mappedData)
      .eq("id", id)
      .select();

    if (error) {
      console.error(
        "❌ Error updating equipment schedule:",
        JSON.stringify(error, null, 2),
      );
      throw error;
    }

    console.log("✅ Equipment schedule atualizado:", result);
    return result;
  },

  async getAll() {
    try {
      console.log("📥 Buscando equipment schedules...");

      const { data, error } = await supabase
        .from("equipment_schedule")
        .select("*");

      if (error) {
        console.error(
          "❌ Error fetching equipment schedules:",
          error,
        );
        throw error;
      }

      console.log(
        "📥 Dados recebidos:",
        JSON.stringify(data, null, 2),
      );

      const schedules = (data || []).map((schedule: any) => ({
        id: schedule.id,
        equipment_id: schedule.equipment_id,
        user_id: schedule.user_id,
        data_inicio: schedule.data_inicio,
        data_fim: schedule.data_fim,
        indefinido: schedule.indefinido,
        notas: schedule.notas,
        destinatario: schedule.destinatario,
        status: schedule.status,
      }));

      console.log(
        `✅ ${schedules.length} equipment schedules carregados`,
      );
      return schedules;
    } catch (error) {
      console.error(
        "❌ Error fetching equipment schedules:",
        error,
      );
      return [];
    }
  },

  async delete(id: string) {
    try {
      console.log("📤 Deletando equipment schedule:", id);

      const { error } = await supabase
        .from("equipment_schedule")
        .delete()
        .eq("id", id);

      if (error) {
        console.error(
          "❌ Error deleting equipment schedule:",
          error,
        );
        throw error;
      }

      console.log("✅ Equipment schedule deletado com sucesso");
    } catch (error) {
      console.error(
        "❌ Error deleting equipment schedule:",
        error,
      );
      throw error;
    }
  },
};

// Inspections API
export const inspectionsAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from("inspections")
      .select("*");
    if (error) throw error;

    const inspections = (data || []).map((insp: any) => ({
      id: insp.id,
      truckId: insp.truck_id,
      truckName: insp.truck_name,
      tipoInspecao: insp.tipo_inspecao,
      dataRealizacao: insp.data_realizacao,
      proximaInspecao: insp.proxima_inspecao,
      resultado: insp.resultado,
      observacoes: insp.observacoes,
      realizado: insp.realizado,
    }));
    return { inspections };
  },

  create: async (data: any) => {
    const payload = {
      id: `inspection-${Date.now()}`,
      truck_id: data.truckId,
      truck_name: data.truckName,
      tipo_inspecao: data.tipoInspecao,
      data_realizacao: data.dataRealizacao,
      proxima_inspecao: data.proximaInspecao,
      resultado: data.resultado,
      observacoes: data.observacoes || "",
      realizado: data.realizado || false,
    };
    const { error } = await supabase
      .from("inspections")
      .insert([payload]);
    if (error) throw error;
  },

  update: async (id: string, data: any) => {
    const payload: any = {};
    if (data.tipoInspecao)
      payload.tipo_inspecao = data.tipoInspecao;
    if (data.dataRealizacao)
      payload.data_realizacao = data.dataRealizacao;
    if (data.proximaInspecao)
      payload.proxima_inspecao = data.proximaInspecao;
    if (data.resultado) payload.resultado = data.resultado;
    if (data.observacoes !== undefined)
      payload.observacoes = data.observacoes;
    if (data.realizado !== undefined)
      payload.realizado = data.realizado;

    const { error } = await supabase
      .from("inspections")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from("inspections")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// Insurances API
export const insurancesAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from("insurances")
      .select("*");
    if (error) throw error;

    const insurances = (data || []).map((ins: any) => ({
      id: ins.id,
      truckId: ins.truck_id,
      truckName: ins.truck_name,
      segurado: ins.segurado,
      numeroApolice: ins.numero_apolice,
      dataInicio: ins.data_inicio,
      dataFim: ins.data_fim,
      preco: ins.preco,
      descricao: ins.descricao,
    }));
    return { insurances };
  },

  create: async (data: any) => {
    const payload = {
      id: `insurance-${Date.now()}`,
      truck_id: data.truckId,
      truck_name: data.truckName,
      segurado: data.segurado,
      numero_apolice: data.numeroApolice,
      data_inicio: data.dataInicio,
      data_fim: data.dataFim,
      preco: data.preco,
      descricao: data.descricao || "",
    };
    const { error } = await supabase
      .from("insurances")
      .insert([payload]);
    if (error) throw error;
  },

  update: async (id: string, data: any) => {
    const payload: any = {};
    if (data.segurado) payload.segurado = data.segurado;
    if (data.numeroApolice)
      payload.numero_apolice = data.numeroApolice;
    if (data.dataInicio) payload.data_inicio = data.dataInicio;
    if (data.dataFim) payload.data_fim = data.dataFim;
    if (data.preco !== undefined) payload.preco = data.preco;
    if (data.descricao !== undefined)
      payload.descricao = data.descricao;

    const { error } = await supabase
      .from("insurances")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from("insurances")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// --- FUNÇÕES DO CALENDÁRIO DE PRODUÇÃO ---

export const getProductionTasks = async (userId: string) => {
  const { data, error } = await supabase
    .from("production_tasks")
    .select(`*, production_task_images (*)`)
    .eq("user_id", userId);
  if (error) throw error;
  return data;
};

export const addProductionTask = async (taskData: any) => {
  const { data, error } = await supabase
    .from("production_tasks")
    .insert([taskData])
    .select("id")
    .single();
  if (error) throw error;
  return data;
};

export const updateProductionTask = async (
  taskId: string,
  taskData: any,
) => {
  const { error } = await supabase
    .from("production_tasks")
    .update(taskData)
    .eq("id", taskId);
  if (error) throw error;
};

export const deleteProductionTask = async (taskId: string) => {
  // 1. Primeiro, procuramos se existem imagens associadas a esta tarefa
  const { data: images } = await supabase
    .from("production_task_images")
    .select("imagem_url")
    .eq("task_id", taskId);

  // 2. Se existirem, vamos apagá-las do bucket físico
  if (images && images.length > 0) {
    // O Supabase precisa do caminho exato ('production-tasks/nome-do-ficheiro.jpg')
    const filePaths = images
      .map((img) => {
        const parts = img.imagem_url.split(
          "/production-attachments/",
        );
        return parts.length > 1 ? parts[1] : null;
      })
      .filter(Boolean) as string[];

    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("production-attachments")
        .remove(filePaths);

      if (storageError)
        console.error(
          "Erro ao apagar imagens do bucket:",
          storageError,
        );
    }
  }

  // 3. Por fim, apagamos a tarefa da base de dados (o CASCADE trata de apagar os registos da tabela de imagens)
  const { error } = await supabase
    .from("production_tasks")
    .delete()
    .eq("id", taskId);

  if (error) throw error;
};

export const uploadProductionTaskImage = async (
  taskId: string,
  file: File,
) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${taskId}-${Date.now()}.${fileExt}`;
  const filePath = `production-tasks/${fileName}`;

  // ✅ Alterado de "production-images" para "production-attachments"
  const { error: uploadError } = await supabase.storage
    .from("production-attachments")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage
    .from("production-attachments")
    .getPublicUrl(filePath);

  const { error: dbError } = await supabase
    .from("production_task_images")
    .insert([
      {
        task_id: taskId,
        imagem_url: publicData.publicUrl,
        descricao: file.name,
      },
    ]);

  if (dbError) throw dbError;
};

// ==================== STOCK E MOVIMENTOS API ====================
export const stockAPI = {
  // Retorna { data: StockItem[], total: number }
  // Usa range() do Supabase para paginação server-side
  getItems: async (params?: {
    page?: number;
    limit?: number;
  }) => {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 1000;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from("stock_items")
      .select("*", { count: "exact" })
      .order("nome", { ascending: true })
      .range(from, to);

    if (error) throw error;
    return { data: data ?? [], total: count ?? 0 };
  },

  addItem: async (item: any) => {
    const { data, error } = await supabase
      .from("stock_items")
      .insert([
        {
          nome: item.nome,
          identificacao: item.identificacao,
          referencia_contabilidade:
            item.referencia_contabilidade || null,
          descricao: item.descricao || null,
          preco_unitario: item.preco_unitario || null,
          estoque_minimo: item.estoque_minimo || null,
          quantidade: item.quantidade,
          data_aquisicao: item.data_aquisicao,
          unidade_medida: item.unidade_medida || "un",
        },
      ])
      .select();

    if (error) throw error;
    return { data };
  },

  updateItem: async (id: string, item: any) => {
    const updateData: any = { ...item };
    // valor_inventario é calculado pela BD — nunca enviar
    delete updateData.valor_inventario;
    delete updateData.tag;

    const { data, error } = await supabase
      .from("stock_items")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data;
  },

  deleteItem: async (id: string) => {
    const { error } = await supabase
      .from("stock_items")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  },

  getMovements: async () => {
    const { data, error } = await supabase
      .from("stock_movements")
      .select(
        `
      *,
      stock_items ( nome ),
      users ( nome )
    `,
      )
      .order("data", { ascending: false });
    if (error) throw error;
    return { data: data || [] };
  },

  addMovement: async (movement: any) => {
    const { data, error } = await supabase
      .from("stock_movements")
      .insert([movement])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteMovement: async (id: string) => {
    const { error } = await supabase
      .from("stock_movements")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  },
};

// ==================== JOBS API ====================
// Substitui este bloco inteiro no src/app/api.ts
export const JOB_CHECKLIST_ITEMS = [
  { key: "pre_projeto", label: "Pré-projeto" },
  { key: "projeto", label: "Projeto" },
  { key: "maquinagem", label: "Maquinagem" },
  { key: "montagem", label: "Montagem" },
  { key: "pintura", label: "Pintura" },
  {
    key: "eletricidade_automacao",
    label: "Eletricidade/Automação",
  },
  { key: "testagem", label: "Testagem" },
] as const;

export const jobsAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        *,
        job_assignees ( user_id, users ( nome ) ),
        job_checklist_items ( id, item_key, label, checked, checked_at )
      `,
      )
      .order("due_date", { ascending: true });
    if (error) throw error;

    return (data || []).map((job: any) => ({
      ...job,
      assignees: (job.job_assignees || []).map((ja: any) => ({
        id: ja.user_id,
        nome: ja.users?.nome,
      })),
      // linhas cruas; a ordem e os nomes vêm do JOB_CHECKLIST_ITEMS no frontend
      checklist: job.job_checklist_items || [],
    }));
  },

  create: async (job: {
    reference?: string;
    title: string;
    department?: string;
    assigneeIds?: string[];
    description?: string;
    dueDate: string;
    maxHours?: number | null;
    nonStandard?: boolean;
  }) => {
    const { data, error } = await supabase
      .from("jobs")
      .insert([
        {
          reference: job.reference || `JOB-${Date.now()}`,
          title: job.title,
          department: job.department || null,
          non_standard: job.nonStandard ?? false,
          description: job.description || null,
          due_date: job.dueDate,
          max_hours: job.maxHours ?? null,
          status: "em_curso",
        },
      ])
      .select()
      .single();
    if (error) throw error;

    if (job.assigneeIds && job.assigneeIds.length > 0) {
      const payload = job.assigneeIds.map((userId) => ({
        job_id: data.id,
        user_id: userId,
      }));
      const { error: assigneesError } = await supabase
        .from("job_assignees")
        .insert(payload);
      if (assigneesError) throw assigneesError;
    }

    const checklistPayload = JOB_CHECKLIST_ITEMS.map(
      (item) => ({
        job_id: data.id,
        item_key: item.key,
        label: item.label,
        checked: false,
      }),
    );
    const { error: checklistError } = await supabase
      .from("job_checklist_items")
      .insert(checklistPayload);
    if (checklistError) throw checklistError;

    return data;
  },

  // Edição de um trabalho já existente (campos + reatribuição de funcionários)
  update: async (
    id: string,
    job: {
      title?: string;
      department?: string;
      description?: string;
      dueDate?: string;
      maxHours?: number | null;
      assigneeIds?: string[];
      nonStandard?: boolean;
    },
  ) => {
    const payload: any = {};
    if (job.title !== undefined) payload.title = job.title;
    if (job.department !== undefined)
      payload.department = job.department;
    if (job.description !== undefined)
      payload.description = job.description;
    if (job.dueDate !== undefined)
      payload.due_date = job.dueDate;
    if (job.maxHours !== undefined)
      payload.max_hours = job.maxHours;
    if (job.nonStandard !== undefined)
      payload.non_standard = job.nonStandard;

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase
        .from("jobs")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    }

    if (job.assigneeIds !== undefined) {
      const { error: delError } = await supabase
        .from("job_assignees")
        .delete()
        .eq("job_id", id);
      if (delError) throw delError;

      if (job.assigneeIds.length > 0) {
        const insertPayload = job.assigneeIds.map((userId) => ({
          job_id: id,
          user_id: userId,
        }));
        const { error: insError } = await supabase
          .from("job_assignees")
          .insert(insertPayload);
        if (insError) throw insError;
      }
    }
  },

  deleteJob: async (jobId: string) => {
    const { error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", jobId);
    if (error) throw error;
    return { success: true };
  },

  // Marca/desmarca uma fase, gravando quando e por quem
  toggleStage: async (
    jobId: string,
    stageKey: string,
    checked: boolean,
    userId?: string,
  ) => {
    const stage = JOB_CHECKLIST_ITEMS.find(
      (s) => s.key === stageKey,
    );
    if (!stage)
      throw new Error(`Fase desconhecida: ${stageKey}`);

    const { error } = await supabase
      .from("job_checklist_items")
      .upsert(
        {
          job_id: jobId,
          item_key: stageKey,
          label: stage.label,
          checked,
          checked_at: checked ? new Date().toISOString() : null,
          checked_by: checked ? (userId ?? null) : null,
        },
        { onConflict: "job_id,item_key" },
      );
    if (error) throw error;
  },

  complete: async (
    id: string,
    report: {
      wentWell: string;
      wentWrong: string;
      conclusion: string;
      delayReason?: string;
    },
  ) => {
    // Confirma que todas as fases estão marcadas antes de concluir
    const { data: rows, error: rowsError } = await supabase
      .from("job_checklist_items")
      .select("item_key, checked")
      .eq("job_id", id);
    if (rowsError) throw rowsError;

    const done = new Set(
      (rows ?? [])
        .filter((r: any) => r.checked)
        .map((r: any) => r.item_key),
    );
    if (!JOB_CHECKLIST_ITEMS.every((s) => done.has(s.key))) {
      throw new Error("Há fases por concluir.");
    }

    const { error } = await supabase
      .from("jobs")
      .update({
        status: "concluido",
        completed_at: new Date().toISOString(),
        report_went_well: report.wentWell,
        report_went_wrong: report.wentWrong,
        report_conclusion: report.conclusion,
        report_delay_reason: report.delayReason || null,
      })
      .eq("id", id);
    if (error) throw error;
  },

  delete: async (id: string) => {
    const { error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// ==================== PRODUCTION TASKS API ====================
// getAll() devolve uma linha por ATRIBUIÇÃO (assignee), já com os dados
// do registo "pai" juntos — assim o resto da app continua a trabalhar
// com uma lista "achatada", como antes.
export const productionTasksAPI = {
  getAll: async () => {
    const { data, error } = await supabase
      .from("production_task_assignees")
      .select(
        `
        *,
        users ( nome ),
        production_tasks (
          id, tipo, job_id, titulo, cliente_obra, local, data, created_by,
          jobs ( title )
        )
      `,
      )
      .order("id", { ascending: false });
    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      task_id: row.task_id,
      user_id: row.user_id,
      hora_inicio: row.hora_inicio,
      hora_fim: row.hora_fim,
      status: row.status,
      users: row.users,
      tipo: row.production_tasks?.tipo,
      job_id: row.production_tasks?.job_id,
      titulo:
        row.production_tasks?.tipo === "producao"
          ? row.production_tasks?.jobs?.title
          : row.production_tasks?.titulo,
      cliente_obra: row.production_tasks?.cliente_obra,
      local: row.production_tasks?.local,
      data: row.production_tasks?.data,
      created_by: row.production_tasks?.created_by,
    }));
  },

  // Cria o registo "pai" + uma linha de atribuição por cada utilizador selecionado
  create: async (task: {
    tipo: "producao" | "manutencao";
    jobId?: string | null;
    titulo?: string;
    clienteObra?: string;
    local?: string;
    data: string;
    createdBy: string;
    assigneeIds: string[];
  }) => {
    const { data: created, error } = await supabase
      .from("production_tasks")
      .insert([
        {
          tipo: task.tipo,
          job_id:
            task.tipo === "producao"
              ? task.jobId || null
              : null,
          titulo:
            task.tipo === "manutencao"
              ? task.titulo || null
              : null,
          cliente_obra: task.clienteObra || null,
          local: task.local || null,
          data: task.data,
          created_by: task.createdBy,
        },
      ])
      .select()
      .single();
    if (error) throw error;

    if (task.assigneeIds.length > 0) {
      const payload = task.assigneeIds.map((userId) => ({
        task_id: created.id,
        user_id: userId,
        status: "pendente",
      }));
      const { error: assigneesError } = await supabase
        .from("production_task_assignees")
        .insert(payload);
      if (assigneesError) throw assigneesError;
    }
    return created;
  },

  // Atualiza SÓ a atribuição de um utilizador (as suas horas/status)
  updateAssignee: async (
    assigneeId: string,
    data: {
      horaInicio?: string;
      horaFim?: string;
      status?: string;
    },
  ) => {
    const payload: any = {};
    if (data.horaInicio !== undefined)
      payload.hora_inicio = data.horaInicio;
    if (data.horaFim !== undefined)
      payload.hora_fim = data.horaFim;
    if (data.status !== undefined) payload.status = data.status;

    const { error } = await supabase
      .from("production_task_assignees")
      .update(payload)
      .eq("id", assigneeId);
    if (error) throw error;
  },

  deleteAssignee: async (assigneeId: string) => {
    const { error } = await supabase
      .from("production_task_assignees")
      .delete()
      .eq("id", assigneeId);
    if (error) throw error;
  },

  deleteTask: async (taskId: string) => {
    // apaga o registo "pai" — as atribuições vão atrás por causa do "on delete cascade"
    const { error } = await supabase
      .from("production_tasks")
      .delete()
      .eq("id", taskId);
    if (error) throw error;
  },
};

// Calcula horas consumidas por um trabalho: soma de horas de todas as
// atribuições ligadas a ele (cada pessoa conta as suas próprias horas).
export function calcJobHoursConsumed(
  job: { id: string },
  allAssignees: any[],
): number {
  return allAssignees
    .filter(
      (t: any) =>
        t.job_id === job.id && t.hora_inicio && t.hora_fim,
    )
    .reduce((sum: number, t: any) => {
      const [h1, m1] = t.hora_inicio.split(":").map(Number);
      const [h2, m2] = t.hora_fim.split(":").map(Number);
      const hours = h2 + m2 / 60 - (h1 + m1 / 60);
      return sum + Math.max(0, hours);
    }, 0);
}

// ==================== CONTABILIDADE ====================
export const accountingAPI = {
  // Custo de peças: soma de levantamentos de stock atribuídos a este job
  getPartsForJob: async (jobId: string) => {
    const { data, error } = await supabase
      .from("stock_movements")
      .select("*, stock_items ( nome, preco_unitario )")
      .eq("job_id", jobId)
      .eq("tipo", "levantamento");
    if (error) throw error;
    return (data || []).map((m: any) => ({
      id: m.id,
      item_nome: m.stock_items?.nome || "Artigo removido",
      quantidade: m.quantidade,
      preco_unitario: m.stock_items?.preco_unitario || 0,
      subtotal:
        (m.stock_items?.preco_unitario || 0) * m.quantidade,
      data: m.data,
    }));
  },

  // Linhas de horas: atribuições de produção ligadas a este job + a taxa gravada (se existir)
  getHourLinesForJob: async (
    jobId: string,
    allAssigneeRows: any[],
  ) => {
    const rows = allAssigneeRows.filter(
      (r: any) =>
        r.job_id === jobId && r.hora_inicio && r.hora_fim,
    );
    const ids = rows.map((r: any) => r.id);
    let rates: Record<string, number> = {};
    if (ids.length > 0) {
      const { data, error } = await supabase
        .from("job_hour_rates")
        .select("*")
        .in("task_assignee_id", ids);
      if (error) throw error;
      rates = Object.fromEntries(
        (data || []).map((r: any) => [
          r.task_assignee_id,
          r.rate_per_hour,
        ]),
      );
    }
    return rows.map((r: any) => {
      const [h1, m1] = r.hora_inicio.split(":").map(Number);
      const [h2, m2] = r.hora_fim.split(":").map(Number);
      const hours = Math.max(0, h2 + m2 / 60 - (h1 + m1 / 60));
      const rate = rates[r.id] || 0;
      return {
        id: r.id,
        user_nome: r.users?.nome || "-",
        data: r.data,
        hours,
        rate,
        subtotal: hours * rate,
      };
    });
  },

  saveHourRate: async (
    taskAssigneeId: string,
    ratePerHour: number,
  ) => {
    const { error } = await supabase
      .from("job_hour_rates")
      .upsert(
        {
          task_assignee_id: taskAssigneeId,
          rate_per_hour: ratePerHour,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "task_assignee_id" },
      );
    if (error) throw error;
  },

  getExtraCosts: async (jobId: string) => {
    const { data, error } = await supabase
      .from("job_extra_costs")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  addExtraCost: async (
    jobId: string,
    descricao: string,
    categoria: string,
    valor: number,
  ) => {
    const { error } = await supabase
      .from("job_extra_costs")
      .insert([
        {
          job_id: jobId,
          descricao,
          categoria: categoria || null,
          valor,
        },
      ]);
    if (error) throw error;
  },

  deleteExtraCost: async (id: string) => {
    const { error } = await supabase
      .from("job_extra_costs")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// Consulta pública por código de rastreio — não depende de sessão/login
export const trackingAPI = {
  getByCode: async (code: string) => {
    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        title, status, due_date, completed_at, tracking_code,
        job_checklist_items ( item_key, label, checked, checked_at )
      `,
      )
      .eq("tracking_code", code.trim().toUpperCase())
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const order = JOB_CHECKLIST_ITEMS.map((i) => i.key);
    return {
      ...data,
      checklist: (data.job_checklist_items || []).sort(
        (a: any, b: any) =>
          order.indexOf(a.item_key) - order.indexOf(b.item_key),
      ),
    };
  },
};

// Adiciona este objeto exportado
export const wintouchAPI = {
  // Ler stock real
  getStock: async (token: string) => {
    const response = await fetch(
      `${WINTOUCH_BASE_URL}/inventories`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-current-enterprise": WINTOUCH_ENTERPRISE,
          Accept: "application/json",
        },
      },
    );
    return response.json();
  },

  //------------WINTOUCH API-----------------------------------------------------------
  saveWork: async (token: string, data: any) => {
    const response = await fetch(
      `${WINTOUCH_BASE_URL}/data_import/entities`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-current-enterprise": WINTOUCH_ENTERPRISE,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([data]),
      },
    );
    return response.json();
  },
};