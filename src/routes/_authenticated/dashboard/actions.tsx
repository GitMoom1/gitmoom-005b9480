import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Workflow, PlayCircle, RefreshCw, ShieldAlert, Rocket,
  CheckCircle2, XCircle, Clock, Ban, Terminal, PlugZap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getActionOverview,
  getActionRun,
  triggerActionRun,
  type ActionRun,
} from '@/lib/gitmoom-action.functions';

export const Route = createFileRoute('/_authenticated/dashboard/actions')({
  head: () => ({
    meta: [
      { title: 'GitMoom Action — CI/CD nativo' },
      {
        name: 'description',
        content:
          'Acompanhe workflows, runs e logs do GitMoom Action: build, testes, scan CSI e deploy no Vertal.',
      },
      { property: 'og:title', content: 'GitMoom Action — CI/CD nativo' },
      {
        property: 'og:description',
        content: 'Painel de workflows e execuções do motor de CI/CD do GitMoom.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: ActionsPage,
});

const STATUS_STYLES: Record<string, { icon: typeof Clock; className: string }> = {
  SUCCESS: { icon: CheckCircle2, className: 'text-green-500' },
  COMPLETED: { icon: CheckCircle2, className: 'text-green-500' },
  FAILED: { icon: XCircle, className: 'text-destructive' },
  BLOCKED: { icon: Ban, className: 'text-destructive' },
  RUNNING: { icon: RefreshCw, className: 'text-primary animate-spin' },
  QUEUED: { icon: Clock, className: 'text-muted-foreground' },
  PENDING: { icon: Clock, className: 'text-muted-foreground' },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status?.toUpperCase()] ?? STATUS_STYLES['PENDING']!;
  const Icon = style.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
      <Icon className={`h-4 w-4 ${style.className}`} />
      {status ?? 'unknown'}
    </span>
  );
}

function ActionsPage() {
  const fetchOverview = useServerFn(getActionOverview);
  const fetchRun = useServerFn(getActionRun);
  const dispatchRun = useServerFn(triggerActionRun);

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [repositoryId, setRepositoryId] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  const overview = useQuery({
    queryKey: ['gitmoom-action', 'overview'],
    queryFn: () => fetchOverview(),
    refetchInterval: 15000,
  });

  const runDetail = useQuery({
    queryKey: ['gitmoom-action', 'run', selectedRunId],
    queryFn: () => fetchRun({ data: { runId: selectedRunId! } }),
    enabled: Boolean(selectedRunId),
    refetchInterval: 8000,
  });

  const handleDispatch = async () => {
    if (!repositoryId.trim()) {
      toast.error('Informe o ID do repositório.');
      return;
    }
    setIsDispatching(true);
    try {
      await dispatchRun({
        data: {
          repositoryId: repositoryId.trim(),
          event: 'manual',
          ref: 'refs/heads/main',
          commitSha: 'HEAD',
        },
      });
      toast.success('Run enfileirada no GitMoom Action.');
      await overview.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao disparar a run.');
    } finally {
      setIsDispatching(false);
    }
  };

  const data = overview.data;
  const runs: ActionRun[] = data?.runs ?? [];

  return (
    <div className="container mx-auto max-w-6xl space-y-8 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Workflow className="h-7 w-7 text-primary" />
            GitMoom Action
          </h1>
          <p className="mt-1 text-muted-foreground">
            Motor de CI/CD nativo: checkout, testes, build, scan CSI e deploy no Vertal.
          </p>
        </div>
        <Button variant="outline" onClick={() => overview.refetch()} disabled={overview.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${overview.isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {data && !data.configured && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlugZap className="h-5 w-5 text-accent" />
              Motor não conectado
            </CardTitle>
            <CardDescription>
              O serviço GitMoom Action roda fora deste app (Node + Docker + Redis). Configure a URL
              da API e o token de acesso do motor para ver workflows, runs e logs aqui.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Variáveis esperadas no servidor:</p>
            <code className="block rounded bg-muted px-2 py-1">GITMOOM_ACTION_API_URL</code>
            <code className="block rounded bg-muted px-2 py-1">GITMOOM_ACTION_API_TOKEN</code>
          </CardContent>
        </Card>
      )}

      {data?.error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Erro ao consultar o motor
            </CardTitle>
            <CardDescription className="break-all">{data.error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PlayCircle className="h-5 w-5 text-primary" />
            Disparar run manual
          </CardTitle>
          <CardDescription>
            Envia um evento <code>manual</code> para o dispatcher do GitMoom Action.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <input
            value={repositoryId}
            onChange={(e) => setRepositoryId(e.target.value)}
            placeholder="ID do repositório"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <Button onClick={handleDispatch} disabled={isDispatching || !data?.configured}>
            <Rocket className="mr-2 h-4 w-4" />
            {isDispatching ? 'Enviando...' : 'Executar workflow'}
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Workflows</h2>
        {data?.workflows.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.workflows.map((wf) => (
              <Card key={wf.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <div className="font-medium">{wf.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {wf.path ?? '.gitmoom/workflows'} · {(wf.events ?? []).join(', ') || 'sem eventos'}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                      wf.enabled === false
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-green-500/10 text-green-500'
                    }`}
                  >
                    {wf.enabled === false ? 'off' : 'ativo'}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum workflow encontrado em <code>.gitmoom/workflows/*.yml</code>.
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Execuções recentes</h2>
        {runs.length ? (
          <div className="grid gap-3">
            {runs.map((run) => (
              <Card key={run.id} className="transition hover:border-primary/40">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{run.workflowName ?? run.workflowId ?? 'workflow'}</span>
                      <StatusBadge status={run.status} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {run.event ?? 'event'} · {run.ref ?? '-'} ·{' '}
                      {run.commitSha ? run.commitSha.slice(0, 7) : '-'} · {run.actor ?? '-'}
                      {run.createdAt ? ` · ${new Date(run.createdAt).toLocaleString()}` : ''}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRunId(selectedRunId === run.id ? null : run.id)}
                  >
                    <Terminal className="mr-2 h-4 w-4" />
                    {selectedRunId === run.id ? 'Fechar logs' : 'Ver logs'}
                  </Button>
                </CardContent>

                {selectedRunId === run.id && (
                  <CardContent className="border-t border-border pt-4">
                    {runDetail.isLoading ? (
                      <p className="text-sm text-muted-foreground">Carregando jobs...</p>
                    ) : runDetail.data?.jobs?.length ? (
                      <div className="space-y-4">
                        {runDetail.data.jobs.map((job) => (
                          <div key={job.id} className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">{job.name}</span>
                              <StatusBadge status={job.status} />
                            </div>
                            <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
                              {job.logs ??
                                (job.steps ?? [])
                                  .map((step) => `[${step.status}] ${step.name}\n${step.logs ?? ''}`)
                                  .join('\n') ||
                                'Sem logs disponíveis.'}
                            </pre>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum job registrado nesta run.</p>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma execução registrada ainda.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
