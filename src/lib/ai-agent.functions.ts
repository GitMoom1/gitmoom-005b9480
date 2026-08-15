import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AIAction = 'CODE_REVIEW' | 'AUTO_FIX' | 'REFACTOR' | 'DOCGEN';

export class GitMoomAgent {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async processAction(action: AIAction, repoId: string, context: any) {
    // 1. Check user limits
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Check subscription and usage
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions" as any)
      .select("tier")
      .eq("user_id", this.userId)
      .single() as any;

    const tier = subscription?.tier || 'STARTER';
    
    // Simple mock logic for now
    console.log(`Processing ${action} for repo ${repoId} (User: ${this.userId}, Tier: ${tier})`);
    
    // Log usage
    await supabaseAdmin.from("ai_usage" as any).insert({
      user_id: this.userId,
      action_type: action,
      tokens_used: 100, // example
      repository_id: repoId,
      metadata: context
    } as any);

    return {
      success: true,
      result: `AI ${action} completed successfully for repo ${repoId}`,
      action
    };
  }
}

export const runAIAction = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    action: z.enum(['CODE_REVIEW', 'AUTO_FIX', 'REFACTOR', 'DOCGEN']),
    repoId: z.string(),
    context: z.any().optional()
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: { user } } = await supabaseAdmin.auth.getUser();
    
    if (!user) throw new Error("Unauthorized");

    const agent = new GitMoomAgent(user.id);
    return await agent.processAction(data.action, data.repoId, data.context);
  });
