-- Git Core + AI Engine schema

CREATE OR REPLACE FUNCTION public.is_repo_readable(_repo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.repositories r
    WHERE r.id = _repo_id
      AND (
        r.visibility = 'PUBLIC'
        OR r.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = r.organization_id
            AND om.user_id = auth.uid()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_repo_writable(_repo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.repositories r
    WHERE r.id = _repo_id
      AND (
        r.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = r.organization_id
            AND om.user_id = auth.uid()
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_repo_readable(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_repo_writable(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_repo_readable(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_repo_writable(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS default_branch TEXT NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS storage_prefix TEXT,
  ADD COLUMN IF NOT EXISTS star_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  head_sha TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_protected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repository_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_select" ON public.branches
  FOR SELECT TO authenticated USING (public.is_repo_readable(repository_id));
CREATE POLICY "branches_insert" ON public.branches
  FOR INSERT TO authenticated WITH CHECK (public.is_repo_writable(repository_id));
CREATE POLICY "branches_update" ON public.branches
  FOR UPDATE TO authenticated USING (public.is_repo_writable(repository_id));
CREATE POLICY "branches_delete" ON public.branches
  FOR DELETE TO authenticated USING (public.is_repo_writable(repository_id));

CREATE TABLE IF NOT EXISTS public.commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  sha TEXT NOT NULL,
  parent_sha TEXT,
  branch TEXT NOT NULL DEFAULT 'main',
  message TEXT NOT NULL,
  author_name TEXT,
  author_email TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  files_changed INTEGER NOT NULL DEFAULT 0,
  additions INTEGER NOT NULL DEFAULT 0,
  deletions INTEGER NOT NULL DEFAULT 0,
  committed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repository_id, sha)
);

CREATE INDEX IF NOT EXISTS idx_commits_repo_branch ON public.commits(repository_id, branch, committed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commits TO authenticated;
GRANT ALL ON public.commits TO service_role;
ALTER TABLE public.commits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commits_select" ON public.commits
  FOR SELECT TO authenticated USING (public.is_repo_readable(repository_id));
CREATE POLICY "commits_insert" ON public.commits
  FOR INSERT TO authenticated WITH CHECK (public.is_repo_writable(repository_id));
CREATE POLICY "commits_delete" ON public.commits
  FOR DELETE TO authenticated USING (public.is_repo_writable(repository_id));

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_sha TEXT,
  message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repository_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select" ON public.tags
  FOR SELECT TO authenticated USING (public.is_repo_readable(repository_id));
CREATE POLICY "tags_insert" ON public.tags
  FOR INSERT TO authenticated WITH CHECK (public.is_repo_writable(repository_id));
CREATE POLICY "tags_delete" ON public.tags
  FOR DELETE TO authenticated USING (public.is_repo_writable(repository_id));

CREATE TABLE IF NOT EXISTS public.releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  is_prerelease BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.releases TO authenticated;
GRANT ALL ON public.releases TO service_role;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "releases_select" ON public.releases
  FOR SELECT TO authenticated USING (public.is_repo_readable(repository_id));
CREATE POLICY "releases_insert" ON public.releases
  FOR INSERT TO authenticated WITH CHECK (public.is_repo_writable(repository_id));
CREATE POLICY "releases_update" ON public.releases
  FOR UPDATE TO authenticated USING (public.is_repo_writable(repository_id));
CREATE POLICY "releases_delete" ON public.releases
  FOR DELETE TO authenticated USING (public.is_repo_writable(repository_id));

CREATE TABLE IF NOT EXISTS public.git_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'OBJECT',
  sha TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  engine TEXT NOT NULL DEFAULT 'metadata-only',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_git_objects_repo ON public.git_objects(repository_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.git_objects TO authenticated;
GRANT ALL ON public.git_objects TO service_role;
ALTER TABLE public.git_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "git_objects_select" ON public.git_objects
  FOR SELECT TO authenticated USING (public.is_repo_readable(repository_id));
CREATE POLICY "git_objects_insert" ON public.git_objects
  FOR INSERT TO authenticated WITH CHECK (public.is_repo_writable(repository_id));

CREATE TABLE IF NOT EXISTS public.repository_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repository_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.repository_stars TO authenticated;
GRANT ALL ON public.repository_stars TO service_role;
ALTER TABLE public.repository_stars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stars_select" ON public.repository_stars
  FOR SELECT TO authenticated USING (public.is_repo_readable(repository_id));
CREATE POLICY "stars_insert" ON public.repository_stars
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_repo_readable(repository_id));
CREATE POLICY "stars_delete" ON public.repository_stars
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_repository_star_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.repositories SET star_count = star_count + 1 WHERE id = NEW.repository_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.repositories SET star_count = GREATEST(star_count - 1, 0) WHERE id = OLD.repository_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_star_count ON public.repository_stars;
CREATE TRIGGER trg_star_count
AFTER INSERT OR DELETE ON public.repository_stars
FOR EACH ROW EXECUTE FUNCTION public.sync_repository_star_count();

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES public.repositories(id) ON DELETE SET NULL,
  commit_sha TEXT,
  action_type TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month ON public.ai_usage(user_id, created_at);

GRANT SELECT, INSERT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_select_own" ON public.ai_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ai_usage_insert_own" ON public.ai_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.commit_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  commit_sha TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  summary TEXT,
  result TEXT,
  model TEXT,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commit_reviews_repo ON public.commit_reviews(repository_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.commit_reviews TO authenticated;
GRANT ALL ON public.commit_reviews TO service_role;
ALTER TABLE public.commit_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commit_reviews_select" ON public.commit_reviews
  FOR SELECT TO authenticated USING (public.is_repo_readable(repository_id));
CREATE POLICY "commit_reviews_insert" ON public.commit_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_repo_writable(repository_id));
CREATE POLICY "commit_reviews_delete" ON public.commit_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_repositories_updated_at ON public.repositories;
CREATE TRIGGER trg_repositories_updated_at BEFORE UPDATE ON public.repositories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_branches_updated_at ON public.branches;
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_releases_updated_at ON public.releases;
CREATE TRIGGER trg_releases_updated_at BEFORE UPDATE ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();