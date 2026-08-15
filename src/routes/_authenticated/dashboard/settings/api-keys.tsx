import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Key, Plus, Trash2, Copy, Shield, Globe, Terminal, Check, Info } from 'lucide-react';
import { listApiKeys, createApiKey, revokeApiKey } from '@/lib/api-keys.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/dashboard/settings/api-keys')({
  component: ApiKeysPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ['api-keys'],
      queryFn: () => listApiKeys(),
    });
  },
});

function ApiKeysPage() {
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const keysQuery = useSuspenseQuery({
    queryKey: ['api-keys'],
    queryFn: () => listApiKeys(),
  });

  const createKeyFn = useServerFn(createApiKey);
  const revokeKeyFn = useServerFn(revokeApiKey);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsCreating(true);
    try {
      const result = await createKeyFn({ data: { name: newKeyName } });
      setGeneratedKey(result.rawKey);
      setNewKeyName('');
      keysQuery.refetch();
      toast.success('API key created successfully');
    } catch (error) {
      toast.error('Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await revokeKeyFn({ data: { id } });
      keysQuery.refetch();
      toast.success('API key revoked');
    } catch (error) {
      toast.error('Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
        <p className="text-muted-foreground mt-1">
          Manage your API keys to integrate GitMoon with your own applications and tools.
        </p>
      </div>

      {generatedKey && (
        <Card className="border-secondary bg-secondary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-secondary">
              <Shield className="h-5 w-5" />
              New API Key Generated
            </CardTitle>
            <CardDescription>
              Copy this key now. For security reasons, it won't be shown again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <code className="flex-1 bg-background p-3 rounded-lg border font-mono text-sm break-all">
                {generatedKey}
              </code>
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(generatedKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => setGeneratedKey(null)}>
              I've saved this key
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create New Key</CardTitle>
          <CardDescription>Give your key a descriptive name to remember its purpose.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateKey} className="flex gap-4">
            <Input
              placeholder="e.g. CI/CD Runner"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              disabled={isCreating}
            />
            <Button type="submit" disabled={isCreating || !newKeyName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Key
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Keys</h2>
        {keysQuery.data.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>You don't have any active API keys yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {keysQuery.data.map((key: any) => (
              <Card key={key.id} className={key.status === 'REVOKED' ? 'opacity-50' : ''}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      {key.status === 'ACTIVE' && (
                        <span className="bg-secondary/20 text-secondary text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                      <span>{key.key_preview}</span>
                      <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRevokeKey(key.id)}
                    disabled={key.status === 'REVOKED'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Usage Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            <p>
              Include your API key in the <code>Authorization</code> header as a Bearer token:
            </p>
            <pre className="bg-muted p-3 rounded-lg font-mono text-xs">
              Authorization: Bearer gitmoom_your_key_here
            </pre>
            <div className="flex items-start gap-2 text-muted-foreground text-xs italic">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Keys expire in 12 months by default unless a custom expiry is set.</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Test Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="mb-4">Use curl to verify your API key is working correctly:</p>
            <pre className="bg-muted p-3 rounded-lg font-mono text-xs overflow-x-auto">
{`curl -X GET https://gitmoom.app/api/v1/user \\
  -H "Authorization: Bearer gitmoom_your_key_here"`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
