import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  LogOut, Trash2, RefreshCw, ShieldAlert, Download, UserPlus,
  ChevronLeft, ChevronRight, Copy, ScrollText, Users, Mail, ArrowUpDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listLeads, deleteLead, checkAdmin, exportLeadsCsv,
  createAdminInvite, listAdminInvites, revokeAdminInvite,
  listAdmins, revokeAdmin, listAuditLog,
} from "@/lib/admin-leads.functions";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  head: () => ({
    meta: [
      { title: "Leads — GitMoon Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadsPanel,
});

type SortCol = "created_at" | "email" | "source";
type Tab = "leads" | "admins" | "audit";

function LeadsPanel() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchAdmin = useServerFn(checkAdmin);
  const fetchLeads = useServerFn(listLeads);
  const removeLead = useServerFn(deleteLead);
  const exportCsv = useServerFn(exportLeadsCsv);
  const createInvite = useServerFn(createAdminInvite);
  const fetchInvites = useServerFn(listAdminInvites);
  const revokeInvite = useServerFn(revokeAdminInvite);
  const fetchAdmins = useServerFn(listAdmins);
  const removeAdmin = useServerFn(revokeAdmin);
  const fetchAudit = useServerFn(listAuditLog);

  const [tab, setTab] = useState<Tab>("leads");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortCol>("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [inviteEmail, setInviteEmail] = useState("");
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const adminQuery = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => fetchAdmin(),
  });
  const isAdmin = adminQuery.data?.isAdmin === true;

  const leadsQuery = useQuery({
    queryKey: ["leads", page, pageSize, sort, order, debouncedQuery],
    queryFn: () =>
      fetchLeads({
        data: { page, pageSize, sort, order, search: debouncedQuery || undefined },
      }),
    enabled: isAdmin && tab === "leads",
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeLead({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const invitesQuery = useQuery({
    queryKey: ["invites"],
    queryFn: () => fetchInvites(),
    enabled: isAdmin && tab === "admins",
  });
  const adminsQuery = useQuery({
    queryKey: ["admins"],
    queryFn: () => fetchAdmins(),
    enabled: isAdmin && tab === "admins",
  });
  const auditQuery = useQuery({
    queryKey: ["audit"],
    queryFn: () => fetchAudit({ data: { limit: 200 } }),
    enabled: isAdmin && tab === "audit",
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => createInvite({ data: { email } }),
    onSuccess: (res) => {
      const url = `${window.location.origin}/accept-invite?token=${res.token}`;
      setLastInviteLink(url);
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
  });
  const revokeInviteMutation = useMutation({
    mutationFn: (id: string) => revokeInvite({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });
  const revokeAdminMutation = useMutation({
    mutationFn: (userId: string) => removeAdmin({ data: { userId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admins"] }),
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const onExport = async () => {
    const { csv } = await exportCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gitmoon-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (col: SortCol) => {
    if (sort === col) setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSort(col);
      setOrder("desc");
    }
    setPage(1);
  };

  const copyInviteLink = async () => {
    if (!lastInviteLink) return;
    await navigator.clipboard.writeText(lastInviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
          Your account isn't in the admin role. Ask an existing admin to send you an invite link.
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

  const totalPages = leadsQuery.data
    ? Math.max(1, Math.ceil(leadsQuery.data.total / pageSize))
    : 1;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Manage leads, admins and audit trail.
          </p>
        </div>
        <button
          onClick={signOut}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/10"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>

      <div className="mt-6 flex gap-1 border-b border-border">
        {([
          ["leads", "Leads", Mail],
          ["admins", "Admins", Users],
          ["audit", "Audit log", ScrollText],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm transition ${
              tab === id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "leads" && (
        <section className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search email or source…"
              className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-border bg-background/60 px-2 py-2 text-sm"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <button
              onClick={() => leadsQuery.refetch()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent/10"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              onClick={onExport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-cosmic px-3 py-2 text-sm text-primary-foreground shadow-glow hover:opacity-90"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <SortableTh label="Email" col="email" sort={sort} order={order} onClick={toggleSort} />
                  <SortableTh label="Source" col="source" sort={sort} order={order} onClick={toggleSort} />
                  <SortableTh label="Received" col="created_at" sort={sort} order={order} onClick={toggleSort} />
                  <th className="px-4 py-3">User agent</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leadsQuery.isLoading && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!leadsQuery.isLoading && (leadsQuery.data?.leads ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No leads.</td></tr>
                )}
                {(leadsQuery.data?.leads ?? []).map((row) => (
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
                        onClick={() => {
                          if (confirm("Delete this lead?")) deleteMutation.mutate(row.id);
                        }}
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

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {leadsQuery.data?.total ?? 0} total · page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === "admins" && (
        <section className="mt-6 space-y-8">
          <div className="rounded-2xl border border-border p-5">
            <h2 className="text-lg font-semibold">Invite a new admin</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate a single-use link (valid 7 days). Send it to the person by email.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!inviteEmail) return;
                inviteMutation.mutate(inviteEmail);
              }}
              className="mt-4 flex flex-wrap gap-2"
            >
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="person@company.com"
                className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={inviteMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-cosmic px-4 py-2 text-sm text-primary-foreground shadow-glow disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" /> Create invite
              </button>
            </form>
            {lastInviteLink && (
              <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
                <p className="text-xs text-muted-foreground">Invite link (copy and send now — shown only once):</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-background/60 px-2 py-1.5 text-xs">
                    {lastInviteLink}
                  </code>
                  <button
                    onClick={copyInviteLink}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-accent/10"
                  >
                    <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold">Pending invites</h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(invitesQuery.data?.invites ?? []).length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No invites.</td></tr>
                  )}
                  {(invitesQuery.data?.invites ?? []).map((inv) => {
                    const status = inv.accepted_at
                      ? "Accepted"
                      : inv.revoked_at
                        ? "Revoked"
                        : new Date(inv.expires_at) < new Date()
                          ? "Expired"
                          : "Pending";
                    return (
                      <tr key={inv.id} className="border-t border-border/60">
                        <td className="px-4 py-3 font-medium">{inv.email}</td>
                        <td className="px-4 py-3 text-muted-foreground">{status}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(inv.expires_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {status === "Pending" && (
                            <button
                              onClick={() => revokeInviteMutation.mutate(inv.id)}
                              className="text-xs text-destructive hover:underline"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Current admins</h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Since</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(adminsQuery.data?.admins ?? []).map((a) => (
                    <tr key={a.id} className="border-t border-border/60">
                      <td className="px-4 py-3 font-medium">{a.email ?? a.id}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Revoke admin from ${a.email ?? a.id}?`))
                              revokeAdminMutation.mutate(a.id);
                          }}
                          className="text-xs text-destructive hover:underline"
                        >
                          Revoke admin
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === "audit" && (
        <section className="mt-6">
          <div className="overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {(auditQuery.data?.entries ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No entries.</td></tr>
                )}
                {(auditQuery.data?.entries ?? []).map((e) => (
                  <tr key={e.id} className="border-t border-border/60 align-top">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {e.target_type ? `${e.target_type}:${e.target_id ?? "—"}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <code className="text-muted-foreground">{JSON.stringify(e.metadata)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function SortableTh({
  label, col, sort, order, onClick,
}: {
  label: string;
  col: SortCol;
  sort: SortCol;
  order: "asc" | "desc";
  onClick: (c: SortCol) => void;
}) {
  const active = sort === col;
  return (
    <th className="px-4 py-3">
      <button
        onClick={() => onClick(col)}
        className={`inline-flex items-center gap-1 uppercase ${active ? "text-foreground" : ""}`}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
        {active && <span className="text-[10px]">{order === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}