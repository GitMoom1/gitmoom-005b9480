import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { 
  Lock, Globe, UserCheck, GitFork, 
  Archive, Settings, Users, Plus, 
  Eye, EyeOff, Search, Save, Shield, Clock, Copy
} from "lucide-react";
import { getOrganization, updateOrganizationSettings } from "@/lib/organizations.functions";

export const Route = createFileRoute("/_authenticated/admin/organizations")({
  component: OrganizationManager,
});

function OrganizationManager() {
  const orgSlug = "gitmoon";
  const [view, setView] = useState<"dashboard" | "settings">("dashboard");
  
  const fetchOrg = useServerFn(getOrganization);
  const saveSettings = useServerFn(updateOrganizationSettings);

  const [org, setOrg] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadOrg();
  }, [orgSlug]);

  const loadOrg = async () => {
    setIsLoading(true);
    try {
      const data = await fetchOrg({ data: { slug: orgSlug } });
      setOrg(data);
    } catch (error) {
      console.error("Failed to load organization:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSettings = async (newSettings: any) => {
    setIsSaving(true);
    try {
      await saveSettings({ data: { orgId: org.id, settings: newSettings } });
      await loadOrg();
      alert("Settings saved successfully!");
    } catch (error) {
      alert("Failed to save settings");
    } finally {
      setIsSaving(false);
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
      {/* Header */}
      <div className="border-b border-border bg-card/30 glass">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-cosmic text-4xl font-bold text-primary-foreground shadow-glow">
                {org?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{org?.name}</h1>
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
                  <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                    Plan: {org?.plan || "Free"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setView("dashboard")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === "dashboard" ? "bg-primary text-primary-foreground shadow-glow" : "glass hover:bg-white/5"}`}
              >
                Repositories
              </button>
              <button 
                onClick={() => setView("settings")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === "settings" ? "bg-primary text-primary-foreground shadow-glow" : "glass hover:bg-white/5"}`}
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {view === "dashboard" ? (
          <RepositoryListView org={org} />
        ) : (
          <SettingsView org={org} onSave={handleUpdateSettings} isSaving={isSaving} />
        )}
      </div>
    </div>
  );
}

function RepositoryListView({ org }: { org: any }) {
  const fetchRepos = useServerFn(getOrganizationRepos);
  const archiveRepo = useServerFn(toggleRepoArchive);
  
  const [repos, setRepos] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRepos();
  }, [org.id, activeFilter, showArchived]);

  const loadRepos = async () => {
    setLoading(true);
    try {
      const data = await fetchRepos({ data: { orgId: org.id, filter: activeFilter, showArchived } });
      setRepos(data);
    } catch (error) {
      console.error("Failed to load repos:", error);
    } finally {
      setLoading(false);
    }
  };

  const onToggleArchive = async (repoId: string, currentStatus: boolean) => {
    try {
      await archiveRepo({ data: { repoId, archived: !currentStatus } });
      loadRepos();
    } catch (error) {
      alert("Error updating repository");
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full space-y-6 lg:w-64">
        <nav className="space-y-1">
          {[
            { id: "all", label: "All Repos", icon: Archive },
            { id: "public", label: "Public", icon: Globe },
            { id: "internal", label: "Internal", icon: UserCheck },
            { id: "private", label: "Private", icon: Lock },
            { id: "forks", label: "Forks", icon: GitFork },
            { id: "templates", label: "Templates", icon: Copy },
            { id: "archived", label: "Archived", icon: Archive },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeFilter === f.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <f.icon className="h-4 w-4" />
              {f.label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-white/5"
        >
          {showArchived ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {showArchived ? "Hide Archived" : "Show Archived"}
        </button>
      </aside>

      <main className="flex-1 space-y-4">
        <div className="flex items-center gap-4 rounded-xl border border-border glass p-2">
          <Search className="ml-3 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search repositories..." className="flex-1 bg-transparent py-2 text-sm outline-none" />
        </div>

        {loading ? (
           <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        ) : repos.length === 0 ? (
          <div className="text-center py-20 glass rounded-3xl border border-dashed border-border text-muted-foreground">
            No repositories found.
          </div>
        ) : (
          <div className="grid gap-3">
            {repos.map((repo) => (
              <div key={repo.id} className="group flex items-center justify-between rounded-2xl border border-border bg-card/30 p-5 transition hover:border-primary/50">
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-lg">{repo.name}</h4>
                    <span className="text-[10px] glass px-2 py-0.5 rounded-full uppercase tracking-tighter text-muted-foreground">{repo.visibility}</span>
                    {repo.is_archived && <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full uppercase">Archived</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{repo.description || "No description."}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => onToggleArchive(repo.id, repo.is_archived)} className="glass p-2 rounded-lg hover:text-primary">
                    <Archive className={`h-4 w-4 ${repo.is_archived ? "text-primary" : ""}`} />
                  </button>
                  <button className="glass p-2 rounded-lg hover:text-primary"><Settings className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SettingsView({ org, onSave, isSaving }: { org: any, onSave: (s: any) => void, isSaving: boolean }) {
  const [settings, setSettings] = useState(org.organization_settings?.[0] || {
    visibility: 'INTERNAL',
    allow_forks: true,
    allow_templates: true,
    public_visibility: 'INTERNAL',
    internal_visibility: 'INTERNAL',
    private_visibility: 'PRIVATE',
    fork_visibility: 'PUBLIC',
    template_visibility: 'INTERNAL'
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="glass rounded-3xl p-8 border border-border">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-6"><Globe className="h-5 w-5 text-primary" /> Organization Visibility</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['PUBLIC', 'INTERNAL', 'PRIVATE'].map((v) => (
            <button
              key={v}
              onClick={() => setSettings({...settings, visibility: v})}
              className={`p-6 rounded-2xl border-2 text-left transition ${settings.visibility === v ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/30"}`}
            >
              <div className="font-bold">{v}</div>
              <p className="text-xs text-muted-foreground mt-2">{v === 'PUBLIC' ? "Visible to everyone." : v === 'INTERNAL' ? "Only members." : "Only admins."}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="glass rounded-3xl p-8 border border-border">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-6"><Shield className="h-5 w-5 text-primary" /> Repository Permissions</h3>
        <div className="space-y-6">
          {[
            { label: "Public Repos", key: "public_visibility" },
            { label: "Internal Repos", key: "internal_visibility" },
            { label: "Private Repos", key: "private_visibility" }
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="font-medium text-sm">{item.label} Default</span>
              <select 
                value={settings[item.key]} 
                onChange={(e) => setSettings({...settings, [item.key]: e.target.value})}
                className="glass rounded-lg px-3 py-2 text-sm outline-none border-border"
              >
                <option value="PUBLIC">Public</option>
                <option value="INTERNAL">Internal</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="glass rounded-3xl p-8 border border-border">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-6"><GitFork className="h-5 w-5 text-primary" /> Forks & Templates</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Allow Forks</div>
              <p className="text-xs text-muted-foreground">Members can fork repositories.</p>
            </div>
            <input type="checkbox" checked={settings.allow_forks} onChange={(e) => setSettings({...settings, allow_forks: e.target.checked})} className="h-5 w-5 accent-primary" />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <div className="font-medium">Allow Templates</div>
              <p className="text-xs text-muted-foreground">Members can use repos as templates.</p>
            </div>
            <input type="checkbox" checked={settings.allow_templates} onChange={(e) => setSettings({...settings, allow_templates: e.target.checked})} className="h-5 w-5 accent-primary" />
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <button 
          disabled={isSaving}
          onClick={() => onSave(settings)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-cosmic px-8 py-3 font-bold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50 transition"
        >
          {isSaving ? "Saving..." : <><Save className="h-4 w-4" /> Save Settings</>}
        </button>
      </div>
    </div>
  );
}
import { getOrganizationRepos, toggleRepoArchive } from "@/lib/organizations.functions";
