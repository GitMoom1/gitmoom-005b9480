const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        O checkout de produção ainda não está configurado. Conclua a ativação de pagamentos para
        receber de verdade.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-accent/40 bg-accent/10 px-4 py-2 text-center text-sm text-foreground">
        Todos os pagamentos feitos no preview estão em modo de teste.{" "}
        <a
          href="https://docs.lovable.dev/features/payments#test-and-live-environments"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline"
        >
          Saiba mais
        </a>
      </div>
    );
  }
  return null;
}