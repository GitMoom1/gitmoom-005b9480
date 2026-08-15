import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const apiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.string().optional(),
});

export const createApiKey = createServerFn({ method: "POST" })
  .inputValidator((data) => apiKeySchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { randomBytes, createHash } = await import("crypto");
    
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Plan limits enforcement
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions" as any)
      .select("tier")
      .eq("user_id", user.id)
      .single() as any;
    
    const tier = subscription?.tier || 'STARTER';
    const { data: existingKeys } = await supabaseAdmin
      .from("api_keys" as any)
      .select("id")
      .eq("user_id", user.id)
      .is("deleted_at", null) as any;
    
    const maxKeys = tier === 'BUSINESS' ? 1000 : tier === 'PRO' ? 5 : 1;
    if ((existingKeys?.length || 0) >= maxKeys) {
      throw new Error(`Plan limit reached: ${tier} plan allows maximum ${maxKeys} API keys.`);
    }

    const rawKey = `gitmoom_${randomBytes(32).toString("hex")}`;
    const hashedKey = createHash("sha256").update(rawKey).digest("hex");
    const keyPreview = `${rawKey.slice(0, 12)}...${rawKey.slice(-4)}`;

    const { data: apiKey, error } = await supabaseAdmin
      .from("api_keys" as any)
      .insert({
        name: data.name,
        key_preview: keyPreview,
        hashed_key: hashedKey,
        user_id: user.id,
        scopes: data.scopes || [],
        expires_at: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    // Use type assertion or casting to avoid spread errors with unknown types
    const result = (apiKey as Record<string, any>);
    return {
      ...result,
      rawKey
    };
  });

export const listApiKeys = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: keys, error } = await supabaseAdmin
      .from("api_keys" as any)
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (keys as any[]);
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabaseAdmin
      .from("api_keys" as any)
      .update({ 
        status: "REVOKED",
        deleted_at: new Date().toISOString()
      } as any)
      .eq("id", data.id)
      .eq("user_id", user.id);

    if (error) throw error;
    return { success: true };
  });
