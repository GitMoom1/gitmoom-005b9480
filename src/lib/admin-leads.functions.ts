import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

const SORT_COLUMNS = ["created_at", "email", "source"] as const;

function csvEscape(v: unknown) {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        page: z.number().int().min(1).max(10000).default(1),
        pageSize: z.number().int().min(1).max(200).default(25),
        sort: z.enum(SORT_COLUMNS).default("created_at"),
        order: z.enum(["asc", "desc"]).default("desc"),
        search: z.string().trim().max(200).optional(),
      })
      .default({})
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = context.supabase
      .from("leads")
      .select("id, email, source, user_agent, ip_hash, created_at", { count: "exact" })
      .order(data.sort, { ascending: data.order === "asc" })
      .range(from, to);
    if (data.search) {
      const s = data.search.replace(/[%,]/g, " ");
      q = q.or(`email.ilike.%${s}%,source.ilike.%${s}%`);
    }
    const { data: leads, error, count } = await q;
    if (error) throw error;
    return { leads: leads ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const exportLeadsCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("leads")
      .select("id, email, source, user_agent, ip_hash, created_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (error) throw error;
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["id", "email", "source", "user_agent", "ip_hash", "created_at"];
    const rows = (data ?? []).map((r: any) =>
      header.map((k) => escape((r as any)[k])).join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("log_audit", {
      _action: "leads.exported",
      _target_type: "leads",
      _metadata: { count: rows.length, actor_id: context.userId },
    });
    return { csv, count: rows.length };
  });

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("leads").delete().eq("id", data.id);
    if (error) throw error;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("log_audit", {
      _action: "leads.deleted",
      _target_type: "lead",
      _target_id: data.id,
      _metadata: { actor_id: context.userId },
    });
    return { ok: true as const };
  });

export const checkAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (error) throw error;
    return { isAdmin: Boolean(data) };
  });

// -------- Admin invites --------

export const createAdminInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().trim().email().max(320) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { randomBytes, createHash } = await import("crypto");
    const token = randomBytes(24).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("admin_invites")
      .insert({
        email: data.email.toLowerCase(),
        token_hash: tokenHash,
        created_by: context.userId,
      })
      .select("id, email, expires_at")
      .single();
    if (error || !row) throw error ?? new Error("insert_failed");

    await supabaseAdmin.rpc("log_audit", {
      _action: "admin.invite.created",
      _target_type: "invite",
      _target_id: row.id,
      _metadata: { email: row.email, actor_id: context.userId },
    });

    return {
      ok: true as const,
      inviteId: row.id,
      email: row.email,
      expiresAt: row.expires_at,
      token,
    };
  });

export const listAdminInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("admin_invites")
      .select("id, email, created_at, expires_at, accepted_at, accepted_by, revoked_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return { invites: data ?? [] };
  });

export const revokeAdminInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("admin_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("log_audit", {
      _action: "admin.invite.revoked",
      _target_type: "invite",
      _target_id: data.id,
      _metadata: { actor_id: context.userId },
    });
    return { ok: true as const };
  });

export const acceptAdminInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ token: z.string().min(20).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("accept_admin_invite", {
      _token: data.token,
    });
    if (error) throw error;
    return result as { ok: boolean; error?: string };
  });

// -------- Admins management --------

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin");
    if (error) throw error;
    const ids = (roles ?? []).map((r) => r.user_id);
    const users: { id: string; email: string | null; created_at: string }[] = [];
    for (const id of ids) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      const role = roles!.find((r) => r.user_id === id)!;
      users.push({
        id,
        email: data?.user?.email ?? null,
        created_at: role.created_at,
      });
    }
    return { admins: users };
  });

export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("revoke_admin", {
      _target_user_id: data.userId,
    });
    if (error) throw error;
    return result as { ok: boolean; error?: string };
  });

// -------- Audit log --------

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(500).default(100),
        action: z.string().trim().max(100).optional(),
        targetType: z.string().trim().max(60).optional(),
        search: z.string().trim().max(200).optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
      .default({})
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("audit_log")
      .select("id, actor_id, action, target_type, target_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.action) q = q.ilike("action", `%${data.action.replace(/[%,]/g, " ")}%`);
    if (data.targetType) q = q.eq("target_type", data.targetType);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.search) {
      const s = data.search.replace(/[%,]/g, " ");
      q = q.or(`action.ilike.%${s}%,target_id.ilike.%${s}%,target_type.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw error;
    return { entries: rows ?? [] };
  });

export const exportAuditLogCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.string().trim().max(100).optional(),
        targetType: z.string().trim().max(60).optional(),
        search: z.string().trim().max(200).optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
      .default({})
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("audit_log")
      .select("id, actor_id, action, target_type, target_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (data.action) q = q.ilike("action", `%${data.action.replace(/[%,]/g, " ")}%`);
    if (data.targetType) q = q.eq("target_type", data.targetType);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.search) {
      const s = data.search.replace(/[%,]/g, " ");
      q = q.or(`action.ilike.%${s}%,target_id.ilike.%${s}%,target_type.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw error;
    const header = ["id", "created_at", "actor_id", "action", "target_type", "target_id", "metadata"];
    const lines = (rows ?? []).map((r: any) => header.map((k) => csvEscape((r as any)[k])).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("log_audit", {
      _action: "audit.exported",
      _target_type: "audit_log",
      _metadata: { count: lines.length, actor_id: context.userId, filters: data },
    });
    return { csv, count: lines.length };
  });