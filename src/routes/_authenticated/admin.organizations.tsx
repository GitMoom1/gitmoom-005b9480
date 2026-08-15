import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { 
  Building2, Plus, ArrowRightLeft, 
  ShieldCheck, Zap, ExternalLink, 
  MoreHorizontal, Users as UsersIcon,
  Search, Crown, AlertTriangle
} from "lucide-react";
import { createOrganization, transferRepository } from "@/lib/organizations.functions";

export const Route = createFileRoute("/_authenticated/admin/organizations")({
  component: OrganizationsPanel,
});

function OrganizationsPanel() {
  const [user, setUser] = useState<any>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const createOrg = useServerFn(createOrganization);
  const transferRepo = useServerFn(transferRepository);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const { data: orgs, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("organizations").select(`
        *,
        repositories(count),
        organization_members(count)
      `);
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; slug: string }) => createOrg({ data }),
    onSuccess: () => {
      setNewOrgName("");
      setNewOrgSlug("");
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <DashboardHeader user={user} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-8">
          <DashboardSidebar user={user} activeTab="organizations" />

          <main className="flex-1 space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your teams, members and cross-org repository transfers.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {}} 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition shadow-glow"
                >
                  <Plus className="h-4 w-4" />
                  New Organization
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search organizations..." 
                    className="w-full pl-10 pr-4 py-2 bg-accent/20 border border-border/50 rounded-lg text-sm focus:border-primary outline-none"
                  />
                </div>

                <div className="space-y-4">
                  {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-32 w-full animate-pulse bg-accent/20 rounded-2xl border border-border/50" />
                    ))
                  ) : orgs?.length === 0 ? (
                    <div className="p-16 text-center glass rounded-2xl border-dashed border-2 border-border/50">
                      <Building2 className="mx-auto h-16 w-16 text-muted-foreground/30" />
                      <h3 className="mt-6 text-xl font-bold">Start your first team</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-2">
                        Organizations help you collaborate on projects and manage permissions at scale.
                      </p>
                      <button className="mt-8 text-primary font-bold flex items-center gap-2 mx-auto hover:underline">
                        Create an organization <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    orgs?.map((org: any) => (
                      <div key={org.id} className="group p-6 glass rounded-2xl border border-border/50 hover:border-primary/50 transition-all duration-300">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-5">
                            <div className="h-16 w-16 rounded-2xl bg-gradient-cosmic flex items-center justify-center text-primary-foreground text-3xl font-black shadow-soft group-hover:shadow-glow transition-shadow">
                              {org.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{org.name}</h3>
                                {org.plan === 'pro' && (
                                  <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1 font-bold">
                                    <Crown className="h-3 w-3" /> PRO
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">gitmoon.app/{org.slug}</p>
                              <div className="flex items-center gap-4 pt-2">
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <UsersIcon className="h-3.5 w-3.5" />
                                  {org.organization_members?.[0]?.count || 0} members
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Book className="h-3.5 w-3.5" />
                                  {org.repositories?.[0]?.count || 0} repos
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent/30 border border-border/50 px-4 py-2 text-sm font-semibold hover:bg-accent/50 transition group/btn">
                              <ExternalLink className="h-4 w-4 group-hover/btn:scale-110 transition-transform" /> Manage
                            </button>
                            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary/10 text-primary border border-primary/20 px-4 py-2 text-sm font-bold hover:bg-primary/20 transition group/btn">
                              <ArrowRightLeft className="h-4 w-4 group-hover/btn:rotate-180 transition-transform duration-500" /> Transfer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <aside className="space-y-6">
                <div className="p-6 glass rounded-2xl border border-primary/20 shadow-soft">
                  <h3 className="font-bold flex items-center gap-2 mb-6 text-primary">
                    <Plus className="h-5 w-5" /> Quick Create
                  </h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    createMutation.mutate({ name: newOrgName, slug: newOrgSlug });
                  }} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Org Name</label>
                      <input
                        placeholder="Engineering Team"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2.5 text-sm focus:border-primary outline-none transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Slug URL</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">/</span>
                        <input
                          placeholder="eng-team"
                          value={newOrgSlug}
                          onChange={(e) => setNewOrgSlug(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background/60 pl-6 pr-3 py-2.5 text-sm focus:border-primary outline-none transition"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="w-full rounded-lg bg-primary py-3 text-sm font-black text-primary-foreground hover:opacity-90 transition shadow-glow disabled:opacity-50"
                    >
                      {createMutation.isPending ? "CREATING..." : "CREATE ORGANIZATION"}
                    </button>
                  </form>
                </div>

                <div className="p-6 glass rounded-2xl border border-accent/20 shadow-soft overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <ShieldCheck className="h-20 w-20" />
                  </div>
                  <h3 className="font-bold flex items-center gap-2 mb-3 text-accent relative z-10">
                    <ShieldCheck className="h-5 w-5" /> Safety First
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed relative z-10">
                    Repository transfer is a <span className="text-foreground font-bold">Paid Feature</span>.
                    This prevents spam and unauthorized migrations across the GitMoon network.
                  </p>
                  
                  <div className="mt-6 p-3 rounded-xl bg-accent/10 border border-accent/20 relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Orbit Tier</span>
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-accent font-black">
                      <Zap className="h-3 w-3 fill-current" /> TRANSFERS BLOCKED
                    </div>
                  </div>

                  <button className="mt-6 w-full py-2.5 rounded-lg border border-primary/50 text-primary text-xs font-black hover:bg-primary/10 transition uppercase tracking-widest">
                    Compare Plans
                  </button>
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
