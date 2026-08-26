import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ArrowLeft, Book, Database, GitBranch, GitCommitHorizontal, Tag,
  HardDrive, Package, Rocket, ShieldCheck, Star, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  createBranch,
  createRelease,
  createTag,
  deleteBranch,
  getRepositoryDetail,
  pushCommit,
  toggleStar,
} from '@/lib/git-core.functions';

export const Route = createFileRoute('/_authenticated/dashboard/repositories/$repoId')({
  head: () => ({
    meta: [
      { title: 'Repositório — GitMoom Git Core' },
      {
        name: 'description',
        content: 'Branches, commits, tags, releases e objetos Git deste repositório no GitMoom.',
      },
      { property: 'og:title', content: 'Repositório — GitMoom Git Core' },
      { property: 'og:description', content: 'Detalhe do repositório no Git Core do GitMoom.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: RepositoryDetailPage,
});

function RepositoryDetailPage() {
  const { repoId } = Route.useParams();

  const fetchDetail = useServerFn(getRepositoryDetail);
  const newBranch = useServerFn(createBranch);
  const removeBranch = useServerFn(deleteBranch);
  const commit = useServerFn(pushCommit);
  const newTag = useServerFn(createTag);
  const newRelease = useServerFn(createRelease);
  const star = useServerFn(toggleStar);

  const detail = useQuery({
    queryKey: ['git-core', 'repository', repoId],
    queryFn: () => fetchDetail({ data: { repositoryId: repoId } }),
  });

  const [branchName, setBranchName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [commitBranch, setCommitBranch] = useState('');
  const [tagName, setTagName] = useState('');
  const [releaseTitle, setReleaseTitle] = useState('');
  const [releaseTag, setReleaseTag] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');

  const repo = detail.data?.repository;
  const branches = detail.data?.branches ?? [];
  const commits = detail.data?.commits ?? [];
  const tags = detail.data?.tags ?? [];
  const releases = detail.data?.releases ?? [];
  const objects = detail.data?.objects ?? [];

  const run = async (fn: () => Promise<unknown>, okMessage: string) => {
    try {
      await fn();
      toast.success(okMessage);
      await detail.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operação falhou.');
    }
  };

  if (detail.isLoading) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 py-8">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-border/50 bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="container mx-auto max-w-4xl py-16 text-center">
        <Book className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 text-2xl font-bold">Repositório não encontrado</h1>
        <p className="mt-2 text-muted-foreground">
          {detail.data?.error ?? 'Ele não existe ou você não tem acesso.'}
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/dashboard/repositories">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-8 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            to="/dashboard/repositories"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Repositórios
          </Link>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Book className="h-7 w-7 text-primary" />
            {repo.name}
          </h1>
          <p className="mt-1 text-muted-foreground">{repo.description ?? 'Sem descrição'}</p>
        </div>
        <Button
          variant={detail.data?.starred ? 'default' : 'outline'}
          onClick={() => run(() => star({ data: { repositoryId: repoId } }), 'Estrela atualizada.')}
        >
          <Star className={`mr-2 h-4 w-4 ${detail.data?.starred ? 'fill-current' : ''}`} />
          {repo.stars_count} {repo.stars_count === 1 ? 'estrela' : 'estrelas'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { icon: GitBranch, label: 'Branches', value: branches.length },
          { icon: GitCommitHorizontal, label: 'Commits', value: commits.length },
          { icon: Tag, label: 'Tags', value: tags.length },
          { icon: Package, label: 'Releases', value: releases.length },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 py-4">
              <stat.icon className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch className="h-5 w-5 text-primary" /> Branches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="feature/nova-branch"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <Button
                size="sm"
                disabled={!branchName.trim()}
                onClick={() =>
                  run(
                    () => newBranch({ data: { repositoryId: repoId, name: branchName.trim() } }),
                    'Branch criada.',
                  ).then(() => setBranchName(''))
                }
              >
                Criar
              </Button>
            </div>
            <div className="divide-y divide-border/50">
              {branches.map((branch) => (
                <div key={branch.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="flex items-center gap-2">
                    {branch.name}
                    {branch.is_default && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                        padrão
                      </span>
                    )}
                    {branch.is_protected && <ShieldCheck className="h-3.5 w-3.5 text-accent" />}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {branch.head_sha ? branch.head_sha.slice(0, 7) : '—'}
                    {!branch.is_default && (
                      <button
                        type="button"
                        onClick={() =>
                          run(() => removeBranch({ data: { branchId: branch.id } }), 'Branch removida.')
                        }
                        className="text-destructive hover:opacity-80"
                        aria-label={`Remover branch ${branch.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {!branches.length && (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma branch.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitCommitHorizontal className="h-5 w-5 text-primary" /> Commits
            </CardTitle>
            <CardDescription>
              Cada push gera um SHA real e indexa o objeto na KUBO Infra.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <select
                value={commitBranch || repo.default_branch}
                onChange={(e) => setCommitBranch(e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
              >
                {(branches.length ? branches : [{ name: repo.default_branch } as never]).map(
                  (branch) => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name}
                    </option>
                  ),
                )}
              </select>
              <input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="mensagem do commit"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <Button
                size="sm"
                disabled={!commitMessage.trim()}
                onClick={() =>
                  run(
                    () =>
                      commit({
                        data: {
                          repositoryId: repoId,
                          branch: commitBranch || repo.default_branch,
                          message: commitMessage.trim(),
                        },
                      }),
                    'Commit registrado.',
                  ).then(() => setCommitMessage(''))
                }
              >
                Push
              </Button>
            </div>
            <div className="max-h-72 space-y-2 overflow-auto">
              {commits.map((c) => (
                <div key={c.id} className="rounded-lg border border-border/50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{c.message}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {c.sha.slice(0, 7)}
                    </code>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {c.author_name} · {c.branch} ·{' '}
                    {new Date(c.committed_at).toLocaleString('pt-BR')} · +{c.additions} / -
                    {c.deletions}
                  </div>
                </div>
              ))}
              {!commits.length && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum commit ainda. Faça o primeiro push acima.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="h-5 w-5 text-primary" /> Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="v1.0.0"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <Button
                size="sm"
                disabled={!tagName.trim()}
                onClick={() =>
                  run(
                    () => newTag({ data: { repositoryId: repoId, name: tagName.trim() } }),
                    'Tag criada.',
                  ).then(() => setTagName(''))
                }
              >
                Criar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs"
                >
                  <Tag className="h-3 w-3" /> {tag.name}
                  {tag.target_sha ? ` · ${tag.target_sha.slice(0, 7)}` : ''}
                </span>
              ))}
              {!tags.length && (
                <p className="py-2 text-sm text-muted-foreground">Nenhuma tag criada.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-primary" /> Releases
            </CardTitle>
            <CardDescription>Publicar gera snapshot na KUBO Infra.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={releaseTag}
                onChange={(e) => setReleaseTag(e.target.value)}
                placeholder="tag (v1.0.0)"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                value={releaseTitle}
                onChange={(e) => setReleaseTitle(e.target.value)}
                placeholder="Título do release"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <textarea
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="Notas de release"
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <Button
              size="sm"
              disabled={!releaseTag.trim() || !releaseTitle.trim()}
              onClick={() =>
                run(
                  () =>
                    newRelease({
                      data: {
                        repositoryId: repoId,
                        tagName: releaseTag.trim(),
                        title: releaseTitle.trim(),
                        notes: releaseNotes.trim() || undefined,
                      },
                    }),
                  'Release publicado.',
                ).then(() => {
                  setReleaseTag('');
                  setReleaseTitle('');
                  setReleaseNotes('');
                })
              }
            >
              <Rocket className="mr-2 h-4 w-4" /> Publicar release
            </Button>
            <div className="space-y-2">
              {releases.map((release) => (
                <div key={release.id} className="rounded-lg border border-border/50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{release.title}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{release.tag_name}</code>
                  </div>
                  {release.is_draft && (
                    <span className="text-xs text-muted-foreground">rascunho</span>
                  )}
                  {release.published_at && (
                    <span className="text-xs text-muted-foreground">
                      publicado {new Date(release.published_at).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
              ))}
              {!releases.length && (
                <p className="py-2 text-sm text-muted-foreground">Nenhum release publicado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HardDrive className="h-5 w-5 text-primary" /> KUBO Infra · Objetos
          </CardTitle>
          <CardDescription>
            Índice de objetos, backups e snapshots deste repositório (storage híbrido).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {objects.length ? (
            <div className="space-y-2">
              {objects.map((object) => (
                <div
                  key={object.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{object.kind}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {object.sha ? object.sha.slice(0, 12) : '—'}
                    </code>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {object.engine} · {new Date(object.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum objeto indexado. Ele aparece após o primeiro commit ou release.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
