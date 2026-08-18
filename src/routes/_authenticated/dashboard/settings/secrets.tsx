import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Shield, Plus, Trash2, Eye, EyeOff, Lock, RefreshCw, Key } from 'lucide-react';
import { getSecrets, createSecret } from '@/lib/secrets.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/dashboard/settings/secrets')({
  component: SecretsPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ['secrets'],
      queryFn: () => getSecrets(),
    });
  },
});

function SecretsPage() {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const secretsQuery = useSuspenseQuery({
    queryKey: ['secrets'],
    queryFn: () => getSecrets(),
  });

  const createSecretFn = useServerFn(createSecret);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) return;

    try {
      await createSecretFn({ data: { name, value } });
      toast.success('Secret created');
      setName('');
      setValue('');
      secretsQuery.refetch();
    } catch {
      toast.error('Failed to create secret');
    }
  };

  const toggleVisibility = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Secrets & Variables</h1>
        <p className="text-muted-foreground mt-1">
          Store sensitive information for your environments with advanced encryption.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Secret</CardTitle>
          <CardDescription>Secrets are encrypted and never stored in plain text.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Variable Name (e.g. DATABASE_URL)" value={name} onChange={e => setName(e.target.value)} />
              <Input type="password" placeholder="Value" value={value} onChange={e => setValue(e.target.value)} />
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" /> Add Secret
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {secretsQuery.data.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Lock className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No secrets stored yet.</p>
            </CardContent>
          </Card>
        ) : (
          secretsQuery.data.map((secret: { id: string; name: string; environment: string; encrypted_value: string }) => (
            <Card key={secret.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium font-mono">{secret.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{secret.environment}</span>
                      <span>•</span>
                      <span className="font-mono">
                        {showValues[secret.id] ? secret.encrypted_value : '••••••••••••'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => toggleVisibility(secret.id)}>
                    {showValues[secret.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
