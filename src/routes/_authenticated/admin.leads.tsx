import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Trash2, RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listLeads, deleteLead, checkAdmin } from "@/lib/admin-leads.functions";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  head: () => ({
    meta: [
      { title: "Leads — GitMoon Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadsPanel,
});

function LeadsPanel() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchAdmin = useServerFn(checkAdmin);
  const fetchLeads = useServerFn(listLeads);
  const removeLead = useServerFn(deleteLead);
  const [query, setQuery] = useState("");

  const adminQuery = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => fetchAdmin(),
  });

  const isAdmin = adminQuery.data?.isAdmin === true;

  const leadsQuery = useQuery({
    queryKey: ["leads"],
    queryFn: () => fetchLeads({ data: { limit: 500 } }),
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeLead({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const filtered = useMemo(() => {
    const rows = leadsQuery.data?.leads ?? [];
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        (r.source ?? "").toLowerCase().includes(q),
    );
  }, [leadsQuery.data, query]);

  useEffect(() => {
    // Refetch admin check on sign-in changes
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (adminQuery.isLoading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account isn't in the admin role. Ask an existing admin to grant you access, or use
          the database to insert a row into <code>user_roles</code> with role <code>admin</code>{" "}
          for your user id.
        </p>
        <button
          onClick={signOut}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-accent/10"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {leadsQuery.data?.leads.length ?? 0} total · showing {filtered.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search email or source…"
            className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            onClick={() => leadsQuery.refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/10"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/10"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">User agent</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leadsQuery.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Loading leads…
                </td>
              </tr>
            )}
            {!leadsQuery.isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No leads yet.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-border/60">
                <td className="px-4 py-3 font-medium">{row.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.source ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="max-w-[280px] truncate px-4 py-3 text-xs text-muted-foreground">
                  {row.user_agent ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => deleteMutation.mutate(row.id)}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}