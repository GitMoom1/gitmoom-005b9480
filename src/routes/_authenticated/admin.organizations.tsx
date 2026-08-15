import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { 
  Lock, Globe, UserCheck, GitFork, 
  Archive, Settings, Users, Plus, 
  Eye, EyeOff, Search
} from "lucide-react";
import { getOrganization, getOrganizationRepos, toggleRepoArchive } from "@/lib/organizations.functions";

export const Route = createFileRoute("/_authenticated/admin/organizations")({
  component: OrganizationDashboard,
});

function OrganizationDashboard() {
  // We'll use a hardcoded slug for demonstration since the route doesn't have a param yet
  // In a real app, this would come from Route.useParams()
  const orgSlug = "gitmoon";
  
  const fetchOrg = useServerFn(getOrganization);
  const fetchRepos = useServerFn(getOrganizationRepos);
  const archiveRepo = useServerFn(toggleRepoArchive);

  const [org, setOrg] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [orgSlug, activeFilter, showArchived]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const orgData = await fetchOrg({ data: { slug: orgSlug } });
      setOrg(orgData);
      
      const reposData = await fetchRepos({ 
        data: { 
          orgId: orgData.id, 
          filter: activeFilter,
          showArchived 
        } 
      });
      setRepos(reposData);
    } catch (error) {
      console.error("Failed to load organization data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onToggleArchive = async (repoId: string, currentStatus: boolean) => {
    try {
      await archiveRepo({ data: { repoId, archived: !currentStatus } });
      loadData();
    } catch (error) {
      alert("Failed to update repository status");
    }
  };

  if (isLoading && !org) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Organization Header */}
      <div className="border-b border-border bg-card/30 glass">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-cosmic text-4xl font-bold text-primary-foreground shadow-glow">
                {org?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{org?.name}</h1>
                <p className="mt-1 text-muted-foreground">
                  {org?.description || "No description provided."}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    org?.visibility === "PUBLIC" ? "bg-green-500/10 text-green-500" :
                    org?.visibility === "INTERNAL" ? "bg-blue-500/10 text-blue-500" :
                    "bg-red-500/10 text-red-500"
                  }`}>
                    {org?.visibility === "PUBLIC" && <Globe className="h-3 w-3" />}
                    {org?.visibility === "INTERNAL" && <UserCheck className="h-3 w-3" />}
                    {org?.visibility === "PRIVATE" && <Lock className="h-3 w-3" />}
                    {org?.visibility}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {org?.members?.[0]?.count || 0} members
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg border border-border glass px-4 py-2 text-sm font-medium transition hover:bg-white/5">
                <Settings className="h-4 w-4" /> Settings
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg bg-gradient-cosmic px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90">
                <Plus className="h-4 w-4" /> New Repository
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar Filters */}
          <aside className="w-full space-y-6 lg:w-64">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Filter by
              </h3>
              <nav className="space-y-1">
                {[
                  { id: "all", label: "All Repositories", icon: Archive },
                  { id: "public", label: "Public", icon: Globe },
                  { id: "internal", label: "Internal", icon: UserCheck },
                  { id: "private", label: "Private", icon: Lock },
                  { id: "forks", label: "Forks", icon: GitFork },
                  { id: "templates", label: "Templates", icon: Plus },
                  { id: "archived", label: "Archived", icon: Archive },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      activeFilter === f.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <f.icon className="h-4 w-4" />
                    {f.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="border-t border-border pt-6">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
              >
                {showArchived ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showArchived ? "Hide Archived" : "Show Archived"}
              </button>
            </div>
          </aside>

          {/* Repository List */}
          <main className="flex-1 space-y-6">
            <div className="flex items-center gap-4 rounded-xl border border-border glass p-2">
              <Search className="ml-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search repositories..."
                className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            {repos.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">
                <Archive className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="text-xl font-semibold">No repositories found</h3>
                <p className="mt-2 text-muted-foreground">
                  Try adjusting your filters or search query.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {repos.map((repo) => (
                  <div
                    key={repo.id}
                    className="group relative flex items-center justify-between rounded-2xl border border-border bg-card/30 p-6 transition hover:border-primary/50 hover:bg-card/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-semibold tracking-tight group-hover:text-primary transition">
                          {repo.name}
                        </h4>
                        <span className="rounded-full border border-border glass px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {repo.visibility}
                        </span>
                        {repo.is_archived && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive">
                            Archived
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                        {repo.description || "No description provided."}
                      </p>
                      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-primary" /> TypeScript
                        </span>
                        <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => onToggleArchive(repo.id, repo.is_archived)}
                        className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                        title={repo.is_archived ? "Unarchive" : "Archive"}
                      >
                        <Archive className={`h-4 w-4 ${repo.is_archived ? "text-primary" : ""}`} />
                      </button>
                      <button className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground">
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pro Tip */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-primary">Pro Tip!</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use organizations to manage teams and shared repositories with granular permissions.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
