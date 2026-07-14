import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LeadSchema = z.object({
  email: z.string().email(),
  source: z.string().max(60).optional(),
});

export const captureLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => LeadSchema.parse(data))
  .handler(async ({ data }) => {
    // Persistence-free lead capture: logs server-side.
    // Swap the console line for a DB insert / CRM webhook when persistence is enabled.
    // eslint-disable-next-line no-console
    console.log("[lead]", JSON.stringify({ ...data, at: new Date().toISOString() }));
    return { ok: true as const };
  });