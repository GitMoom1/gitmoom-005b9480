import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export type AIAction = 'CODE_REVIEW' | 'AUTO_FIX' | 'REFACTOR' | 'DOCGEN';

export interface CommitReview {
  id: string;
  repository_id: string;
  commit_sha: string | null;
  action: string;
  status: string;
  summary: string | null;
  result: string | null;
  model: string | null;
  tokens_used: number;
  created_at: string;
}

export interface AIQuota {
  tier: string;
  limit: number;
  used: number;
  remaining: number;
}

const actionSchema = z.enum(['CODE_REVIEW', 'AUTO_FIX', 'REFACTOR', 'DOCGEN']);

function monthStartISO(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Cota de tokens de IA do usuário no mês corrente. */
export const getAIQuota = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AIQuota> => {
    const { tokenLimitFor } = await import('./ai-agent.server');
    const db = context.supabase as any;

    const [{ data: subscription }, { data: usage }] = await Promise.all([
      db
        .from('subscriptions')
        .select('plan_tier, status')
        .eq('user_id', context.userId)
        .eq('status', 'active')
        .maybeSingle(),
      db
        .from('ai_usage')
        .select('tokens_used')
        .eq('user_id', context.userId)
        .gte('created_at', monthStartISO()),
    ]);

    const tier = (subscription?.plan_tier ?? 'STARTER').toUpperCase();
    const limit = tokenLimitFor(tier);
    const used = ((usage ?? []) as Array<{ tokens_used: number }>).reduce(
      (total, row) => total + (row.tokens_used ?? 0),
      0,
    );

    return { tier, limit, used, remaining: Math.max(limit - used, 0) };
  });

/** Reviews do GitMoomAgent de um repositório. */
export const listCommitReviews = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ repositoryId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ reviews: CommitReview[]; error: string | null }> => {
    const db = context.supabase as any;
    const { data: reviews, error } = await db
      .from('commit_reviews')
      .select('*')
      .eq('repository_id', data.repositoryId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) return { reviews: [], error: error.message };
    return { reviews: (reviews ?? []) as CommitReview[], error: null };
  });

/**
 * Executa uma ação do GitMoomAgent sobre um commit real do Git Core,
 * respeitando o limite de tokens do plano e persistindo review + uso.
 */
export const runAIAction = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        action: actionSchema,
        repositoryId: z.string().uuid(),
        commitSha: z.string().min(4).max(64).optional(),
        diff: z.string().max(40_000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ review: CommitReview; quota: AIQuota }> => {
    const { runAgent, tokenLimitFor } = await import('./ai-agent.server');
    const db = context.supabase as any;

    // 1. Repositório + commit alvo
    const { data: repo, error: repoError } = await db
      .from('repositories')
      .select('id, name, language, default_branch')
      .eq('id', data.repositoryId)
      .maybeSingle();
    if (repoError) throw new Error(repoError.message);
    if (!repo) throw new Error('Repositório não encontrado ou sem acesso.');

    let commitQuery = db
      .from('commits')
      .select('sha, branch, message, files_changed, additions, deletions')
      .eq('repository_id', data.repositoryId);
    commitQuery = data.commitSha
      ? commitQuery.eq('sha', data.commitSha)
      : commitQuery.order('committed_at', { ascending: false }).limit(1);

    const { data: commit } = await commitQuery.maybeSingle();
    if (!commit) throw new Error('Nenhum commit encontrado para analisar.');

    // 2. Cota do plano
    const { data: subscription } = await db
      .from('subscriptions')
      .select('plan_tier')
      .eq('user_id', context.userId)
      .eq('status', 'active')
      .maybeSingle();

    const tier = (subscription?.plan_tier ?? 'STARTER').toUpperCase();
    const limit = tokenLimitFor(tier);

    const { data: usageRows } = await db
      .from('ai_usage')
      .select('tokens_used')
      .eq('user_id', context.userId)
      .gte('created_at', monthStartISO());

    const used = ((usageRows ?? []) as Array<{ tokens_used: number }>).reduce(
      (total, row) => total + (row.tokens_used ?? 0),
      0,
    );

    if (used >= limit) {
      throw new Error(
        `Limite de ${limit.toLocaleString('pt-BR')} tokens do plano ${tier} atingido neste mês. Faça upgrade para continuar.`,
      );
    }

    // 3. Execução do agente
    const result = await runAgent(data.action, {
      repositoryName: repo.name,
      language: repo.language,
      branch: commit.branch,
      sha: commit.sha,
      message: commit.message,
      filesChanged: commit.files_changed,
      additions: commit.additions,
      deletions: commit.deletions,
      diff: data.diff ?? null,
    });

    // 4. Persistência do review e do consumo
    const { data: review, error: reviewError } = await db
      .from('commit_reviews')
      .insert({
        repository_id: data.repositoryId,
        commit_sha: commit.sha,
        user_id: context.userId,
        action: data.action,
        status: 'COMPLETED',
        summary: result.summary,
        result: result.content,
        model: result.model,
        tokens_used: result.tokensUsed,
      })
      .select()
      .single();
    if (reviewError) throw new Error(reviewError.message);

    await db.from('ai_usage').insert({
      user_id: context.userId,
      repository_id: data.repositoryId,
      commit_sha: commit.sha,
      action_type: data.action,
      model: result.model,
      tokens_used: result.tokensUsed,
      metadata: { branch: commit.branch, tier },
    });

    const totalUsed = used + result.tokensUsed;
    return {
      review: review as CommitReview,
      quota: { tier, limit, used: totalUsed, remaining: Math.max(limit - totalUsed, 0) },
    };
  });
