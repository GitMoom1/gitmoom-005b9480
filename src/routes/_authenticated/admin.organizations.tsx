import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Building2, Plus, ArrowRightLeft, ShieldCheck, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createOrganization, transferRepository } from "@/lib/organizations.functions";

export const Route = createFileRoute("/_authenticated/admin/organizations")({
  component: OrganizationsPanel,
});

function OrganizationsPanel() {
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const createOrg = useServerFn(createOrganization);
  const transferRepo = useServerFn(transferRepository);

  const { data: orgs, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("organizations").select("*");
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; slug: string }) => createOrg({ data }),
    onSuccess: () => {
      setNewOrgName("");
      setNewOrgSlug("");
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
        <p className="text-muted-foreground">Manage your teams and shared repositories.</p>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        <section className="space-y-6">
          <div className="grid gap-4">
            {isLoading ? (
              <div className="p-8 text-center glass rounded-2xl">Loading...</div>
            ) : orgs?.length === 0 ? (
              <div className="p-12 text-center glass rounded-2xl border-dashed border-2">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No organizations yet</h3>
                <p className="text-sm text-muted-foreground">Create one to start collaborating.</p>
              </div>
            ) : (
              orgs?.map((org: any) => (
                <div key={org.id} className="flex items-center justify-between p-6 glass rounded-2xl border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{org.name}</h3>
                      <p className="text-sm text-muted-foreground">/{org.slug}</p>
                    </div>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent/10">
                    <ArrowRightLeft className="h-4 w-4" /> Transfer
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="p-6 glass rounded-2xl border border-primary/20">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Plus className="h-4 w-4 text-primary" /> Create New
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({ name: newOrgName, slug: newOrgSlug });
            }} className="space-y-3">
              <input
                placeholder="Org Name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
              />
              <input
                placeholder="slug-name"
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value)}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Create
              </button>
            </form>
          </div>

          <div className="p-6 glass rounded-2xl border border-accent/20">
            <h3 className="font-semibold flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-accent" /> Plan Limit
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Transferring repositories between accounts or organizations requires a 
              <span className="text-foreground font-medium"> paid plan</span>.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[10px] text-accent uppercase tracking-wider font-bold">
              <Zap className="h-3 w-3" /> Orbit: No Transfer
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
