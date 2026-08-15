import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getSSHKeys = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
      .from("ssh_keys" as any)
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null);

    if (error) throw error;
    return (data as any[]);
  });

export const addSSHKey = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    name: z.string().min(1),
    publicKey: z.string().min(1),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Simple fingerprint generation for UI
    const fingerprint = `SHA256:${Math.random().toString(36).substring(7)}`;

    const { data: key, error } = await supabaseAdmin
      .from("ssh_keys" as any)
      .insert({
        name: data.name,
        public_key: data.publicKey,
        fingerprint,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return (key as any);
  });
