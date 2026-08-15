import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Key, Plus, Trash2, Shield, Info, Clipboard } from 'lucide-react';
import { getSSHKeys, addSSHKey } from '@/lib/keys.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/dashboard/settings/keys')({
  component: KeysPage,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ['ssh-keys'],
      queryFn: () => getSSHKeys(),
    });
  },
});

function KeysPage() {
  const [name, setName] = useState('');
  const [publicKey, setPublicKey] = useState('');

  const keysQuery = useSuspenseQuery({
    queryKey: ['ssh-keys'],
    queryFn: () => getSSHKeys(),
  });

  const addKeyFn = useServerFn(addSSHKey);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !publicKey) return;

    try {
      await addKeyFn({ data: { name, publicKey } });
      toast.success('SSH Key added');
      setName('');
      setPublicKey('');
      keysQuery.refetch();
    } catch (error) {
      toast.error('Failed to add SSH key');
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SSH & GPG Keys</h1>
        <p className="text-muted-foreground mt-1">
          Manage your public keys to securely interact with GitMoon via CLI and Git.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New SSH Key</CardTitle>
          <CardDescription>Paste your public key below to link it to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input placeholder="Title (e.g. MacBook Pro)" value={name} onChange={e => setName(e.target.value)} />
            <Textarea 
              placeholder="Begins with 'ssh-rsa', 'ssh-ed25519', etc." 
              className="font-mono text-xs"
              value={publicKey} 
              onChange={e => setPublicKey(e.target.value)} 
            />
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" /> Add Key
            </li>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {keysQuery.data.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Key className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p>No SSH keys found.</p>
            </CardContent>
          </Card>
        ) : (
          keysQuery.data.map((key: any) => (
            <Card key={key.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">{key.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {key.fingerprint}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => {
                    navigator.clipboard.writeText(key.public_key);
                    toast.success('Public key copied');
                  }}>
                    <Clipboard className="h-4 w-4" />
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
