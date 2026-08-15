import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listIntegrations = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: integrations, error } = await supabaseAdmin
      .from("integrations" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (integrations as any[]);
  });

export const createIntegration = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    name: z.string().min(1),
    type: z.enum(['GITHUB', 'GITLAB', 'BITBUCKET', 'SLACK', 'DISCORD', 'CUSTOM']),
    config: z.record(z.any()).optional(),
    credentials: z.string().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: integration, error } = await supabaseAdmin
      .from("integrations" as any)
      .insert({
        name: data.name,
        type: data.type,
        config: data.config || {},
        credentials: data.credentials, // In a real app, encrypt this first
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return (integration as any);
  });
