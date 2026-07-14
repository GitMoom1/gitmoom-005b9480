import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { acceptAdminInvite } from "@/lib/admin-leads.functions";

const search = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Accept admin invite — GitMoon" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcceptInvite,
});

function AcceptInvite() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const accept = useServerFn(acceptAdminInvite);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!token) {
        setState("error");
        setMsg("Missing invite token.");
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", search: { redirect: `/accept-invite?token=${token}` } as never });
        return;
      }
      setState("loading");
      try {
        const res = await accept({ data: { token } });
        if (res.ok) {
          setState("ok");
          setMsg("You now have admin access.");
        } else {
          setState("error");
          setMsg(res.error ?? "Invite is not valid.");
        }
      } catch (e) {
        setState("error");
        setMsg("Failed to accept invite.");
      }
    })();
  }, [token, accept, navigate]);

  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Admin invite</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {state === "loading" && "Accepting invite…"}
        {state === "ok" && msg}
        {state === "error" && msg}
        {state === "idle" && "Preparing…"}
      </p>
      {state === "ok" && (
        <Link
          to="/admin/leads"
          className="mt-6 inline-flex rounded-full bg-gradient-cosmic px-4 py-2 text-sm text-primary-foreground"
        >
          Go to admin panel
        </Link>
      )}
    </div>
  );
}