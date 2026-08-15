import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "crypto";

export const validateApiKey = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ key: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const hashedKey = createHash("sha256").update(data.key).digest("hex");
    
    const { data: apiKey, error } = await supabaseAdmin
      .from("api_keys" as any)
      .select("*")
      .eq("hashed_key", hashedKey)
      .eq("status", "ACTIVE")
      .single();

    if (error || !apiKey) {
      return { valid: false, error: "Invalid or revoked API key" };
    }

    const keyData = apiKey as Record<string, any>;

    // Check expiry
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return { valid: false, error: "API key expired" };
    }

    // Get user separately to avoid join parsing issues
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(keyData.user_id);

    return { 
      valid: true, 
      user: user,
      scopes: keyData.scopes 
    };
  });
