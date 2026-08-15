import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getOrganization = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: org, error } = await (supabaseAdmin
      .from("organizations" as any)
      .select(`
        *,
        organization_settings (*),
        members:organization_members (
          count
        )
      `)
      .eq("slug", data.slug)
      .single() as any);

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
    let query = supabaseAdmin
      .from("repositories" as any)
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

    const { data: repos, error } = await (query as any);
    if (error) throw new Error(error.message);
    return repos;
  });

export const updateOrganizationSettings = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) =>
      z.object({
        orgId: z.string(),
        settings: z.any(),
      }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin
      .from("organization_settings" as any)
      .update(data.settings)
      .eq("organization_id", data.orgId) as any);

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
    const { error } = await (supabaseAdmin
      .from("repositories" as any)
      .update({ is_archived: data.archived } as any)
      .eq("id", data.repoId) as any);

    if (error) throw new Error(error.message);
    return { success: true };
  });
