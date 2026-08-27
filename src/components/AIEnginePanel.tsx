import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Bot, FileCode2, Sparkles, Wand2, Wrench, Loader2, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getAIQuota,
  listCommitReviews,
  runAIAction,
  type AIAction,
  type CommitReview,
} from '@/lib/ai-agent.functions';

const ACTIONS: Array<{ action: AIAction; label: string; icon: typeof Bot }> = [
  { action: 'CODE_REVIEW', label: 'Code Review', icon: Sparkles },
  { action: 'AUTO_FIX', label: 'Auto-fix', icon: Wrench },
  { action: 'REFACTOR', label: 'Refactor', icon: Wand2 },
  { action: 'DOCGEN', label: 'Docgen', icon: FileCode2 },
];

interface AIEnginePanelProps {
  repositoryId: string;
  commits: Array<{ sha: string; message: string }>;
}

export function AIEnginePanel({ repositoryId, commits }: AIEnginePanelProps) {
  const fetchQuota = useServerFn(getAIQuota);
  const fetchReviews = useServerFn(listCommitReviews);
  const runAction = useServerFn(runAIAction);

  const [selectedSha, setSelectedSha] = useState('');
  const [running, setRunning] = useState<AIAction | null>(null);
  const [openReviewId, setOpenReviewId] = useState<string | null>(null);

  const quota = useQuery({ queryKey: ['ai-engine', 'quota'], queryFn: () => fetchQuota() });
  const reviews = useQuery({
    queryKey: ['ai-engine', 'reviews', repositoryId],
    queryFn: () => fetchReviews({ data: { repositoryId } }),
  });

  const sha = selectedSha || commits[0]?.sha;
  const usedPercent = quota.data ? Math.min((quota.data.used / quota.data.limit) * 100, 100) : 0;

  const handleRun = async (action: AIAction) => {
    if (!sha) {
      toast.error('Faça um commit antes de acionar o GitMoomAgent.');
      return;
    }
    setRunning(action);
    try {
      const result = await runAction({ data: { action, repositoryId, commitSha: sha } });
      toast.success(`${action} concluído · ${result.review.tokens_used} tokens`);
      setOpenReviewId(result.review.id);
      await Promise.all([reviews.refetch(), quota.refetch()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao executar o GitMoomAgent.');
    } finally {
      setRunning(null);
    }
  };

  const list: CommitReview[] = reviews.data?.reviews ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" /> AI Engine · GitMoomAgent
        </CardTitle>
        <CardDescription>
          Code review, auto-fix, refactor e docgen executados sobre commits reais deste repositório.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {quota.data && (
          <div className="space-y-1.5 rounded-lg border border-border/50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" /> Plano {quota.data.tier}
              </span>
              <span className="text-muted-foreground">
                {quota.data.used.toLocaleString('pt-BR')} / {quota.data.limit.toLocaleString('pt-BR')}{' '}
                tokens
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${usedPercent}%` }} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={sha ?? ''}
            onChange={(e) => setSelectedSha(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            aria-label="Commit alvo"
          >
            {commits.length ? (
              commits.map((c) => (
                <option key={c.sha} value={c.sha}>
                  {c.sha.slice(0, 7)} · {c.message.slice(0, 60)}
                </option>
              ))
            ) : (
              <option value="">Nenhum commit disponível</option>
            )}
          </select>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map(({ action, label, icon: Icon }) => (
            <Button
              key={action}
              variant="outline"
              disabled={Boolean(running) || !commits.length}
              onClick={() => handleRun(action)}
            >
              {running === action ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icon className="mr-2 h-4 w-4" />
              )}
              {label}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          {list.map((review) => (
            <div key={review.id} className="rounded-lg border border-border/50 p-3 text-sm">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 text-left"
                onClick={() => setOpenReviewId(openReviewId === review.id ? null : review.id)}
              >
                <span>
                  <span className="font-medium">{review.action}</span>{' '}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {review.commit_sha ? review.commit_sha.slice(0, 7) : '—'}
                  </code>
                  <span className="mt-1 block text-xs text-muted-foreground">{review.summary}</span>
                </span>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {review.tokens_used} tk
                </span>
              </button>
              {openReviewId === review.id && (
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs leading-relaxed">
                  {review.result ?? 'Sem conteúdo.'}
                </pre>
              )}
            </div>
          ))}
          {!list.length && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma análise do GitMoomAgent ainda.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
