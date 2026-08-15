import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      name: z.string().min(1).max(50),
      slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: org, error } = await (supabase as any)
      .from("organizations")
      .insert({
        name: data.name,
        slug: data.slug,
        owner_id: userId,
      })
      .select("id")
      .single();

    if (error) throw error;

    // Add owner as admin member
    await (supabase as any).from("organization_members").insert({
      org_id: org.id,
      user_id: userId,
      role: "admin",
    });

    return { id: org.id };
  });

export const transferRepository = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      repositoryId: z.string().uuid(),
      targetOrgId: z.string().uuid().optional(),
      targetUserId: z.string().uuid().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Check if user is on a paid plan
    const { data: canTransfer, error: planError } = await (supabase as any).rpc("can_transfer_repo", {
      _user_id: userId,
    });
    
    if (planError || !canTransfer) {
      throw new Error("Repository transfer is only available on paid plans.");
    }

    // 2. Perform transfer
    const updateData: any = {};
    if (data.targetOrgId) updateData.organization_id = data.targetOrgId;
    if (data.targetUserId) updateData.owner_id = data.targetUserId;

    const { error } = await (supabase as any)
      .from("repositories")
      .update(updateData)
      .eq("id", data.repositoryId)
      .eq("owner_id", userId); // Ensure user owns it

    if (error) throw error;

    return { ok: true };
  });
