import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Github, Plus, ExternalLink, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { listIntegrations, createIntegration } from '@/lib/integrations.functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/dashboard/settings/integrations')({
  component: IntegrationsPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ['integrations'],
      queryFn: () => listIntegrations(),
    });
  },
});

function IntegrationsPage() {
  const integrationsQuery = useSuspenseQuery({
    queryKey: ['integrations'],
    queryFn: () => listIntegrations(),
  });

  const createIntegrationFn = useServerFn(createIntegration);

  const handleConnectGithub = async () => {
    // In a real OAuth flow, this would redirect to GitHub
    toast.info("Connecting to GitHub...");
    try {
      await createIntegrationFn({
        data: {
          name: "GitHub Organization",
          type: "GITHUB",
          config: { org: "gitmoon-demo" }
        }
      });
      integrationsQuery.refetch();
      toast.success("GitHub connected successfully!");
    } catch {
      toast.error("Failed to connect GitHub");
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect GitMoon to your favorite developer tools and platforms.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Github className="h-24 w-24" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              GitHub
            </CardTitle>
            <CardDescription>
              Sync repositories, automate PR reviews, and trigger CI/CD pipelines.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnectGithub} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Connect GitHub
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-60 grayscale cursor-not-allowed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              GitLab
            </CardTitle>
            <CardDescription>
              Enterprise-grade git workflow integration. (Coming Soon)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled className="w-full" variant="outline">
              Notify Me
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Connections</h2>
        {integrationsQuery.data.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No active integrations found.</p>
              <p className="text-xs mt-1">Connect a service above to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {integrationsQuery.data.map((int: { id: string; type: string; name: string; created_at: string }) => (
              <Card key={int.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      {int.type === 'GITHUB' ? <Github className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="font-medium">{int.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{int.type}</span>
                        <span>•</span>
                        <span className="text-secondary">Connected {new Date(int.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">Settings</Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">Disconnect</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="border-accent/20 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent" />
            Security Notice
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            GitMoon uses fine-grained permissions when connecting to your third-party accounts. 
            We only request the minimum access required to perform automated tasks. You can revoke 
            access at any time from both GitMoon and the provider's security settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
