import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Book, GitBranch, Globe, Lock, Plus, RefreshCw, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  createRepository,
  deleteRepository,
  listRepositories,
} from '@/lib/git-core.functions';

export const Route = createFileRoute('/_authenticated/dashboard/repositories')({
  head: () => ({
    meta: [
      { title: 'Repositórios — GitMoon Git Core' },
      {
        name: 'description',
        content:
          'Crie e gerencie repositórios reais no GitMoon Git Core: branches, commits, tags, releases e objetos Git.',
      },
      { property: 'og:title', content: 'Repositórios — GitMoon Git Core' },
      {
        property: 'og:description',
        content: 'Git Core do GitMoon: repositórios, branches, commits, tags e releases.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: RepositoriesPage,
});

function RepositoriesPage() {
  const fetchRepos = useServerFn(listRepositories);
  const createRepo = useServerFn(createRepository);
  const removeRepo = useServerFn(deleteRepository);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [isCreating, setIsCreating] = useState(false);

  const repos = useQuery({
    queryKey: ['git-core', 'repositories'],
    queryFn: () => fetchRepos(),
  });

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Informe o nome do repositório.');
      return;
    }
    setIsCreating(true);
    try {
      await createRepo({
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          language: language.trim() || undefined,
          visibility,
          defaultBranch: 'main',
        },
      });
      toast.success('Repositório criado no Git Core.');
      setName('');
      setDescription('');
      setLanguage('');
      await repos.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao criar repositório.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, repoName: string) => {
    try {
      await removeRepo({ data: { repositoryId: id } });
      toast.success(`Repositório ${repoName} removido.`);
      await repos.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao remover repositório.');
    }
  };

  const list = repos.data?.repositories ?? [];

  return (
    <div className="container mx-auto max-w-6xl space-y-8 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Book className="h-7 w-7 text-primary" />
            Git Core · Repositórios
          </h1>
          <p className="mt-1 text-muted-foreground">
            Metadados no banco do GitMoon, objetos Git na KUBO Infra (storage híbrido).
          </p>
        </div>
        <Button variant="outline" onClick={() => repos.refetch()} disabled={repos.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${repos.isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {repos.data?.error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-lg">Banco indisponível</CardTitle>
            <CardDescription className="break-all">{repos.data.error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-primary" />
            Novo repositório
          </CardTitle>
          <CardDescription>
            Cria o registro, o branch padrão <code>main</code> e o prefixo de storage dos objetos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="nome-do-repo"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary md:col-span-2"
          />
          <input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="Linguagem"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex items-center gap-2 md:col-span-3">
            {(['PRIVATE', 'PUBLIC'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setVisibility(option)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs uppercase tracking-wide transition ${
                  visibility === option
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {option === 'PRIVATE' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                {option === 'PRIVATE' ? 'Privado' : 'Público'}
              </button>
            ))}
          </div>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Criando...' : 'Criar repositório'}
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Seus repositórios</h2>
        {repos.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-border/50 bg-muted/40" />
            ))}
          </div>
        ) : list.length ? (
          <div className="grid gap-3">
            {list.map((repo) => (
              <Card key={repo.id} className="transition hover:border-primary/40">
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/dashboard/repositories/$repoId"
                        params={{ repoId: repo.id }}
                        className="text-lg font-semibold text-primary hover:underline"
                      >
                        {repo.name}
                      </Link>
                      <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                        {repo.visibility === 'PUBLIC' ? (
                          <>
                            <Globe className="h-2.5 w-2.5" /> público
                          </>
                        ) : (
                          <>
                            <Lock className="h-2.5 w-2.5" /> privado
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {repo.description || 'Sem descrição'}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" /> {repo.default_branch}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" /> {repo.stars_count}
                      </span>
                      {repo.language ? <span>{repo.language}</span> : null}
                      <span>
                        atualizado {new Date(repo.updated_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/dashboard/repositories/$repoId" params={{ repoId: repo.id }}>
                        Abrir
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(repo.id, repo.name)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhum repositório ainda. Crie o primeiro acima.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
