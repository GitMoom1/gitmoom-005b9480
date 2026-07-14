import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createHash } from "crypto";
import { z } from "zod";

// Anti-spam: honeypot field ("website") must be empty; form must take at least
// MIN_SUBMIT_MS between render and submit; per-IP soft cap enforced in-process.
const MIN_SUBMIT_MS = 1500;

const LeadSchema = z.object({
  email: z.string().trim().email().max(320),
  source: z.string().trim().max(60).optional(),
  // Honeypot: real users leave it empty. Bots fill every field.
  website: z.string().max(0).optional().default(""),
  // Milliseconds between form mount and submit.
  elapsedMs: z.number().int().min(0).max(60 * 60 * 1000).optional(),
});

type LeadResponse =
  | { ok: true; id: string }
  | { ok: false; error: "rate_limited" | "spam_detected" | "too_fast" | "server_error" };

// In-memory soft rate limit — one submission every 5s per hashed IP.
const RATE_WINDOW_MS = 5000;
const lastSeen = new Map<string, number>();

function hashIp(ip: string | null | undefined) {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export const captureLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => LeadSchema.parse(data))
  .handler(async ({ data }): Promise<LeadResponse> => {
    // Anti-spam: honeypot
    if (data.website && data.website.length > 0) {
      return { ok: false, error: "spam_detected" };
    }
    // Anti-spam: submitted too fast to be a human
    if (typeof data.elapsedMs === "number" && data.elapsedMs < MIN_SUBMIT_MS) {
      return { ok: false, error: "too_fast" };
    }

    const request = getRequest();
    const forwarded = request?.headers.get("x-forwarded-for") ?? "";
    const ip = forwarded.split(",")[0]?.trim() || request?.headers.get("cf-connecting-ip") || null;
    const ipHash = hashIp(ip);
    const userAgent = request?.headers.get("user-agent") ?? null;

    // Soft per-IP rate limit
    if (ipHash) {
      const now = Date.now();
      const prev = lastSeen.get(ipHash) ?? 0;
      if (now - prev < RATE_WINDOW_MS) {
        return { ok: false, error: "rate_limited" };
      }
      lastSeen.set(ipHash, now);
      // Trim map opportunistically
      if (lastSeen.size > 5000) {
        for (const [k, v] of lastSeen) if (now - v > 60_000) lastSeen.delete(k);
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error } = await supabaseAdmin
      .from("leads")
      .insert({
        email: data.email.toLowerCase(),
        source: data.source ?? null,
        user_agent: userAgent,
        ip_hash: ipHash,
        metadata: {},
      })
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("[captureLead] insert failed", error);
      return { ok: false, error: "server_error" };
    }

    return { ok: true, id: inserted.id };
  });