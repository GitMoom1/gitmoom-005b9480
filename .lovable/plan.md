# Plan: Complete Organizations & Visibility System

Implement a comprehensive organization management system inspired by GitHub, including visibility controls, repository management, and settings, as requested in the user's "visual text edits" prompt (which actually contains full code and schema definitions).

## User Review Required

> [!IMPORTANT]
> This will implement a full-featured organization system. The user provided Prisma schemas and React components in the prompt, which I will adapt for the project's tech stack (TanStack Start + Supabase).

## Proposed Changes

### Database & Schema (Supabase)

- **Organizations Table**: `id`, `name`, `description`, `avatar_url`, `plan` (free, basic, pro, enterprise), `visibility` (public, internal, private), `allow_forks`, `allow_templates`, `archive_enabled`.
- **Organization Settings**: Granular visibility types for public/internal/private repos, access controls, and archiving rules.
- **Organization Members**: Link users to organizations with roles (`owner`, `admin`, `member`, `viewer`) and specific permissions.
- **Repositories Update**: Link repositories to organizations and add visibility/archiving fields.
- **RLS Policies**: Ensure members can only see/edit what their role allows.

### Server Functions (`src/lib/organizations.functions.ts`)

- `getOrganization`: Fetch org details with counts and settings.
- `getOrganizationRepos`: Fetch filtered repositories for an org.
- `updateOrganizationSettings`: Update granular org permissions.
- `createOrganization`: Gate by plan limits.
- `archiveRepository`: Toggle repository archive status (admin/owner only).

### UI Components & Routes

- **Organization Dashboard (`/orgs/$orgId`)**: Repository list with advanced filters (public, private, forks, templates, archived).
- **Organization Settings (`/orgs/$orgId/settings`)**: Comprehensive settings panel for visibility, forks, templates, and archiving.
- **Member Management**: UI to manage roles and permissions within the organization.

## Technical Details

- **Tech Stack**: TanStack Start v1, React 19, Supabase (PostgreSQL), Tailwind CSS v4.
- **Authentication**: Gated by `_authenticated` layout.
- **Authorization**: Role-based access control (RBAC) enforced via server-side logic and RLS.
- **Performance**: Optimized fetching using TanStack Query and server functions.
