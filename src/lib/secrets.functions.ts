import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getSecrets = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin
      .from("secrets" as any)
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as any[]);
  });

export const createSecret = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    name: z.string().min(1),
    value: z.string().min(1),
    environment: z.enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION', 'ALL']).default('DEVELOPMENT'),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Mock encryption logic - in production use a real kms/crypto
    const encryptedValue = Buffer.from(data.value).toString('base64');

    const { data: secret, error } = await supabaseAdmin
      .from("secrets" as any)
      .insert({
        name: data.name,
        encrypted_value: encryptedValue,
        environment: data.environment,
        user_id: user.id,
        last_rotated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return (secret as any);
  });
