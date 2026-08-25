/**
 * GitMoom Git Core — server-only helpers.
 *
 * Hybrid runtime: metadata (repos, branches, commits, tags, releases) lives in the
 * app database; Git objects / backups / snapshots live in the KUBO storage engine.
 * When the engine is not configured, object indexing degrades gracefully and the
 * Git Core metadata keeps working.
 */

import { createHash, randomBytes } from 'crypto';

export interface GitObjectRecord {
  kind: 'OBJECT' | 'BACKUP' | 'SNAPSHOT';
  sha: string;
  storagePath: string;
  sizeBytes: number;
  engine: string;
  metadata: Record<string, unknown>;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/** Deterministic 40-char hex sha, same shape as a Git object id. */
export function computeCommitSha(input: {
  repositoryId: string;
  branch: string;
  message: string;
  parentSha?: string | null;
  authorEmail?: string | null;
}): string {
  const payload = [
    input.repositoryId,
    input.branch,
    input.parentSha ?? '',
    input.authorEmail ?? '',
    input.message,
    Date.now().toString(),
    randomBytes(8).toString('hex'),
  ].join('\n');
  return createHash('sha1').update(payload).digest('hex');
}

export function storagePrefixFor(repositoryId: string): string {
  return `git/${repositoryId}`;
}

export function isStorageEngineConfigured(): boolean {
  return Boolean(process.env['KUBO_STORAGE_API_URL']);
}

/**
 * Registers a Git object in the external KUBO storage engine.
 * Returns the object record to index locally; never throws on engine failure.
 */
export async function pushGitObject(payload: {
  repositoryId: string;
  kind: GitObjectRecord['kind'];
  sha: string;
  sizeBytes?: number;
  metadata?: Record<string, unknown>;
}): Promise<GitObjectRecord> {
  const storagePath = `${storagePrefixFor(payload.repositoryId)}/${payload.kind.toLowerCase()}/${payload.sha}`;
  const record: GitObjectRecord = {
    kind: payload.kind,
    sha: payload.sha,
    storagePath,
    sizeBytes: payload.sizeBytes ?? 0,
    engine: isStorageEngineConfigured() ? 'kubo-storage' : 'metadata-only',
    metadata: payload.metadata ?? {},
  };

  const baseUrl = process.env['KUBO_STORAGE_API_URL'];
  if (!baseUrl) return record;

  try {
    const token = process.env['KUBO_STORAGE_API_TOKEN'];
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/objects`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        repositoryId: payload.repositoryId,
        kind: payload.kind,
        sha: payload.sha,
        path: storagePath,
        metadata: record.metadata,
      }),
    });

    if (!response.ok) {
      console.error(`KUBO storage rejected object ${payload.sha} [${response.status}]`);
      return { ...record, engine: 'metadata-only' };
    }

    const parsed = (await response.json().catch(() => null)) as
      | { data?: { sizeBytes?: number; path?: string } }
      | null;

    return {
      ...record,
      sizeBytes: parsed?.data?.sizeBytes ?? record.sizeBytes,
      storagePath: parsed?.data?.path ?? record.storagePath,
    };
  } catch (error) {
    console.error('KUBO storage unreachable:', error);
    return { ...record, engine: 'metadata-only' };
  }
}
