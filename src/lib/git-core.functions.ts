import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export interface Repository {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: string;
  default_branch: string;
  language: string | null;
  stars_count: number;
  forks_count: number;
  size_kb: number;
  is_archived: boolean;
  organization_id: string | null;
  user_id: string | null;
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  repository_id: string;
  name: string;
  head_sha: string | null;
  is_default: boolean;
  is_protected: boolean;
  updated_at: string;
}

export interface Commit {
  id: string;
  repository_id: string;
  sha: string;
  parent_sha: string | null;
  branch: string;
  message: string;
  author_name: string;
  author_email: string | null;
  files_changed: number;
  additions: number;
  deletions: number;
  committed_at: string;
}

export interface Tag {
  id: string;
  repository_id: string;
  name: string;
  target_sha: string | null;
  message: string | null;
  created_at: string;
}

export interface Release {
  id: string;
  repository_id: string;
  tag_name: string;
  title: string;
  notes: string | null;
  is_prerelease: boolean;
  is_draft: boolean;
  published_at: string | null;
  created_at: string;
}

export interface GitObject {
  id: string;
  repository_id: string;
  kind: string;
  sha: string | null;
  storage_path: string;
  size_bytes: number;
  engine: string;
  created_at: string;
}

export interface RepositoryDetail {
  repository: Repository | null;
  branches: Branch[];
  commits: Commit[];
  tags: Tag[];
  releases: Release[];
  objects: GitObject[];
  starred: boolean;
  error: string | null;
}

export const listRepositories = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ repositories: Repository[]; error: string | null }> => {
    const db = context.supabase as any;
    const { data, error } = await db
      .from('repositories')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) return { repositories: [], error: error.message };
    return { repositories: (data ?? []) as Repository[], error: null };
  });

export const createRepository = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        visibility: z.enum(['PUBLIC', 'PRIVATE', 'INTERNAL']).default('PRIVATE'),
        defaultBranch: z.string().min(1).max(60).default('main'),
        language: z.string().max(40).optional(),
        organizationId: z.string().uuid().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<Repository> => {
    const { slugify, storagePrefixFor } = await import('./git-core.server');
    const db = context.supabase as any;
    const slug = slugify(data.name);
    if (!slug) throw new Error('Nome de repositório inválido.');

    const { data: repo, error } = await db
      .from('repositories')
      .insert({
        name: data.name,
        slug,
        description: data.description ?? null,
        visibility: data.visibility,
        default_branch: data.defaultBranch,
        language: data.language ?? null,
        user_id: data.organizationId ? null : context.userId,
        organization_id: data.organizationId ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await db
      .from('repositories')
      .update({ storage_prefix: storagePrefixFor(repo.id) })
      .eq('id', repo.id);

    await db.from('branches').insert({
      repository_id: repo.id,
      name: data.defaultBranch,
      is_default: true,
    });

    return repo as Repository;
  });

export const deleteRepository = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ repositoryId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { error } = await db.from('repositories').delete().eq('id', data.repositoryId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getRepositoryDetail = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ repositoryId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<RepositoryDetail> => {
    const db = context.supabase as any;
    const id = data.repositoryId;

    const [repo, branches, commits, tags, releases, objects, star] = await Promise.all([
      db.from('repositories').select('*').eq('id', id).maybeSingle(),
      db.from('branches').select('*').eq('repository_id', id).order('name'),
      db
        .from('commits')
        .select('*')
        .eq('repository_id', id)
        .order('committed_at', { ascending: false })
        .limit(50),
      db.from('tags').select('*').eq('repository_id', id).order('created_at', { ascending: false }),
      db
        .from('releases')
        .select('*')
        .eq('repository_id', id)
        .order('created_at', { ascending: false }),
      db
        .from('git_objects')
        .select('*')
        .eq('repository_id', id)
        .order('created_at', { ascending: false })
        .limit(30),
      db
        .from('repository_stars')
        .select('id')
        .eq('repository_id', id)
        .eq('user_id', context.userId)
        .maybeSingle(),
    ]);

    return {
      repository: (repo.data ?? null) as Repository | null,
      branches: (branches.data ?? []) as Branch[],
      commits: (commits.data ?? []) as Commit[],
      tags: (tags.data ?? []) as Tag[],
      releases: (releases.data ?? []) as Release[],
      objects: (objects.data ?? []) as GitObject[],
      starred: Boolean(star.data),
      error: repo.error?.message ?? null,
    };
  });

export const createBranch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        repositoryId: z.string().uuid(),
        name: z.string().min(1).max(120),
        fromSha: z.string().optional(),
        isProtected: z.boolean().default(false),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<Branch> => {
    const db = context.supabase as any;
    const { data: branch, error } = await db
      .from('branches')
      .insert({
        repository_id: data.repositoryId,
        name: data.name,
        head_sha: data.fromSha ?? null,
        is_protected: data.isProtected,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return branch as Branch;
  });

export const deleteBranch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ branchId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { error } = await db
      .from('branches')
      .delete()
      .eq('id', data.branchId)
      .eq('is_default', false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const pushCommit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        repositoryId: z.string().uuid(),
        branch: z.string().min(1).max(120),
        message: z.string().min(1).max(2000),
        filesChanged: z.number().int().min(0).max(100000).default(1),
        additions: z.number().int().min(0).max(1000000).default(0),
        deletions: z.number().int().min(0).max(1000000).default(0),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<Commit> => {
    const { computeCommitSha, pushGitObject } = await import('./git-core.server');
    const db = context.supabase as any;

    const { data: parent } = await db
      .from('commits')
      .select('sha')
      .eq('repository_id', data.repositoryId)
      .eq('branch', data.branch)
      .order('committed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const email = (context.claims as { email?: string } | null)?.email ?? null;
    const sha = computeCommitSha({
      repositoryId: data.repositoryId,
      branch: data.branch,
      message: data.message,
      parentSha: parent?.sha ?? null,
      authorEmail: email,
    });

    const { data: commit, error } = await db
      .from('commits')
      .insert({
        repository_id: data.repositoryId,
        sha,
        parent_sha: parent?.sha ?? null,
        branch: data.branch,
        message: data.message,
        author_name: email?.split('@')[0] ?? 'gitmoom-user',
        author_email: email,
        author_id: context.userId,
        files_changed: data.filesChanged,
        additions: data.additions,
        deletions: data.deletions,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const object = await pushGitObject({
      repositoryId: data.repositoryId,
      kind: 'OBJECT',
      sha,
      metadata: { branch: data.branch, message: data.message },
    });

    await db.from('git_objects').insert({
      repository_id: data.repositoryId,
      kind: object.kind,
      sha: object.sha,
      storage_path: object.storagePath,
      size_bytes: object.sizeBytes,
      engine: object.engine,
      metadata: object.metadata,
    });

    return commit as Commit;
  });

export const createTag = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        repositoryId: z.string().uuid(),
        name: z.string().min(1).max(120),
        targetSha: z.string().optional(),
        message: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<Tag> => {
    const db = context.supabase as any;
    const { data: tag, error } = await db
      .from('tags')
      .insert({
        repository_id: data.repositoryId,
        name: data.name,
        target_sha: data.targetSha ?? null,
        message: data.message ?? null,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return tag as Tag;
  });

export const createRelease = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        repositoryId: z.string().uuid(),
        tagName: z.string().min(1).max(120),
        title: z.string().min(1).max(200),
        notes: z.string().max(20000).optional(),
        isPrerelease: z.boolean().default(false),
        isDraft: z.boolean().default(false),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<Release> => {
    const { pushGitObject } = await import('./git-core.server');
    const db = context.supabase as any;

    const { data: release, error } = await db
      .from('releases')
      .insert({
        repository_id: data.repositoryId,
        tag_name: data.tagName,
        title: data.title,
        notes: data.notes ?? null,
        is_prerelease: data.isPrerelease,
        is_draft: data.isDraft,
        published_at: data.isDraft ? null : new Date().toISOString(),
        created_by: context.userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (!data.isDraft) {
      const snapshot = await pushGitObject({
        repositoryId: data.repositoryId,
        kind: 'SNAPSHOT',
        sha: `release-${data.tagName}`,
        metadata: { tag: data.tagName, title: data.title },
      });
      await db.from('git_objects').insert({
        repository_id: data.repositoryId,
        kind: snapshot.kind,
        sha: snapshot.sha,
        storage_path: snapshot.storagePath,
        size_bytes: snapshot.sizeBytes,
        engine: snapshot.engine,
        metadata: snapshot.metadata,
      });
    }

    return release as Release;
  });

export const toggleStar = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ repositoryId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ starred: boolean }> => {
    const db = context.supabase as any;
    const { data: existing } = await db
      .from('repository_stars')
      .select('id')
      .eq('repository_id', data.repositoryId)
      .eq('user_id', context.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await db.from('repository_stars').delete().eq('id', existing.id);
      if (error) throw new Error(error.message);
      return { starred: false };
    }

    const { error } = await db
      .from('repository_stars')
      .insert({ repository_id: data.repositoryId, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { starred: true };
  });
