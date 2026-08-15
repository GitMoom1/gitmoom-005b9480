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
      .select("*, user:auth.users(*)")
      .eq("hashed_key", hashedKey)
      .eq("status", "ACTIVE")
      .single();

    if (error || !apiKey) {
      return { valid: false, error: "Invalid or revoked API key" };
    }

    // Check expiry
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return { valid: false, error: "API key expired" };
    }

    // Enforce rate limiting logic here in a real app
    // ...

    return { 
      valid: true, 
      user: apiKey.user,
      scopes: apiKey.scopes 
    };
  });
