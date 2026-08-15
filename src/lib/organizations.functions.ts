import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const VisibilityType = z.enum(["PUBLIC", "INTERNAL", "PRIVATE"]);

export const getOrganization = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { data: org, error } = await supabase
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
    (data) =>
      z.object({
        orgId: z.string(),
        filter: z.string().optional().default("all"),
        showArchived: z.boolean().optional().default(false),
      }).parse(data)
  )
  .handler(async ({ data }) => {
    let query = supabase
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
    (data) =>
      z.object({
        orgId: z.string(),
        settings: z.any(),
      }).parse(data)
  )
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from("organization_settings")
      .update(data.settings)
      .eq("organization_id", data.orgId);

    if (error) throw new Error(error.message);
    return { success: true };
  });

export const toggleRepoArchive = createServerFn({ method: "POST" })
  .inputValidator(
    (data) =>
      z.object({
        repoId: z.string(),
        archived: z.boolean(),
      }).parse(data)
  )
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from("repositories")
      .update({ is_archived: data.archived })
      .eq("id", data.repoId);

    if (error) throw new Error(error.message);
    return { success: true };
  });
