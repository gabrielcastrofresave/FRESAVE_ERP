import { Hono } from "npm:hono@4";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Middleware
app.use("*", cors({ origin: "*", credentials: true }));
app.use("*", logger(console.log));

// Supabase client (service role para operações administrativas)
const getSupabaseAdmin = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
};

// Supabase client (anon key para autenticação de usuário)
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );
};

// Helper para verificar autenticação
async function verifyUser(accessToken: string | null) {
  if (!accessToken) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  return user;
}

// Helper para verificar se é admin
async function verifyAdmin(accessToken: string | null) {
  const user = await verifyUser(accessToken);
  if (!user) return null;

  const userData = await kv.get(`user:${user.id}`);
  if (userData && userData.role === "admin") {
    return user;
  }

  return null;
}

// Verificar permissões
async function checkPermission(
  userId: string,
  module: string,
  action: string,
) {
  const userData = await kv.get(`user:${userId}`);
  if (!userData) return false;

  // Admin tem todas as permissões
  if (userData.role === "admin") return true;

  // Verificar permissão específica
  const permissionKey = `permission:${userData.role}:${module}`;
  const permission = await kv.get(permissionKey);

  if (!permission) {
    // Se não houver permissão definida, bloquear por padrão
    return false;
  }

  return permission[action] === true;
}

// ===== ROTAS DE AUTENTICAÇÃO =====

// Registro de novo usuário
app.post("/make-server-e60fcfb3/auth/signup", async (c) => {
  try {
    const {
      email,
      password,
      name,
      role = "camionista",
    } = await c.req.json();

    const supabase = getSupabaseAdmin();

    // Criar usuário no Supabase Auth
    const { data, error } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { name },
        // Confirma automaticamente o email (não há servidor de email configurado)
        email_confirm: true,
      });

    if (error) {
      console.error("Error creating user in signup:", error);
      return c.json({ error: error.message }, 400);
    }

    // Salvar dados do usuário no KV
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
    });

    return c.json(
      {
        user: {
          id: data.user.id,
          email,
          name,
          role,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Error in signup route:", error);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

// Get current user info
app.get("/make-server-e60fcfb3/auth/me", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userData = await kv.get(`user:${user.id}`);

    return c.json({ user: userData });
  } catch (error) {
    console.error("Error in /auth/me:", error);
    return c.json({ error: "Failed to get user info" }, 500);
  }
});

// ===== ROTAS DE USUÁRIOS (apenas admin) =====

// Listar todos os usuários
app.get("/make-server-e60fcfb3/users", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const admin = await verifyAdmin(accessToken ?? null);

    if (!admin) {
      return c.json(
        { error: "Unauthorized. Admin only." },
        403,
      );
    }

    const users = await kv.getByPrefix("user:");
    return c.json({ users });
  } catch (error) {
    console.error("Error listing users:", error);
    return c.json({ error: "Failed to list users" }, 500);
  }
});

// Criar usuário
app.post("/make-server-e60fcfb3/users", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const admin = await verifyAdmin(accessToken ?? null);

    if (!admin) {
      return c.json(
        { error: "Unauthorized. Admin only." },
        403,
      );
    }

    const { email, password, name, role } = await c.req.json();

    const supabase = getSupabaseAdmin();
    const { data, error } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { name },
        email_confirm: true,
      });

    if (error) {
      console.error("Error creating user:", error);
      return c.json({ error: error.message }, 400);
    }

    const userData = {
      id: data.user.id,
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`user:${data.user.id}`, userData);

    return c.json({ user: userData }, 201);
  } catch (error) {
    console.error("Error in create user:", error);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

// Login (signin)
app.post("/make-server-e60fcfb3/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();

    const supabase = getSupabaseClient();

    // Tentar fazer login
    let data = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Se o email/password for o admin especial, criar com role admin
    if (
      email === "gabfercas@gmail.com" &&
      password === "Giratoria-50" &&
      data.error
    ) {
      const supabaseAdmin = getSupabaseAdmin();

      const { data: createData, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          user_metadata: { name: "Admin" },
          email_confirm: true,
        });

      if (createError) {
        return c.json({ error: createError.message }, 400);
      }

      // Salvar como admin
      await kv.set(`user:${createData.user.id}`, {
        id: createData.user.id,
        email,
        name: "Admin",
        role: "admin",
        createdAt: new Date().toISOString(),
      });

      // Fazer login
      const { data: loginData } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      return c.json(
        {
          user: {
            id: createData.user.id,
            email,
            name: "Admin",
            role: "admin",
          },
          token: loginData?.session?.access_token,
        },
        201,
      );
    }

    if (data.error) {
      return c.json({ error: data.error.message }, 401);
    }

    const userData = await kv.get(`user:${data.data.user.id}`);

    // Garantir que o admin especial sempre tem role admin
    if (
      email === "gabfercas@gmail.com" &&
      password === "Giratoria-50"
    ) {
      const adminData = { ...userData, role: "admin" };
      await kv.set(`user:${data.data.user.id}`, adminData);

      return c.json({
        user: adminData,
        token: data.data.session.access_token,
      });
    }

    return c.json({
      user: userData,
      token: data.data.session.access_token,
    });
  } catch (error) {
    console.error("Error in signin:", error);
    return c.json({ error: "Failed to sign in" }, 500);
  }
});

// Atualizar usuário
app.put("/make-server-e60fcfb3/users/:id", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const admin = await verifyAdmin(accessToken ?? null);

    if (!admin) {
      return c.json(
        { error: "Unauthorized. Admin only." },
        403,
      );
    }

    const id = c.req.param("id");
    const updates = await c.req.json();

    const user = await kv.get(`user:${id}`);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const updatedUser = { ...user, ...updates, id };
    await kv.set(`user:${id}`, updatedUser);

    return c.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return c.json({ error: "Failed to update user" }, 500);
  }
});

// Deletar usuário
app.delete("/make-server-e60fcfb3/users/:id", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const admin = await verifyAdmin(accessToken ?? null);

    if (!admin) {
      return c.json(
        { error: "Unauthorized. Admin only." },
        403,
      );
    }

    const id = c.req.param("id");

    const supabase = getSupabaseAdmin();
    await supabase.auth.admin.deleteUser(id);
    await kv.del(`user:${id}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});

// ===== ROTAS DE CAMIÕES =====

// Listar camiões
app.get("/make-server-e60fcfb3/trucks", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const canView = await checkPermission(
      user.id,
      "trucks",
      "view",
    );
    if (!canView) {
      return c.json({ error: "Permission denied" }, 403);
    }

    const trucks = await kv.getByPrefix("truck:");
    return c.json({ trucks });
  } catch (error) {
    console.error("Error listing trucks:", error);
    return c.json({ error: "Failed to list trucks" }, 500);
  }
});

// Criar camião
app.post("/make-server-e60fcfb3/trucks", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const canCreate = await checkPermission(
      user.id,
      "trucks",
      "create",
    );
    if (!canCreate) {
      return c.json({ error: "Permission denied" }, 403);
    }

    const data = await c.req.json();
    const id = crypto.randomUUID();

    const truck = {
      id,
      ...data,
      currentKm: data.currentKm || 0,
      available: true,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`truck:${id}`, truck);

    return c.json({ truck }, 201);
  } catch (error) {
    console.error("Error creating truck:", error);
    return c.json({ error: "Failed to create truck" }, 500);
  }
});

// Atualizar camião
app.put("/make-server-e60fcfb3/trucks/:id", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const canEdit = await checkPermission(
      user.id,
      "trucks",
      "edit",
    );
    if (!canEdit) {
      return c.json({ error: "Permission denied" }, 403);
    }

    const id = c.req.param("id");
    const updates = await c.req.json();

    const truck = await kv.get(`truck:${id}`);
    if (!truck) {
      return c.json({ error: "Truck not found" }, 404);
    }

    const updatedTruck = { ...truck, ...updates, id };
    await kv.set(`truck:${id}`, updatedTruck);

    return c.json({ truck: updatedTruck });
  } catch (error) {
    console.error("Error updating truck:", error);
    return c.json({ error: "Failed to update truck" }, 500);
  }
});

// Deletar camião
app.delete("/make-server-e60fcfb3/trucks/:id", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const canDelete = await checkPermission(
      user.id,
      "trucks",
      "delete",
    );
    if (!canDelete) {
      return c.json({ error: "Permission denied" }, 403);
    }

    const id = c.req.param("id");
    await kv.del(`truck:${id}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting truck:", error);
    return c.json({ error: "Failed to delete truck" }, 500);
  }
});

// ===== ROTAS DE EQUIPAMENTOS =====

// Listar equipamentos
app.get("/make-server-e60fcfb3/equipment", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const canView = await checkPermission(
      user.id,
      "equipment",
      "view",
    );
    if (!canView) {
      return c.json({ error: "Permission denied" }, 403);
    }

    const equipment = await kv.getByPrefix("equipment:");
    return c.json({ equipment });
  } catch (error) {
    console.error("Error listing equipment:", error);
    return c.json({ error: "Failed to list equipment" }, 500);
  }
});

// Criar equipamento
app.post("/make-server-e60fcfb3/equipment", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const canCreate = await checkPermission(
      user.id,
      "equipment",
      "create",
    );
    if (!canCreate) {
      return c.json({ error: "Permission denied" }, 403);
    }

    const data = await c.req.json();
    const id = crypto.randomUUID();

    const equipment = {
      id,
      ...data,
      available: true,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`equipment:${id}`, equipment);

    return c.json({ equipment }, 201);
  } catch (error) {
    console.error("Error creating equipment:", error);
    return c.json({ error: "Failed to create equipment" }, 500);
  }
});

// Atualizar equipamento
app.put("/make-server-e60fcfb3/equipment/:id", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const canEdit = await checkPermission(
      user.id,
      "equipment",
      "edit",
    );
    if (!canEdit) {
      return c.json({ error: "Permission denied" }, 403);
    }

    const id = c.req.param("id");
    const updates = await c.req.json();

    const equipment = await kv.get(`equipment:${id}`);
    if (!equipment) {
      return c.json({ error: "Equipment not found" }, 404);
    }

    const updatedEquipment = { ...equipment, ...updates, id };
    await kv.set(`equipment:${id}`, updatedEquipment);

    return c.json({ equipment: updatedEquipment });
  } catch (error) {
    console.error("Error updating equipment:", error);
    return c.json({ error: "Failed to update equipment" }, 500);
  }
});

// Deletar equipamento
app.delete("/make-server-e60fcfb3/equipment/:id", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const canDelete = await checkPermission(
      user.id,
      "equipment",
      "delete",
    );
    if (!canDelete) {
      return c.json({ error: "Permission denied" }, 403);
    }

    const id = c.req.param("id");
    await kv.del(`equipment:${id}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting equipment:", error);
    return c.json({ error: "Failed to delete equipment" }, 500);
  }
});

// ===== ROTAS DE MANUTENÇÕES =====

// Listar manutenções
app.get("/make-server-e60fcfb3/maintenances", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const canView = await checkPermission(
      user.id,
      "maintenances",
      "view",
    );
    if (!canView) {
      return c.json({ error: "Permission denied" }, 403);
    }

    const maintenances = await kv.getByPrefix("maintenance:");
    return c.json({ maintenances });
  } catch (error) {
    console.error("Error listing maintenances:", error);
    return c.json(
      { error: "Failed to list maintenances" },
      500,
    );
  }
});

// Criar manutenção
app.post("/make-server-e60fcfb3/maintenances", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const canCreate = await checkPermission(
      user.id,
      "maintenances",
      "create",
    );
    if (!canCreate) {
      return c.json({ error: "Permission denied" }, 403);
    }

    const data = await c.req.json();
    const id = crypto.randomUUID();

    const maintenance = {
      id,
      ...data,
      status: data.status || "pending",
      createdAt: new Date().toISOString(),
    };

    await kv.set(`maintenance:${id}`, maintenance);

    return c.json({ maintenance }, 201);
  } catch (error) {
    console.error("Error creating maintenance:", error);
    return c.json(
      { error: "Failed to create maintenance" },
      500,
    );
  }
});

// Atualizar manutenção
app.put("/make-server-e60fcfb3/maintenances/:id", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const canEdit = await checkPermission(
      user.id,
      "maintenances",
      "edit",
    );
    if (!canEdit) {
      return c.json({ error: "Permission denied" }, 403);
    }

    const id = c.req.param("id");
    const updates = await c.req.json();

    const maintenance = await kv.get(`maintenance:${id}`);
    if (!maintenance) {
      return c.json({ error: "Maintenance not found" }, 404);
    }

    const updatedMaintenance = {
      ...maintenance,
      ...updates,
      id,
    };
    await kv.set(`maintenance:${id}`, updatedMaintenance);

    return c.json({ maintenance: updatedMaintenance });
  } catch (error) {
    console.error("Error updating maintenance:", error);
    return c.json(
      { error: "Failed to update maintenance" },
      500,
    );
  }
});

// Deletar manutenção
app.delete(
  "/make-server-e60fcfb3/maintenances/:id",
  async (c) => {
    try {
      const accessToken = c.req
        .header("Authorization")
        ?.split(" ")[1];
      const user = await verifyUser(accessToken ?? null);

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const canDelete = await checkPermission(
        user.id,
        "maintenances",
        "delete",
      );
      if (!canDelete) {
        return c.json({ error: "Permission denied" }, 403);
      }

      const id = c.req.param("id");
      await kv.del(`maintenance:${id}`);

      return c.json({ success: true });
    } catch (error) {
      console.error("Error deleting maintenance:", error);
      return c.json(
        { error: "Failed to delete maintenance" },
        500,
      );
    }
  },
);

// ===== ROTAS DE TICKETS =====

// Listar tickets
app.get("/make-server-e60fcfb3/tickets", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const tickets = await kv.getByPrefix("ticket:");
    return c.json({ tickets });
  } catch (error) {
    console.error("Error listing tickets:", error);
    return c.json({ error: "Failed to list tickets" }, 500);
  }
});

// Criar ticket
app.post("/make-server-e60fcfb3/tickets", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userData = await kv.get(`user:${user.id}`);
    const data = await c.req.json();
    const id = crypto.randomUUID();

    const ticket = {
      id,
      ...data,
      createdBy: userData.name,
      createdById: user.id,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    await kv.set(`ticket:${id}`, ticket);

    // Atualizar disponibilidade do recurso
    if (data.resourceType && data.resourceId) {
      const resourceKey =
        data.resourceType === "truck"
          ? `truck:${data.resourceId}`
          : `equipment:${data.resourceId}`;
      const resource = await kv.get(resourceKey);
      if (resource) {
        await kv.set(resourceKey, {
          ...resource,
          available: false,
        });
      }
    }

    return c.json({ ticket }, 201);
  } catch (error) {
    console.error("Error creating ticket:", error);
    return c.json({ error: "Failed to create ticket" }, 500);
  }
});

// Atualizar ticket
app.put("/make-server-e60fcfb3/tickets/:id", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const updates = await c.req.json();

    const ticket = await kv.get(`ticket:${id}`);
    if (!ticket) {
      return c.json({ error: "Ticket not found" }, 404);
    }

    const updatedTicket = { ...ticket, ...updates, id };
    await kv.set(`ticket:${id}`, updatedTicket);

    // Se o ticket foi fechado, liberar o recurso
    if (
      updates.status === "closed" &&
      ticket.resourceType &&
      ticket.resourceId
    ) {
      const resourceKey =
        ticket.resourceType === "truck"
          ? `truck:${ticket.resourceId}`
          : `equipment:${ticket.resourceId}`;
      const resource = await kv.get(resourceKey);
      if (resource) {
        await kv.set(resourceKey, {
          ...resource,
          available: true,
        });
      }
    }

    return c.json({ ticket: updatedTicket });
  } catch (error) {
    console.error("Error updating ticket:", error);
    return c.json({ error: "Failed to update ticket" }, 500);
  }
});

// Deletar ticket
app.delete("/make-server-e60fcfb3/tickets/:id", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const ticket = await kv.get(`ticket:${id}`);

    if (ticket && ticket.resourceType && ticket.resourceId) {
      const resourceKey =
        ticket.resourceType === "truck"
          ? `truck:${ticket.resourceId}`
          : `equipment:${ticket.resourceId}`;
      const resource = await kv.get(resourceKey);
      if (resource) {
        await kv.set(resourceKey, {
          ...resource,
          available: true,
        });
      }
    }

    await kv.del(`ticket:${id}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return c.json({ error: "Failed to delete ticket" }, 500);
  }
});

// ===== ROTAS DE PERMISSÕES (apenas admin) =====

// Listar permissões
app.get("/make-server-e60fcfb3/permissions", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const admin = await verifyAdmin(accessToken ?? null);

    if (!admin) {
      return c.json(
        { error: "Unauthorized. Admin only." },
        403,
      );
    }

    const permissions = await kv.getByPrefix("permission:");
    return c.json({ permissions });
  } catch (error) {
    console.error("Error listing permissions:", error);
    return c.json({ error: "Failed to list permissions" }, 500);
  }
});

// Atualizar permissões
app.put(
  "/make-server-e60fcfb3/permissions/:role/:module",
  async (c) => {
    try {
      const accessToken = c.req
        .header("Authorization")
        ?.split(" ")[1];
      const admin = await verifyAdmin(accessToken ?? null);

      if (!admin) {
        return c.json(
          { error: "Unauthorized. Admin only." },
          403,
        );
      }

      const role = c.req.param("role");
      const module = c.req.param("module");
      const permissions = await c.req.json();

      const key = `permission:${role}:${module}`;
      await kv.set(key, permissions);

      return c.json({ success: true, permissions });
    } catch (error) {
      console.error("Error updating permissions:", error);
      return c.json(
        { error: "Failed to update permissions" },
        500,
      );
    }
  },
);

// Inicializar permissões padrão
app.post(
  "/make-server-e60fcfb3/permissions/init",
  async (c) => {
    try {
      const accessToken = c.req
        .header("Authorization")
        ?.split(" ")[1];
      const admin = await verifyAdmin(accessToken ?? null);

      if (!admin) {
        return c.json(
          { error: "Unauthorized. Admin only." },
          403,
        );
      }

      // Permissões padrão para diferentes roles
      const defaultPermissions = {
        gestor: {
          trucks: {
            view: true,
            create: true,
            edit: true,
            delete: true,
          },
          equipment: {
            view: true,
            create: true,
            edit: true,
            delete: true,
          },
          maintenances: {
            view: true,
            create: true,
            edit: true,
            delete: true,
          },
          tickets: {
            view: true,
            create: true,
            edit: true,
            delete: true,
          },
          users: {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
        },
        chefe_equipa: {
          trucks: {
            view: true,
            create: false,
            edit: true,
            delete: false,
          },
          equipment: {
            view: true,
            create: false,
            edit: true,
            delete: false,
          },
          maintenances: {
            view: true,
            create: true,
            edit: true,
            delete: false,
          },
          tickets: {
            view: true,
            create: true,
            edit: true,
            delete: false,
          },
          users: {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
        },
        mecanico: {
          trucks: {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
          equipment: {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
          maintenances: {
            view: true,
            create: true,
            edit: true,
            delete: false,
          },
          tickets: {
            view: true,
            create: true,
            edit: false,
            delete: false,
          },
          users: {
            view: false,
            create: false,
            edit: false,
            delete: false,
          },
        },
        camionista: {
          trucks: {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
          equipment: {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
          maintenances: {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
          tickets: {
            view: true,
            create: true,
            edit: false,
            delete: false,
          },
          users: {
            view: false,
            create: false,
            edit: false,
            delete: false,
          },
        },
      };

      for (const [role, modules] of Object.entries(
        defaultPermissions,
      )) {
        for (const [module, perms] of Object.entries(modules)) {
          const key = `permission:${role}:${module}`;
          await kv.set(key, perms);
        }
      }

      return c.json({
        success: true,
        message: "Default permissions initialized",
      });
    } catch (error) {
      console.error("Error initializing permissions:", error);
      return c.json(
        { error: "Failed to initialize permissions" },
        500,
      );
    }
  },
);

// ===== ROTAS DE ESTATÍSTICAS =====

app.get("/make-server-e60fcfb3/stats", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await verifyUser(accessToken ?? null);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [users, trucks, equipment, maintenances, tickets] =
      await Promise.all([
        kv.getByPrefix("user:"),
        kv.getByPrefix("truck:"),
        kv.getByPrefix("equipment:"),
        kv.getByPrefix("maintenance:"),
        kv.getByPrefix("ticket:"),
      ]);

    const stats = {
      totalUsers: users.length,
      totalTrucks: trucks.length,
      availableTrucks: trucks.filter((t: any) => t.available)
        .length,
      totalEquipment: equipment.length,
      availableEquipment: equipment.filter(
        (e: any) => e.available,
      ).length,
      totalMaintenances: maintenances.length,
      pendingMaintenances: maintenances.filter(
        (m: any) => m.status === "pending",
      ).length,
      totalTickets: tickets.length,
      openTickets: tickets.filter(
        (t: any) => t.status === "open",
      ).length,
    };

    return c.json({ stats });
  } catch (error) {
    console.error("Error getting stats:", error);
    return c.json({ error: "Failed to get stats" }, 500);
  }
});

// Rota raiz
app.get("/make-server-e60fcfb3/", (c) => {
  return c.json({
    message: "Intranet API",
    version: "1.0.0",
    status: "running",
  });
});

Deno.serve(app.fetch);