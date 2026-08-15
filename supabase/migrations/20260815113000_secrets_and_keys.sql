-- Secrets Table
CREATE TABLE public.secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    encrypted_value TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'DEVELOPMENT',
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_rotated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.secrets TO authenticated;
GRANT ALL ON public.secrets TO service_role;

ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own secrets"
ON public.secrets
FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- SSH Keys Table
CREATE TABLE public.ssh_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    public_key TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssh_keys TO authenticated;
GRANT ALL ON public.ssh_keys TO service_role;

ALTER TABLE public.ssh_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ssh keys"
ON public.ssh_keys
FOR ALL
TO authenticated
USING (auth.uid() = user_id);
