import { Book, Star, Clock, Lock, Globe } from "lucide-react";

interface Repository {
  id: string | number;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  is_private: boolean;
}

interface RepositoryListProps {
  repositories: Repository[];
  isLoading?: boolean;
}

export function RepositoryList({ repositories, isLoading }: RepositoryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full animate-pulse bg-accent/20 rounded-xl border border-border/50" />
        ))}
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-border/50 rounded-2xl">
        <Book className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <h3 className="mt-4 text-lg font-semibold">No repositories found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new repository to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {repositories.map((repo) => (
        <div key={repo.id} className="py-5 flex items-start justify-between group">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-primary hover:underline cursor-pointer">
                {repo.name}
              </h3>
              <span className="text-[10px] border border-border/50 rounded-full px-2 py-0.5 text-muted-foreground font-bold uppercase tracking-tight flex items-center gap-1">
                {repo.is_private ? (
                  <>
                    <Lock className="h-2.5 w-2.5" /> Private
                  </>
                ) : (
                  <>
                    <Globe className="h-2.5 w-2.5" /> Public
                  </>
                )}
              </span>
            </div>
            {repo.description && (
              <p className="text-muted-foreground text-sm max-w-2xl line-clamp-2">
                {repo.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              {repo.language && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/60"></div>
                  {repo.language}
                </div>
              )}
              <div className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                <Star className="h-3.5 w-3.5" />
                {repo.stargazers_count}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Updated {repo.updated_at}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition duration-200">
            <button className="p-2 border border-border/50 rounded-lg hover:bg-accent/50 text-muted-foreground transition">
              <Star className="h-4 w-4" />
            </button>
            <div className="h-8 w-px bg-border/50 mx-1"></div>
            <div className="flex items-center bg-accent/30 border border-border/50 rounded-lg overflow-hidden shadow-sm">
              <button className="px-3 py-1.5 text-xs font-bold hover:bg-accent/50 border-r border-border/50 transition">
                PRs
              </button>
              <button className="px-3 py-1.5 text-xs font-bold hover:bg-accent/50 transition">
                Config
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
