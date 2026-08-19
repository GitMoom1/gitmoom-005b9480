import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createOrganization = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      z.object({
        name: z.string().min(2).max(100),
        slug: z.string().min(2).max(100),
        description: z.string().max(500).optional(),
      }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Create the organization
    const { data: org, error: orgError } = await (supabaseAdmin as any)
      .from("organizations")
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        plan: "free",
        visibility: "PUBLIC"
      })
      .select()
      .single();

    if (orgError) throw new Error(orgError.message);

    // Create default settings
    const { error: settingsError } = await (supabaseAdmin as any)
      .from("organization_settings")
      .insert({
        organization_id: org.id,
        visibility: "INTERNAL",
        allow_forks: true,
        allow_templates: true,
        public_visibility: "INTERNAL",
        internal_visibility: "INTERNAL",
        private_visibility: "PRIVATE"
      });

    if (settingsError) throw new Error(settingsError.message);

    return org;
  });

export const getOrganization = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: org, error } = await (supabaseAdmin as any)
      .from("organizations")
      .select(`
        *,
        organization_settings (*),
        members:organization_members (
          count
        )
      `)
      .eq("slug", data.slug)
      .single();

    if (error) throw new Error(error.message);
    return org;
  });

export const getOrganizationRepos = createServerFn({ method: "GET" })
  .inputValidator(
    (data: unknown) =>
      z.object({
        orgId: z.string(),
        filter: z.string().optional().default("all"),
        showArchived: z.boolean().optional().default(false),
      }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = (supabaseAdmin as any)
      .from("repositories")
      .select("*")
      .eq("organization_id", data.orgId);
    
    if (!data.showArchived) {
      query = query.eq("is_archived", false);
    }

    switch (data.filter) {
      case "public":
        query = query.eq("visibility", "PUBLIC");
        break;
      case "internal":
        query = query.eq("visibility", "INTERNAL");
        break;
      case "private":
        query = query.eq("visibility", "PRIVATE");
        break;
      case "forks":
        query = query.eq("is_fork", true);
        break;
      case "archived":
        query = query.eq("is_archived", true);
        break;
      case "templates":
        query = query.eq("is_template", true);
        break;
    }

    const { data: repos, error } = await query;
    if (error) throw new Error(error.message);
    return repos;
  });

export const updateOrganizationSettings = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      z.object({
        orgId: z.string(),
        settings: z.record(z.unknown()),
      }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("organization_settings")
      .update(data.settings)
      .eq("organization_id", data.orgId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const toggleRepoArchive = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      z.object({
        repoId: z.string(),
        archived: z.boolean(),
      }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("repositories")
      .update({ is_archived: data.archived })
      .eq("id", data.repoId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const transferRepoToOrg = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      z.object({
        repoId: z.string(),
        targetOrgId: z.string(),
      }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Check if plan allows transfer
    const { data: org, error: orgError } = await (supabaseAdmin as any)
      .from("organizations")
      .select("plan")
      .eq("id", data.targetOrgId)
      .single();

    if (orgError) throw new Error("Target organization not found");
    if (org?.plan === 'free') {
      throw new Error("Repository transfer requires a paid plan (Eclipse, Galaxy, or Supernova)");
    }

    const { error } = await (supabaseAdmin as any)
      .from("repositories")
      .update({ organization_id: data.targetOrgId })
      .eq("id", data.repoId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
