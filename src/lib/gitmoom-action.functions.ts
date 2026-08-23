import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { ActionRun, ActionWorkflow } from './gitmoom-action.server';

export type { ActionRun, ActionWorkflow, ActionJob } from './gitmoom-action.server';

export interface ActionOverviewResult {
  configured: boolean;
  error: string | null;
  workflows: ActionWorkflow[];
  runs: ActionRun[];
}

export const getActionOverview = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<ActionOverviewResult> => {
    const engine = await import('./gitmoom-action.server');
    if (!engine.isEngineConfigured()) {
      return { configured: false, error: null, workflows: [], runs: [] };
    }
    try {
      const [workflows, runs] = await Promise.all([
        engine.fetchWorkflows(),
        engine.fetchRuns({ limit: 25 }),
      ]);
      return {
        configured: true,
        error: null,
        workflows: workflows ?? [],
        runs: runs ?? [],
      };
    } catch (error) {
      return {
        configured: true,
        error: error instanceof Error ? error.message : 'Unknown engine error',
        workflows: [],
        runs: [],
      };
    }
  });

export const getActionRun = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ runId: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<ActionRun | null> => {
    const engine = await import('./gitmoom-action.server');
    if (!engine.isEngineConfigured()) return null;
    return await engine.fetchRun(data.runId);
  });

export const triggerActionRun = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        repositoryId: z.string().min(1),
        event: z.string().min(1).default('manual'),
        ref: z.string().min(1).default('refs/heads/main'),
        commitSha: z.string().min(1).default('HEAD'),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const engine = await import('./gitmoom-action.server');
    if (!engine.isEngineConfigured()) {
      throw new Error('GitMoom Action engine is not connected yet.');
    }
    const result = await engine.dispatchEvent({
      repositoryId: data.repositoryId,
      event: data.event,
      ref: data.ref,
      commitSha: data.commitSha,
      actor: context.userId,
    });
    return { runs: result?.runs ?? [] };
  });
