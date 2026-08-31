import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({
    meta: [
      { title: "Pagamento concluído — GitMoon" },
      {
        name: "description",
        content: "Confirmação da assinatura GitMoon e próximos passos para começar a usar a plataforma.",
      },
      { property: "og:title", content: "Pagamento concluído — GitMoon" },
      {
        property: "og:description",
        content: "Sua assinatura GitMoon foi processada. Veja os próximos passos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      {sessionId ? (
        <>
          <CheckCircle2 className="h-12 w-12 text-accent" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Pagamento concluído</h1>
          <p className="mt-3 text-muted-foreground">
            Sua assinatura foi processada. Os tokens do plano são creditados na sua conta em alguns
            segundos e somam ao saldo que você já tinha.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Referência: {sessionId}</p>
        </>
      ) : (
        <>
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Pagamento não encontrado</h1>
          <p className="mt-3 text-muted-foreground">
            Não encontramos informações desse pagamento. Se você concluiu uma compra, verifique seu
            e-mail de confirmação.
          </p>
        </>
      )}
      <Link
        to="/"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-cosmic px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      >
        Voltar para o início
      </Link>
    </main>
  );
}